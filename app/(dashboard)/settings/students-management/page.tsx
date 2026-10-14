'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Search,
  ShieldCheck,
  Users,
  Save,
  RefreshCw,
  UserRound,
  Filter,
} from 'lucide-react';

import { getStudentsCache } from '@/lib/students-cache';

type Student = {
  id: string;
  student_id: string | null;
  name: string;
  personal_id: string | null;
  grade?: string;
  class_name?: string;
};

type CachedStudent = {
  id: string;
  studentId?: string | null;
  name?: string | null;
  personalId?: string | null;
  grade?: string | null;
  className?: string | null;
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

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي');
}

function mapCachedStudent(student: CachedStudent): Student {
  return {
    id: student.id,
    student_id: student.studentId ?? null,
    name: student.name ?? '',
    personal_id: student.personalId ?? null,
    grade: student.grade ?? '',
    class_name: student.className ?? '',
  };
}

function mapApiStudent(student: Student): Student {
  return {
    id: student.id,
    student_id: student.student_id ?? null,
    name: student.name ?? '',
    personal_id: student.personal_id ?? null,
    grade: student.grade ?? '',
    class_name: student.class_name ?? '',
  };
}

export default function StudentsManagementPage() {
  const router = useRouter();

  // =========================================================
  // إعداد حذف الطلاب - مستقل تمامًا عن إدارة التواريخ
  // =========================================================

  const [allowStudentDeletion, setAllowStudentDeletion] =
    useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDeletion, setIsSavingDeletion] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] =
    useState<MessageType>('success');
  const [canManageDeletion, setCanManageDeletion] = useState(false);

  // =========================================================
  // صلاحيات إدارة التواريخ
  // =========================================================

  const [canManageDates, setCanManageDates] = useState(false);
  const [isCheckingDatePermission, setIsCheckingDatePermission] =
    useState(true);

  // =========================================================
  // البحث والكاش
  // =========================================================

  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  const [studentDates, setStudentDates] =
    useState<StudentDatesResponse | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);

  const [levels, setLevels] = useState<
    { id: string; name: string; sort_order: number }[]
  >([]);

  const [searchMessage, setSearchMessage] = useState('');

  // =========================================================
  // تعديل تاريخ الدورة
  // =========================================================

  const [selectedEnrollmentId, setSelectedEnrollmentId] =
    useState('');

  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [savingEnrollmentDate, setSavingEnrollmentDate] =
    useState(false);

  // =========================================================
  // تعديل تاريخ المعلم
  // =========================================================

  const [selectedAssignmentId, setSelectedAssignmentId] =
    useState('');

  const [assignmentDate, setAssignmentDate] = useState('');
  const [savingAssignmentDate, setSavingAssignmentDate] =
    useState(false);

  // رسائل إدارة التواريخ
  const [dateMessage, setDateMessage] = useState('');
  const [dateMessageType, setDateMessageType] =
    useState<MessageType>('success');

  const savingDate =
    savingEnrollmentDate || savingAssignmentDate;

  // =========================================================
  // قراءة الكاش الموجود دون تحميل البيانات الإضافية
  // =========================================================

  const cachedStudents = useMemo(() => {
    const cache = getStudentsCache();

    if (!cache) return null;

    return {
      students: (cache.studentList as CachedStudent[]).map(
        mapCachedStudent,
      ),
      levels: cache.academicLevels ?? [],
    };
  }, []);

  // =========================================================
  // تحميل إعداد حذف الطلاب والتحقق من صلاحية التواريخ
  // =========================================================

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

        setAllowStudentDeletion(
          Boolean(result.deletionEnabled),
        );

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
          const result = (await response
            .json()
            .catch(() => ({}))) as ApiResult;

          setCanManageDates(false);

          setDateMessage(
            result.error ||
              'ليس لديك صلاحية إدارة تواريخ الطلاب.',
          );

          setDateMessageType('error');
          return;
        }

        setCanManageDates(true);

        // استخدم الكاش الموجود إن كان محمّلًا مسبقًا.
        // لا نستدعي loadStudentsCache حتى لا نحمل تفاصيل لا نحتاجها.
        const cache = getStudentsCache();

        if (cache) {
          setStudents(
            (cache.studentList as CachedStudent[]).map(
              mapCachedStudent,
            ),
          );

          setLevels(cache.academicLevels ?? []);
        }
      } catch {
        if (!active) return;

        setCanManageDates(false);
        setDateMessage(
          'تعذر التحقق من صلاحية إدارة تواريخ الطلاب.',
        );

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

  // =========================================================
  // البحث المحلي في الكاش حسب الاسم والرقم والمستوى
  // =========================================================

  const filteredStudents = useMemo(() => {
    const query = normalizeText(search);

    return students.filter((student) => {
      const matchesQuery =
        !query ||
        normalizeText(student.name).includes(query) ||
        normalizeText(student.student_id).includes(query) ||
        normalizeText(student.personal_id).includes(query);

      const matchesLevel =
        selectedLevel === 'all' ||
        normalizeText(student.grade) ===
          normalizeText(
            levels.find((level) => level.id === selectedLevel)
              ?.name ?? selectedLevel,
          ) ||
        normalizeText(student.grade) ===
          normalizeText(selectedLevel);

      return matchesQuery && matchesLevel;
    });
  }, [students, search, selectedLevel, levels]);

  // =========================================================
  // إعداد حذف الطلاب
  // =========================================================

  async function handleDeletionSettingChange() {
    if (isSavingDeletion || isLoading || !canManageDeletion) {
      return;
    }

    const previousValue = allowStudentDeletion;
    const nextValue = !previousValue;

    setAllowStudentDeletion(nextValue);
    setIsSavingDeletion(true);
    setMessage('');

    try {
      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletionEnabled: nextValue,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'تعذر حفظ إعداد حذف الطلاب.',
        );
      }

      setAllowStudentDeletion(
        Boolean(result.deletionEnabled),
      );

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

  // =========================================================
  // البحث عن الطلاب
  // =========================================================

  async function searchStudents() {
    if (!canManageDates) {
      setSearchMessage(
        'لا تتوفر صلاحية إدارة تواريخ الطلاب.',
      );
      return;
    }

    const query = search.trim();

    if (query && query.length < 2) {
      setSearchMessage(
        'اكتب حرفين على الأقل للبحث، أو اترك البحث فارغًا لتصفية الطلاب بالمستوى.',
      );
      return;
    }

    setIsSearching(true);
    setSearchMessage('');
    setSelectedStudent(null);
    setStudentDates(null);

    setSelectedEnrollmentId('');
    setSelectedAssignmentId('');
    setEnrollmentDate('');
    setAssignmentDate('');

    try {
      // إذا كان الكاش متوفرًا، تتم التصفية محليًا.
      const cache = getStudentsCache();

      if (cache) {
        setStudents(
          (cache.studentList as CachedStudent[]).map(
            mapCachedStudent,
          ),
        );

        setLevels(cache.academicLevels ?? []);

        setSearchMessage(
          'تم تحديث قائمة الطلاب من الكاش.',
        );

        return;
      }

      // إذا لم يكن الكاش محمّلًا، استخدم API البحث الموجود.
      // لا يتم تحميل الكاش الكامل أو بيانات الحضور والدفعات.
      if (!query) {
        setSearchMessage(
          'اكتب اسم الطالب أو رقمه للبحث عند عدم توفر الكاش.',
        );
        return;
      }

      const response = await fetch(
        `${API_URL}?operation=dates&search=${encodeURIComponent(query)}`,
        { cache: 'no-store' },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'تعذر البحث عن الطلاب.',
        );
      }

      const foundStudents = (
        (result.students ?? []) as Student[]
      ).map(mapApiStudent);

      setStudents(foundStudents);

      if (foundStudents.length === 0) {
        setSearchMessage('لم يتم العثور على طالب مطابق.');
      } else {
        setSearchMessage(
          `تم العثور على ${foundStudents.length} طالب.`,
        );
      }
    } catch (error) {
      setSearchMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء البحث عن الطلاب.',
      );
    } finally {
      setIsSearching(false);
    }
  }

  // =========================================================
  // تحميل تسجيلات الطالب وتعييناته
  // =========================================================

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

      if (data.enrollments?.length > 0) {
        setSelectedEnrollmentId(data.enrollments[0].id);
        setEnrollmentDate(
          data.enrollments[0].join_date ?? '',
        );
      }

      if (data.assignments?.length > 0) {
        setSelectedAssignmentId(data.assignments[0].id);
        setAssignmentDate(
          data.assignments[0].join_date ?? '',
        );
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

  // =========================================================
  // اختيار تسجيل الدورة
  // =========================================================

  function chooseEnrollment(id: string) {
    setSelectedEnrollmentId(id);

    const enrollment = studentDates?.enrollments.find(
      (item) => item.id === id,
    );

    setEnrollmentDate(enrollment?.join_date ?? '');
    setDateMessage('');
  }

  // =========================================================
  // اختيار تعيين المعلم
  // =========================================================

  function chooseAssignment(id: string) {
    setSelectedAssignmentId(id);

    const assignment = studentDates?.assignments.find(
      (item) => item.id === id,
    );

    setAssignmentDate(assignment?.join_date ?? '');
    setDateMessage('');
  }

  // =========================================================
  // التحقق المبدئي من ترتيب التاريخين
  // =========================================================

  function validateDateOrder(
    operation:
      | 'updateEnrollmentJoinDate'
      | 'updateAssignmentJoinDate',
    joinDate: string,
  ) {
    if (!studentDates) return null;

    if (operation === 'updateEnrollmentJoinDate') {
      const currentEnrollment =
        studentDates.enrollments.find(
          (item) => item.id === selectedEnrollmentId,
        );

      const relatedAssignments =
        studentDates.assignments.filter(
          (item) =>
            item.course_id === currentEnrollment?.course_id &&
            item.join_date,
        );

      const earliestAssignmentDate = relatedAssignments
        .map((item) => item.join_date as string)
        .sort()[0];

      if (
        earliestAssignmentDate &&
        joinDate > earliestAssignmentDate
      ) {
        return (
          'تاريخ انضمام الدورة يجب أن يكون قبل أو يساوي تاريخ تعيين الطالب للمعلم.'
        );
      }
    } else {
      const currentAssignment =
        studentDates.assignments.find(
          (item) => item.id === selectedAssignmentId,
        );

      const relatedEnrollments =
        studentDates.enrollments.filter(
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

  // =========================================================
  // حفظ التاريخ
  // لكل نوع حالة تحميل وزر مستقلان
  // =========================================================

  async function saveDate(
    operation:
      | 'updateEnrollmentJoinDate'
      | 'updateAssignmentJoinDate',
  ) {
    const isEnrollment =
      operation === 'updateEnrollmentJoinDate';

    const recordId = isEnrollment
      ? selectedEnrollmentId
      : selectedAssignmentId;

    const joinDate = isEnrollment
      ? enrollmentDate
      : assignmentDate;

    if (!canManageDates) {
      setDateMessage(
        'ليس لديك صلاحية إدارة تواريخ الطلاب.',
      );
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

    const orderError = validateDateOrder(
      operation,
      joinDate,
    );

    if (orderError) {
      setDateMessage(orderError);
      setDateMessageType('error');
      return;
    }

    if (isEnrollment) {
      setSavingEnrollmentDate(true);
    } else {
      setSavingAssignmentDate(true);
    }

    setDateMessage('');

    try {
      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
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
        throw new Error(
          result.error || 'تعذر حفظ التاريخ.',
        );
      }

      const resultMessage = result.warning
        ? `تم حفظ التاريخ، لكن توجد ملاحظة: ${result.warning}`
        : result.message || 'تم حفظ التاريخ بنجاح.';

      const resultType: MessageType = result.warning
        ? 'warning'
        : 'success';

      // تحديث بيانات السجلات بعد الحفظ.
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
      if (isEnrollment) {
        setSavingEnrollmentDate(false);
      } else {
        setSavingAssignmentDate(false);
      }
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
      {/* عنوان الصفحة */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            إدارة تواريخ انضمام الطلاب وإعدادات حذفهم كلٌّ على حدة.
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

      {/* =====================================================
          القسم الأول: إدارة تواريخ الطلاب
          ===================================================== */}

      <section className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="font-semibold">
              إدارة تواريخ الانضمام
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              ابحث عن الطالب ثم عدّل تاريخ الدورة أو تاريخ تعيين المعلم.
            </p>
          </div>
        </div>

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
            {/* أدوات البحث */}
            <form
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void searchStudents();
              }}
            >
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="اسم الطالب أو رقم الطالب أو الرقم الشخصي"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pe-9 ps-3 text-sm"
                />
              </div>

              <div className="relative">
                <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <select
                  value={selectedLevel}
                  onChange={(event) =>
                    setSelectedLevel(event.target.value)
                  }
                  className="w-full rounded-lg border border-border bg-background py-2.5 pe-9 ps-3 text-sm"
                >
                  <option value="all">كل المستويات</option>

                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSearching || savingDate}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {isSearching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}

                بحث
              </button>
            </form>

            {searchMessage && (
              <p className="text-sm text-muted-foreground">
                {searchMessage}
              </p>
            )}

            {/* قائمة الطلاب */}
            {filteredStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    نتائج البحث
                  </h3>

                  <span className="text-xs text-muted-foreground">
                    {filteredStudents.length} طالب
                  </span>
                </div>

                <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      disabled={savingDate}
                      onClick={() => void loadStudent(student)}
                      className={`w-full rounded-lg border p-3 text-right transition-colors hover:bg-muted disabled:opacity-50 ${
                        selectedStudent?.id === student.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-muted p-2">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {student.name}
                          </span>

                          <span className="mt-1 block text-xs text-muted-foreground">
                            رقم الطالب: {student.student_id || '—'}
                            {' · '}
                            الرقم الشخصي: {student.personal_id || '—'}
                          </span>

                          <span className="mt-1 block text-xs text-muted-foreground">
                            المستوى: {student.grade || 'غير محدد'}
                            {' · '}
                            الفصل: {student.class_name || 'غير محدد'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isSearching &&
              (search.trim() || selectedLevel !== 'all') &&
              filteredStudents.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground" />

                  <p className="mt-2 text-sm font-medium">
                    لا توجد نتائج مطابقة
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    جرّب اسمًا آخر أو غيّر المستوى المحدد.
                  </p>
                </div>
              )}

            {/* بيانات الطالب المختار */}
            {isLoadingStudent && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                جارٍ تحميل تسجيلات الطالب وتعييناته...
              </div>
            )}

            {studentDates && !isLoadingStudent && (
              <div className="space-y-5 border-t border-border pt-5">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="font-semibold">
                    {studentDates.student.name}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    رقم الطالب: {studentDates.student.student_id || '—'}
                    {' · '}
                    الرقم الشخصي:{' '}
                    {studentDates.student.personal_id || '—'}
                  </p>
                </div>

                {/* تاريخ الدورة */}
                <section className="space-y-4 rounded-lg border border-border p-4">
                  <div>
                    <h3 className="font-semibold">
                      ١. تاريخ انضمام الطالب للدورة
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      هذا التعديل خاص بتاريخ تسجيل الطالب في الدورة فقط.
                    </p>
                  </div>

                  {studentDates.enrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد تسجيلات دورات لهذا الطالب.
                    </p>
                  ) : (
                    <>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">
                          تسجيل الدورة
                        </span>

                        <select
                          value={selectedEnrollmentId}
                          onChange={(event) =>
                            chooseEnrollment(event.target.value)
                          }
                          disabled={savingDate}
                          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
                        >
                          {studentDates.enrollments.map(
                            (item, index) => (
                              <option key={item.id} value={item.id}>
                                تسجيل {index + 1}
                                {' · '}
                                المستوى {item.level_id}
                                {' · '}
                                الحالة: {item.status}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">
                          تاريخ الانضمام للدورة
                        </span>

                        <input
                          type="date"
                          value={enrollmentDate}
                          onChange={(event) =>
                            setEnrollmentDate(event.target.value)
                          }
                          disabled={savingDate}
                          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          void saveDate('updateEnrollmentJoinDate')
                        }
                        disabled={
                          savingEnrollmentDate ||
                          savingAssignmentDate ||
                          !selectedEnrollmentId ||
                          !enrollmentDate
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {savingEnrollmentDate ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}

                        {savingEnrollmentDate
                          ? 'جارٍ حفظ تاريخ الدورة...'
                          : 'حفظ تاريخ الدورة'}
                      </button>
                    </>
                  )}
                </section>

                {/* تاريخ المعلم */}
                <section className="space-y-4 rounded-lg border border-border p-4">
                  <div>
                    <h3 className="font-semibold">
                      ٢. تاريخ انضمام الطالب للمعلم
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      هذا التعديل خاص بتاريخ تعيين الطالب للمعلم فقط.
                    </p>
                  </div>

                  {studentDates.assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد تعيينات معلمين لهذا الطالب.
                    </p>
                  ) : (
                    <>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">
                          تعيين المعلم
                        </span>

                        <select
                          value={selectedAssignmentId}
                          onChange={(event) =>
                            chooseAssignment(event.target.value)
                          }
                          disabled={savingDate}
                          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
                        >
                          {studentDates.assignments.map(
                            (item, index) => (
                              <option key={item.id} value={item.id}>
                                تعيين {index + 1}
                                {' · '}
                                المعلم: {item.teacher_id}
                                {' · '}
                                المادة: {item.subject_id}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">
                          تاريخ الانضمام للمعلم
                        </span>

                        <input
                          type="date"
                          value={assignmentDate}
                          onChange={(event) =>
                            setAssignmentDate(event.target.value)
                          }
                          disabled={savingDate}
                          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          void saveDate('updateAssignmentJoinDate')
                        }
                        disabled={
                          savingEnrollmentDate ||
                          savingAssignmentDate ||
                          !selectedAssignmentId ||
                          !assignmentDate
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {savingAssignmentDate ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}

                        {savingAssignmentDate
                          ? 'جارٍ حفظ تاريخ المعلم...'
                          : 'حفظ تاريخ المعلم'}
                      </button>
                    </>
                  )}
                </section>

                <p className="text-xs leading-6 text-muted-foreground">
                  يجب أن يكون تاريخ انضمام الدورة قبل أو مساويًا
                  لتاريخ تعيين المعلم. يتم التحقق من ذلك داخل الواجهة
                  والـ API.
                </p>
              </div>
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
          </>
        )}
      </section>

      {/* =====================================================
          القسم الثاني: إعداد حذف الطلاب - مستقل تمامًا
          ===================================================== */}

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="font-semibold">
              التحكم في حذف الطلاب
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              هذا الإعداد يتحكم في السماح بحذف الطلاب فقط، ولا يؤثر
              على إدارة تواريخ الانضمام.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">
              السماح بحذف الطلاب
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
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
          </div>

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
        </div>

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
  );
}