
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

type ApiResult = {
  error?: string;
  message?: string;
  warning?: string;
  success?: boolean;
};

type MessageType = 'success' | 'error' | 'warning';

const API_URL = '/api/admin/students';

export default function StudentsManagementPage() {
  const router = useRouter();

  // إعداد حذف الطلاب.
  const [allowStudentDeletion, setAllowStudentDeletion] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDeletion, setIsSavingDeletion] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('success');
  const [canManageDeletion, setCanManageDeletion] = useState(false);

  // صلاحية إدارة التواريخ والبحث.
  const [canManageDates, setCanManageDates] = useState(false);
  const [isCheckingDatePermission, setIsCheckingDatePermission] =
    useState(true);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    null,
  );
  const [studentDates, setStudentDates] =
    useState<StudentDatesResponse | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);

  // النوع الأول: تاريخ انضمام الطالب للدورة.
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');

  // النوع الثاني: تاريخ انضمام الطالب للمعلم.
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');

  const [savingDate, setSavingDate] = useState(false);
  const [dateMessage, setDateMessage] = useState('');
  const [dateMessageType, setDateMessageType] =
    useState<MessageType>('success');

  // تحميل إعداد حذف الطلاب والتحقق من صلاحية التواريخ.
  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch(API_URL, {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || 'تعذر تحميل إعداد حذف الطلاب.',
          );
        }

        if (!active) return;

        setAllowStudentDeletion(result.deletionEnabled);
        setCanManageDeletion(true);
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء تحميل إعداد حذف الطلاب.',
        );
        setMessageType('error');
        setCanManageDeletion(false);
      } finally {
        if (active) setIsLoading(false);
      }

      try {
        const response = await fetch(
          `${API_URL}?operation=dates&search=__permission_check__`,
          { cache: 'no-store' },
        );

        if (!active) return;

        if (!response.ok) {
          const result = (await response.json().catch(() => ({}))) as ApiResult;

          setCanManageDates(false);
          setDateMessage(
            result.error || 'ليس لديك صلاحية إدارة تواريخ الطلاب.',
          );
          setDateMessageType('error');
          return;
        }

        setCanManageDates(true);
      } catch {
        if (!active) return;

        setCanManageDates(false);
        setDateMessage('تعذر التحقق من صلاحية إدارة تواريخ الطلاب.');
        setDateMessageType('error');
      } finally {
        if (active) setIsCheckingDatePermission(false);
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  // تغيير إعداد حذف الطلاب مع التراجع عند الفشل.
  async function handleDeletionSettingChange() {
    if (isSavingDeletion || isLoading || !canManageDeletion) return;

    const previousValue = allowStudentDeletion;
    const nextValue = !previousValue;

    setAllowStudentDeletion(nextValue);
    setIsSavingDeletion(true);
    setMessage('');

    try {
      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletionEnabled: nextValue }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'تعذر حفظ إعداد حذف الطلاب.',
        );
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
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء حفظ إعداد حذف الطلاب.',
      );
      setMessageType('error');
    } finally {
      setIsSavingDeletion(false);
    }
  }

  // البحث عن الطلاب باستخدام API.
  async function searchStudents() {
    if (!canManageDates) {
      setDateMessage(
        'لا تتوفر صلاحية إدارة تواريخ الطلاب أو تعذر التحقق منها.',
      );
      setDateMessageType('error');
      return;
    }

    const query = search.trim();

    if (query.length < 2) {
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
    setEnrollmentDate('');
    setAssignmentDate('');

    try {
      const response = await fetch(
        `${API_URL}?operation=dates&search=${encodeURIComponent(query)}`,
        { cache: 'no-store' },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'تعذر البحث عن الطلاب.');
      }

      const foundStudents = (result.students ?? []) as Student[];
      setStudents(foundStudents);

      if (foundStudents.length === 0) {
        setDateMessage('لم يتم العثور على طالب مطابق.');
        setDateMessageType('warning');
      }
    } catch (error) {
      setDateMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء البحث عن الطلاب.',
      );
      setDateMessageType('error');
    } finally {
      setIsSearching(false);
    }
  }

  // تحميل تسجيلات الطالب وتعييناته.
  // لا نمسح رسائل الحفظ هنا؛ لأن الدالة تستدعى بعد نجاح الحفظ أيضًا.
  async function loadStudent(student: Student) {
    setSelectedStudent(student);
    setStudentDates(null);
    setSelectedEnrollmentId('');
    setSelectedAssignmentId('');
    setEnrollmentDate('');
    setAssignmentDate('');
    setIsLoadingStudent(true);

    try {
      const response = await fetch(
        `${API_URL}?operation=dates&studentId=${encodeURIComponent(student.id)}`,
        { cache: 'no-store' },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'تعذر تحميل تسجيلات الطالب.',
        );
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
        error instanceof Error
          ? error.message
          : 'تعذر تحميل بيانات الطالب.',
      );
      setDateMessageType('error');
    } finally {
      setIsLoadingStudent(false);
    }
  }

  // اختيار تسجيل الدورة يعرض تاريخ التسجيل نفسه.
  function chooseEnrollment(id: string) {
    setSelectedEnrollmentId(id);

    const enrollment = studentDates?.enrollments.find(
      (item) => item.id === id,
    );

    setEnrollmentDate(enrollment?.join_date ?? '');
  }

  // اختيار تعيين المعلم يعرض تاريخ التعيين نفسه.
  function chooseAssignment(id: string) {
    setSelectedAssignmentId(id);

    const assignment = studentDates?.assignments.find(
      (item) => item.id === id,
    );

    setAssignmentDate(assignment?.join_date ?? '');
  }

  // تحقق مبدئي في الواجهة؛ والتحقق النهائي يتم داخل API.
  function validateDateOrder(
    operation: 'updateEnrollmentJoinDate' | 'updateAssignmentJoinDate',
    joinDate: string,
  ) {
    if (!studentDates) return null;

    if (operation === 'updateEnrollmentJoinDate') {
      const relatedAssignments = studentDates.assignments.filter(
        (item) =>
          item.course_id ===
          studentDates.enrollments.find(
            (enrollment) => enrollment.id === selectedEnrollmentId,
          )?.course_id &&
          item.join_date,
      );

      const earliestAssignmentDate = relatedAssignments
        .map((item) => item.join_date as string)
        .sort()[0];

      if (earliestAssignmentDate && joinDate > earliestAssignmentDate) {
        return (
          'تاريخ انضمام الدورة يجب أن يكون قبل أو يساوي تاريخ تعيين الطالب للمعلم.'
        );
      }
    } else {
      const currentAssignment = studentDates.assignments.find(
        (item) => item.id === selectedAssignmentId,
      );

      const relatedEnrollments = studentDates.enrollments.filter(
        (item) =>
          item.course_id === currentAssignment?.course_id &&
          item.join_date,
      );

      const invalidEnrollment = relatedEnrollments.some(
        (item) => (item.join_date as string) > joinDate,
      );

      if (invalidEnrollment) {
        return (
          'تاريخ تعيين الطالب للمعلم يجب أن يكون بعد أو يساوي تاريخ انضمامه للدورة.'
        );
      }
    }

    return null;
  }

  // حفظ أي من التاريخين.
  async function saveDate(
    operation: 'updateEnrollmentJoinDate' | 'updateAssignmentJoinDate',
  ) {
    const isEnrollment = operation === 'updateEnrollmentJoinDate';

    const recordId = isEnrollment
      ? selectedEnrollmentId
      : selectedAssignmentId;

    const joinDate = isEnrollment ? enrollmentDate : assignmentDate;

    if (!canManageDates) {
      setDateMessage('ليس لديك صلاحية إدارة تواريخ الطلاب.');
      setDateMessageType('error');
      return;
    }

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

    const orderError = validateDateOrder(operation, joinDate);

    if (orderError) {
      setDateMessage(orderError);
      setDateMessageType('error');
      return;
    }

    setSavingDate(true);
    setDateMessage('');

    try {
      const response = await fetch(API_URL, {
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

      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        throw new Error(result.error || 'تعذر حفظ التاريخ.');
      }

      const resultMessage = result.warning
        ? `تم حفظ التاريخ، لكن توجد ملاحظة: ${result.warning}`
        : result.message || 'تم حفظ التاريخ بنجاح.';

      const resultType: MessageType = result.warning
        ? 'warning'
        : 'success';

      // نعيد تحميل البيانات أولًا، ثم نعرض الرسالة حتى لا تختفي.
      if (selectedStudent) {
        await loadStudent(selectedStudent);
      }

      setDateMessage(resultMessage);
      setDateMessageType(resultType);
    } catch (error) {
      setDateMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء حفظ التاريخ.',
      );
      setDateMessageType('error');
    } finally {
      setSavingDate(false);
    }
  }

  const dateMessageClass =
    dateMessageType === 'error'
      ? 'text-destructive'
      : dateMessageType === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-primary';

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            إدارة تواريخ انضمام الطلاب والتحكم في صلاحية حذفهم من النظام.
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
        {/* إدارة تاريخَي الانضمام */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">تعديل تواريخ الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            اختر الطالب، ثم عدّل تاريخ انضمامه للدورة أو تاريخ تعيينه للمعلم.
          </p>

          {isCheckingDatePermission ? (
            <p className="text-sm text-muted-foreground">
              جارٍ التحقق من صلاحية إدارة التواريخ...
            </p>
          ) : !canManageDates ? (
            <p className="text-sm text-destructive">
              لا تتوفر صلاحية إدارة تواريخ الطلاب أو تعذر التحقق منها.
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
                    placeholder="اسم الطالب أو رقمه الشخصي أو رقم الطالب"
                    className="w-full rounded-lg border border-border bg-background py-2 pe-9 ps-3 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching || savingDate}
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
                      disabled={savingDate}
                      onClick={() => void loadStudent(student)}
                      className={`w-full rounded-md p-3 text-right transition-colors hover:bg-muted disabled:opacity-50 ${
                        selectedStudent?.id === student.id ? 'bg-muted' : ''
                      }`}
                    >
                      <span className="block text-sm font-medium">
                        {student.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        رقم الطالب: {student.student_id || '—'} · الرقم الشخصي:{' '}
                        {student.personal_id || '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {isLoadingStudent && (
                <p className="text-sm text-muted-foreground">
                  جارٍ تحميل بيانات الطالب...
                </p>
              )}

              {studentDates && !isLoadingStudent && (
                <div className="space-y-5 border-t border-border pt-4">
                  <div>
                    <p className="font-semibold">
                      {studentDates.student.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      اختر السجل الصحيح إذا كان للطالب أكثر من تسجيل أو تعيين.
                    </p>
                  </div>

                  {/* النوع الأول: تاريخ انضمام الدورة */}
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold">
                      ١. تاريخ انضمام الطالب للدورة
                    </h3>

                    {studentDates.enrollments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        لا توجد تسجيلات دورات لهذا الطالب.
                      </p>
                    ) : (
                      <>
                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">
                            تسجيل الدورة
                          </span>
                          <select
                            value={selectedEnrollmentId}
                            onChange={(event) =>
                              chooseEnrollment(event.target.value)
                            }
                            disabled={savingDate}
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          >
                            {studentDates.enrollments.map((item, index) => (
                              <option key={item.id} value={item.id}>
                                تسجيل {index + 1} — المستوى {item.level_id} —
                                الحالة: {item.status}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">
                            تاريخ الانضمام للدورة
                          </span>
                          <input
                            type="date"
                            value={enrollmentDate}
                            onChange={(event) =>
                              setEnrollmentDate(event.target.value)
                            }
                            disabled={savingDate}
                            required
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          />
                        </label>

                        <p className="text-xs text-muted-foreground">
                          هذا الحقل يحدّث{' '}
                          <code>enrollments.join_date</code>.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            void saveDate('updateEnrollmentJoinDate')
                          }
                          disabled={savingDate || !selectedEnrollmentId}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {savingDate ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          حفظ تاريخ الدورة
                        </button>
                      </>
                    )}
                  </div>

                  {/* النوع الثاني: تاريخ تعيين المعلم */}
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold">
                      ٢. تاريخ انضمام الطالب للمعلم
                    </h3>

                    {studentDates.assignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        لا توجد تعيينات معلمين لهذا الطالب.
                      </p>
                    ) : (
                      <>
                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">
                            تعيين المعلم
                          </span>
                          <select
                            value={selectedAssignmentId}
                            onChange={(event) =>
                              chooseAssignment(event.target.value)
                            }
                            disabled={savingDate}
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          >
                            {studentDates.assignments.map((item, index) => (
                              <option key={item.id} value={item.id}>
                                تعيين {index + 1} — المعلم {item.teacher_id} —
                                المادة {item.subject_id}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">
                            تاريخ الانضمام للمعلم
                          </span>
                          <input
                            type="date"
                            value={assignmentDate}
                            onChange={(event) =>
                              setAssignmentDate(event.target.value)
                            }
                            disabled={savingDate}
                            required
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          />
                        </label>

                        <p className="text-xs text-muted-foreground">
                          هذا الحقل يحدّث{' '}
                          <code>teacher_student_assignments.join_date</code>.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            void saveDate('updateAssignmentJoinDate')
                          }
                          disabled={savingDate || !selectedAssignmentId}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {savingDate ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          حفظ تاريخ المعلم
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-xs leading-6 text-muted-foreground">
                    قاعدة التواريخ: تاريخ انضمام الدورة يجب أن يكون قبل أو
                    مساويًا لتاريخ تعيين المعلم. يتحقق الـ API من القاعدة
                    قبل الحفظ أيضًا، حتى لو تجاوز المستخدم تحقق الواجهة.
                  </p>
                </div>
              )}
            </>
          )}

          {dateMessage && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm leading-6 ${dateMessageClass}`}
            >
              {dateMessage}
            </p>
          )}
        </section>

        {/* إعداد حذف الطلاب: الإبقاء على السلوك السابق */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">التحكم في حذف الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            تحديد ما إذا كان مسموحًا بحذف الطلاب من النظام.
          </p>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              السماح بحذف الطلاب
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={allowStudentDeletion}
              aria-label="السماح بحذف الطلاب"
              disabled={
                isLoading ||
                isSavingDeletion ||
                !canManageDeletion
              }
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
              : isSavingDeletion
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
              aria-live="polite"
              className={`text-sm ${
                messageType === 'error'
                  ? 'text-destructive'
                  : messageType === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-primary'
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
          استخدم البحث أعلاه للوصول إلى الطالب وتعديل أحد تاريخَي الانضمام.
        </p>
      </section>
    </div>
  );
}
