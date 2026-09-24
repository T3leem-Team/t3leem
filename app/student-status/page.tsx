create or replace function public.get_student_status_by_personal_id(
  p_personal_id text
)
returns json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_personal_id text;
  v_current_year_id uuid;
  result json;
begin
  /*
   * تنظيف الرقم الشخصي
   */
  v_personal_id := trim(p_personal_id);

  /*
   * حماية أولية:
   * الرقم الشخصي يجب أن يكون أرقام فقط
   * وبطول 9 أرقام.
   */
  if v_personal_id is null
     or v_personal_id = ''
     or v_personal_id !~ '^[0-9]{9}$'
  then
    return json_build_object(
      'student', null,
      'academicYear', null,
      'level', null,
      'courses', '[]'::json,
      'attendanceStatuses', '[]'::json,
      'attendance', '[]'::json
    );
  end if;

  /*
   * السنة الأكاديمية الحالية
   */
  select ay.id
  into v_current_year_id
  from public.academic_years ay
  where ay.is_current = true
    and ay.is_active = true
  order by ay.id
  limit 1;

  /*
   * بيانات الطالب العامة فقط
   *
   * لا نرجع:
   * notes
   * health_notes
   * created_by
   * created_at
   * updated_at
   * fee_exempt
   */
  select json_build_object(
    'student',
    json_build_object(
      'id', s.id,
      'student_id', s.student_id,
      'name', s.name,
      'personal_id', s.personal_id,
      'phone', s.phone,
      'whatsapp', s.whatsapp,
      'status', s.status
    ),

    /*
     * السنة الحالية
     */
    'academicYear',
    (
      select json_build_object(
        'id', ay.id,
        'name', ay.name,
        'is_active', ay.is_active,
        'is_current', ay.is_current
      )
      from public.academic_years ay
      where ay.id = v_current_year_id
      limit 1
    ),

    /*
     * مستوى الطالب في السنة الحالية
     */
    'level',
    (
      select json_build_object(
        'id', l.id,
        'name', l.name
      )
      from public.enrollments e
      join public.levels l
        on l.id = e.level_id
      where e.student_id = s.id
        and e.academic_year_id = v_current_year_id
      order by e.id desc
      limit 1
    ),

    /*
     * الدورات التي الطالب مرتبط بها فعليًا
     */
    'courses',
    coalesce(
      (
        select json_agg(
          json_build_object(
            'id', c.id,
            'academic_year_id', c.academic_year_id,
            'name', c.name,
            'start_date', c.start_date,
            'end_date', c.end_date,
            'days', c.days
          )
          order by c.start_date desc nulls last
        )
        from public.teacher_student_assignments tsa
        join public.courses c
          on c.id = tsa.course_id
        where tsa.student_id = s.id
      ),
      '[]'::json
    ),

    /*
     * حالات الحضور الفعالة فقط
     */
    'attendanceStatuses',
    coalesce(
      (
        select json_agg(
          json_build_object(
            'id', ats.id,
            'name', ats.name,
            'sort_order', ats.sort_order
          )
          order by ats.sort_order
        )
        from public.attendance_statuses ats
        where ats.is_active = true
      ),
      '[]'::json
    ),

    /*
     * سجلات حضور الطالب فقط
     *
     * لا نرجع created_at
     * ولا enrollment_id
     */
    'attendance',
    coalesce(
      (
        select json_agg(
          json_build_object(
            'id', a.id,
            'student_id', a.student_id,
            'course_id', a.course_id,
            'attendance_date', a.attendance_date,
            'status_id', a.status_id,
            'note', coalesce(a.note, '')
          )
          order by a.attendance_date desc
        )
        from public.attendance a
        where a.student_id = s.id
      ),
      '[]'::json
    )
  )
  into result
  from public.students s
  where s.personal_id = v_personal_id
  limit 1;

  /*
   * إذا لم يوجد الطالب
   */
  return coalesce(
    result,
    json_build_object(
      'student', null,
      'academicYear', null,
      'level', null,
      'courses', '[]'::json,
      'attendanceStatuses', '[]'::json,
      'attendance', '[]'::json
    )
  );
end;
$$;


/*
 * إلغاء أي صلاحيات سابقة
 */
revoke all
on function public.get_student_status_by_personal_id(text)
from public;


/*
 * السماح للصفحة العامة باستدعاء الـ RPC فقط
 */
grant execute
on function public.get_student_status_by_personal_id(text)
to anon;


/*
 * السماح للمستخدمين المسجلين أيضًا
 */
grant execute
on function public.get_student_status_by_personal_id(text)
to authenticated;