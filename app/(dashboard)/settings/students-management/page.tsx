
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Search,
  ShieldCheck,
  Users,
  Save,
  RefreshCw,
} from 'lucide-react';

type Student = {
  id: string;
  student_id: string | null;
  name: string;
  personal_id: string | null;
};

type Enrollment = {
  id: string;
  join_date: string | null;
  course_id: string | null;
  academic_year_id: string;
  level_id: string;
  status: string;
};

type Assignment = {
  id: string;
  join_date: string | null;
  course_id: string;
  teacher_id: string;
  subject_id: string;
};

type StudentDatesResponse = {
  student: Student;
  enrollments: Enrollment[];
  assignments: Assignment[];
};

export default function StudentsManagementPage() {
  const router = useRouter();

  const [allowStudentDeletion, setAllowStudentDeletion] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [canManageDeletion, setCanManageDeletion] = useState(false);

  const [canManageDates, setCanManageDates] = useState(false);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDates, setStudentDates] = useState<StudentDatesResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [dateMessage, setDateMessage] = useState('');
  const [dateMessageType, setDateMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch('/api/admin/students', {
          method: 'GET',
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'تعذر تحميل إعداد حذف الطلاب.');
        }

        if (!active) return;

        setAllowStudentDeletion(result.deletionEnabled);
        setCanManageDeletion(true);
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error ? error.message : 'حدث خطأ أثناء تحميل الإعداد.',
        );
        setMessageType('error');
      } finally {
        if (active) setIsLoading(false);
      }

      // التحقق من صلاحية التواريخ عبر API مستقل منطقيًا.
      try {
        const response = await fetch(
          '/api/admin/students?operation=dates&search=__permission_check__',
          { cache: 'no-store' },
        );

        if (active && response.ok) {
          setCanManageDates(true);
        }
      } catch {
        // ستظهر رسالة الصلاحية عند استخدام قسم التواريخ.
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  async function handleDeletionSettingChange() {
    if (isSaving || isLoading || !canManageDeletion) return;

    const previousValue = allowStudentDeletion;
    const nextValue = !previousValue;

    setAllowStudentDeletion(nextValue);
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletionEnabled: nextValue }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'تعذر حفظ إعداد حذف الطلاب.');
      }

      setAllowStudentDeletion(result.deletionEnabled);
      setMessage(
        result.deletionEnabled
          ? 'تم تفعيل السماح بحذف الطلاب.'
          : 'تم تعطيل حذف الطلاب بنجاح.',
      );
      setMessageType('success');
    } catch (error) {
      setAllowStudentDeletion(previousValue);
      setMessage(
        error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الإعداد.',
      );
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  }

  async function searchStudents() {
    if (!canManageDates) {
      setDateMessage('لا تتوفر صلاحية إدارة تواريخ الطلاب أو تعذر التحقق منها.');
      setDateMessageType('error');
      return;
    }

    if (search.trim().length < 2) {
      setDateMessage('اكتب حرفين على الأقل للبحث عن الطالب.');
      setDateMessageType('error');
      return;
    }

    setIsSearching(true);
    setDateMessage('');
    setStudents([]);
    setSelectedStudent(null);
    setStudentDates(null);
    setSelectedEnrollmentId('');
    setSelectedAssignmentId('');

    try {
      const response = await fetch(
        `/api/admin/students?operation=dates&search=${encodeURIComponent(search.trim())}`,
        { cache: 'no-store' },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'تعذر البحث عن الطلاب.');
      }

      setStudents(result.students ?? []);

      if ((result.students ?? []).length === 0) {
        setDateMessage('لم يتم العثور على طالب مطابق.');
        setDateMessageType('error');
      }
    } catch (error) {
      setDateMessage(
        error instanceof Error ? error.message : 'حدث خطأ أثناء البحث.',
      );
      setDateMessageType('error');
    } finally {
      setIsSearching(false);
    }
  }

  async function loadStudent(student: Student) {
    setSelectedStudent(student);
    setStudentDates(null);
    setSelectedEnrollmentId('');
    setSelectedAssignmentId('');
    setEnrollmentDate('');
    setAssignmentDate('');
    setDateMessage('');
    setIsLoadingStudent(true);

    try {
      const response = await fetch(
        `/api/admin/students?operation=dates&studentId=${encodeURIComponent(student.id)}`,
        { cache: 'no-store' },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'تعذر تحميل تسجيلات الطالب.');
      }

      const data = result as StudentDatesResponse;
      setStudentDates(data);

      if (data.enrollments.length > 0) {
        setSelectedEnrollmentId(data.enrollments[0].id);
        setEnrollmentDate(data.enrollments[0].join_date ?? '');
      }

      if (data.assignments.length > 0) {
        setSelectedAssignmentId(data.assignments[0].id);
        setAssignmentDate(data.assignments[0].join_date ?? '');
      }
    } catch (error) {
      setDateMessage(
        error instanceof Error ? error.message : 'تعذر تحميل بيانات الطالب.',
      );
      setDateMessageType('error');
    } finally {
      setIsLoadingStudent(false);
    }
  }

  function chooseEnrollment(id: string) {
    setSelectedEnrollmentId(id);
    const enrollment = studentDates?.enrollments.find((item) => item.id === id);
    setEnrollmentDate(enrollment?.join_date ?? '');
  }

  function chooseAssignment(id: string) {
    setSelectedAssignmentId(id);
    const assignment = studentDates?.assignments.find((item) => item.id === id);
    setAssignmentDate(assignment?.join_date ?? '');
  }

  async function saveDate(
    operation: 'updateEnrollmentJoinDate' | 'updateAssignmentJoinDate',
  ) {
    const isEnrollment = operation === 'updateEnrollmentJoinDate';
    const recordId = isEnrollment ? selectedEnrollmentId : selectedAssignmentId;
    const joinDate = isEnrollment ? enrollmentDate : assignmentDate;

    if (!recordId) {
      setDateMessage(
        isEnrollment
          ? 'اختر تسجيل الدورة أولًا.'
          : 'اختر تعيين المعلم أولًا.',
      );
      setDateMessageType('error');
      return;
    }

    if (!joinDate) {
      setDateMessage('اختر التاريخ المطلوب حفظه.');
      setDateMessageType('error');
      return;
    }

    setIsSaving(true);
    setDateMessage('');

    try {
      const response = await fetch('/api/admin/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEnrollment
            ? {
                operation,
                enrollmentId: recordId,
                joinDate,
              }
            : {
                operation,
                assignmentId: recordId,
                joinDate,
              },
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'تعذر حفظ التاريخ.');
      }

      setDateMessage(
        result.warning
          ? `تم حفظ التاريخ، لكن توجد ملاحظة: ${result.warning}`
          : result.message || 'تم حفظ التاريخ بنجاح.',
      );
      setDateMessageType(result.warning ? 'error' : 'success');

      if (selectedStudent) {
        await loadStudent(selectedStudent);
      }
    } catch (error) {
      setDateMessage(
        error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ التاريخ.',
      );
      setDateMessageType('error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            إدارة تواريخ الطلاب والتحكم في صلاحية حذفهم من النظام.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <ArrowRight className="h-4 w-4" />
          عودة
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">تعديل تواريخ الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            ابحث عن الطالب، ثم اختر تسجيل الدورة أو تعيين المعلم لتعديل التاريخ المطلوب.
          </p>

          {!canManageDates ? (
            <p className="text-sm text-muted-foreground">
              جارٍ التحقق من صلاحية إدارة التواريخ...
            </p>
          ) : (
            <>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void searchStudents();
                }}
              >
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="اسم الطالب أو رقمه الشخصي"
                    className="w-full rounded-lg border border-border bg-background py-2 pe-9 ps-3 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {isSearching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  بحث
                </button>
              </form>

              {students.length > 0 && (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => void loadStudent(student)}
                      className={`w-full rounded-md p-3 text-right transition-colors hover:bg-muted ${
                        selectedStudent?.id === student.id ? 'bg-muted' : ''
                      }`}
                    >
                      <span className="block text-sm font-medium">{student.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {student.personal_id || student.student_id || 'بدون رقم'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {isLoadingStudent && (
                <p className="text-sm text-muted-foreground">جارٍ تحميل بيانات الطالب...</p>
              )}

              {studentDates && !isLoadingStudent && (
                <div className="space-y-5 border-t border-border pt-4">
                  <div>
                    <p className="font-semibold">{studentDates.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      اختر السجل الصحيح إذا كان للطالب أكثر من تسجيل أو تعيين.
                    </p>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold">تاريخ انضمام الطالب للدورة</h3>

                    {studentDates.enrollments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        لا توجد تسجيلات دورات لهذا الطالب.
                      </p>
                    ) : (
                      <>
                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">التسجيل</span>
                          <select
                            value={selectedEnrollmentId}
                            onChange={(event) => chooseEnrollment(event.target.value)}
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          >
                            {studentDates.enrollments.map((item, index) => (
                              <option key={item.id} value={item.id}>
                                تسجيل {index + 1} — المستوى {item.level_id} — {item.status}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">تاريخ الانضمام</span>
                          <input
                            type="date"
                            value={enrollmentDate}
                            onChange={(event) => setEnrollmentDate(event.target.value)}
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => void saveDate('updateEnrollmentJoinDate')}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          حفظ تاريخ الدورة
                        </button>
                      </>
                    )}
                  </div>

                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold">تاريخ انضمام الطالب للمعلم</h3>

                    {studentDates.assignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        لا توجد تعيينات معلمين لهذا الطالب.
                      </p>
                    ) : (
                      <>
                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">التعيين</span>
                          <select
                            value={selectedAssignmentId}
                            onChange={(event) => chooseAssignment(event.target.value)}
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          >
                            {studentDates.assignments.map((item, index) => (
                              <option key={item.id} value={item.id}>
                                تعيين {index + 1} — المعلم {item.teacher_id} — المادة {item.subject_id}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">تاريخ الانضمام للمعلم</span>
                          <input
                            type="date"
                            value={assignmentDate}
                            onChange={(event) => setAssignmentDate(event.target.value)}
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => void saveDate('updateAssignmentJoinDate')}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          حفظ تاريخ المعلم
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {dateMessage && (
            <p
              role="status"
              className={`text-sm ${
                dateMessageType === 'error' ? 'text-destructive' : 'text-primary'
              }`}
            >
              {dateMessage}
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">التحكم في حذف الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            تحديد ما إذا كان مسموحًا بحذف الطلاب من النظام.
          </p>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">السماح بحذف الطلاب</span>
            <button
              type="button"
              role="switch"
              aria-checked={allowStudentDeletion}
              aria-label="السماح بحذف الطلاب"
              disabled={isLoading || isSaving || !canManageDeletion}
              onClick={handleDeletionSettingChange}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                allowStudentDeletion ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  allowStudentDeletion ? 'left-0.5' : 'left-5'
                }`}
              />
            </button>
          </label>

          <p className="text-xs text-muted-foreground">
            {isLoading
              ? 'جارٍ تحميل الإعداد...'
              : isSaving
                ? 'جارٍ حفظ التغيير...'
                : !canManageDeletion
                  ? 'تعذر تحميل الإعداد أو ليست لديك صلاحية إدارته.'
                  : allowStudentDeletion
                    ? 'حذف الطلاب مفعّل.'
                    : 'حذف الطلاب معطّل.'}
          </p>

          {message && (
            <p
              role="status"
              className={`text-sm ${
                messageType === 'error' ? 'text-destructive' : 'text-primary'
              }`}
            >
              {message}
            </p>
          )}
        </section>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">قائمة الطلاب</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          استخدم البحث أعلاه للوصول إلى الطالب وتعديل تواريخه.
        </p>
      </section>
    </div>
  );
}
