'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  getTeachersCache,
  loadTeachersCache,
} from '@/lib/teachers-cache';

type Student = {
  id: string;
  student_id: string | null;
  name: string;
  personal_id: string | null;
  grade?: string;
  class_name?: string;
  level_ids?: string[];
  level_names?: string[];
};

type CachedStudent = {
  id: string;
  studentId?: string | null;
  name?: string | null;
  personalId?: string | null;
  grade?: string | null;
  className?: string | null;
  levelId?: string | null;
  levelName?: string | null;
};

type Level = {
  id: string;
  name: string;
  sort_order: number;
};

type Teacher = {
  id: string;
  name: string;
  isActive: boolean;
};

type TeacherAssignment = {
  teacherId: string;
  studentId: string;
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
type FilterMode = '' | 'level' | 'teacher';

const API_URL = '/api/admin/students';

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي');
}

function mapCachedStudent(student: CachedStudent): Student {
  const levelNames = [
    student.levelName,
    student.grade,
  ].filter((value): value is string => Boolean(value));

  return {
    id: student.id,
    student_id: student.studentId ?? null,
    name: student.name ?? '',
    personal_id: student.personalId ?? null,
    grade: student.levelName ?? student.grade ?? '',
    class_name: student.className ?? '',
    level_ids: student.levelId ? [student.levelId] : [],
    level_names: levelNames,
  };
}

function mergeStudents(
  studentCacheRows: CachedStudent[],
  teacherCacheRows: CachedStudent[],
): Student[] {
  const merged = new Map<string, Student>();

  for (const raw of [...studentCacheRows, ...teacherCacheRows]) {
    if (!raw?.id) continue;

    const student = mapCachedStudent(raw);
    const previous = merged.get(student.id);

    if (!previous) {
      merged.set(student.id, student);
      continue;
    }

    merged.set(student.id, {
      ...previous,
      student_id: previous.student_id || student.student_id,
      name: previous.name || student.name,
      personal_id: previous.personal_id || student.personal_id,
      grade: previous.grade || student.grade,
      class_name: previous.class_name || student.class_name,
      level_ids: Array.from(
        new Set([
          ...(previous.level_ids ?? []),
          ...(student.level_ids ?? []),
        ]),
      ),
      level_names: Array.from(
        new Set([
          ...(previous.level_names ?? []),
          ...(student.level_names ?? []),
        ]),
      ),
    });
  }

  return Array.from(merged.values());
}

function mergeLevels(...collections: Level[][]): Level[] {
  const merged = new Map<string, Level>();

  for (const levels of collections) {
    for (const level of levels) {
      if (!level?.id || !level?.name) continue;
      merged.set(level.id, level);
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => a.sort_order - b.sort_order,
  );
}

export default function StudentsManagementPage() {
  const router = useRouter();

  // إعداد حذف الطلاب
  const [allowStudentDeletion, setAllowStudentDeletion] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDeletion, setIsSavingDeletion] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] =
    useState<MessageType>('success');
  const [canManageDeletion, setCanManageDeletion] = useState(false);

  // صلاحية إدارة التواريخ
  const [canManageDates, setCanManageDates] = useState(false);
  const [isCheckingDatePermission, setIsCheckingDatePermission] =
    useState(true);

  // عرض إدارة التواريخ والفلاتر
  const [showDateManagement, setShowDateManagement] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('');
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherAssignments, setTeacherAssignments] =
    useState<TeacherAssignment[]>([]);

  const [cacheAvailable, setCacheAvailable] = useState(false);
  const [teacherCacheAvailable, setTeacherCacheAvailable] =
    useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // تفاصيل الطالب
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);
  const [studentDates, setStudentDates] =
    useState<StudentDatesResponse | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);

  // تاريخ الانضمام للدورة
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [savingEnrollmentDate, setSavingEnrollmentDate] =
    useState(false);

  // تاريخ تعيين المعلم
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [savingAssignmentDate, setSavingAssignmentDate] =
    useState(false);

  const [dateMessage, setDateMessage] = useState('');
  const [dateMessageType, setDateMessageType] =
    useState<MessageType>('success');

  const savingDate = savingEnrollmentDate || savingAssignmentDate;

  // قراءة الكاش المتوفر ودمج بيانات الطلاب والمعلمين.
  const refreshCachedData = useCallback(() => {
    const studentCache = getStudentsCache();
    const teacherCache = getTeachersCache();

    const studentRows = (
      studentCache?.studentList ?? []
    ) as CachedStudent[];

    const teacherStudentRows = (
      teacherCache?.students ?? []
    ) as unknown as CachedStudent[];

    const mergedStudents = mergeStudents(
      studentRows,
      teacherStudentRows,
    );

    const cachedLevels = mergeLevels(
      (studentCache?.academicLevels ?? []) as Level[],
      (teacherCache?.academicLevels ?? []) as Level[],
    );

    const cachedTeachers = (
      teacherCache?.teachers ?? []
    ) as Teacher[];

    const cachedAssignments: TeacherAssignment[] = (
      teacherCache?.assignments ?? []
    ).map((assignment) => ({
      teacherId: assignment.teacherId,
      studentId: assignment.studentId,
    }));

    setStudents(mergedStudents);
    setLevels(cachedLevels);
    setTeachers(cachedTeachers);
    setTeacherAssignments(cachedAssignments);

    setCacheAvailable(mergedStudents.length > 0);
    setTeacherCacheAvailable(
      cachedTeachers.length > 0 && cachedAssignments.length > 0,
    );

    return {
      hasStudents: mergedStudents.length > 0,
      hasTeachers: cachedTeachers.length > 0,
      hasAssignments: cachedAssignments.length > 0,
    };
  }, []);

  // تحميل إعداد حذف الطلاب والتحقق من صلاحية إدارة التواريخ.
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

        setAllowStudentDeletion(Boolean(result.deletionEnabled));
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
            result.error || 'ليس لديك صلاحية إدارة تواريخ الطلاب.',
          );
          setDateMessageType('error');
          return;
        }

        setCanManageDates(true);
        refreshCachedData();
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
  }, [refreshCachedData]);

  // تصفية الطلاب مباشرة حسب البحث والمستوى أو المعلم المختار.
  const filteredStudents = useMemo(() => {
    const query = normalizeText(search);

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        normalizeText(student.name).includes(query) ||
        normalizeText(student.student_id).includes(query) ||
        normalizeText(student.personal_id).includes(query);

      if (!matchesSearch) return false;

      if (filterMode === 'level') {
        if (!selectedLevel) return false;

        const selectedLevelName = levels.find(
          (level) => level.id === selectedLevel,
        )?.name;

        const matchesLevelId =
          student.level_ids?.includes(selectedLevel) ?? false;

        const matchesLevelName =
          Boolean(selectedLevelName) &&
          (student.level_names ?? []).some(
            (name) =>
              normalizeText(name) === normalizeText(selectedLevelName),
          );

        return matchesLevelId || matchesLevelName;
      }

      if (filterMode === 'teacher') {
        if (!selectedTeacher) return false;

        return teacherAssignments.some(
          (assignment) =>
            assignment.teacherId === selectedTeacher &&
            assignment.studentId === student.id,
        );
      }

      return false;
    });
  }, [
    students,
    search,
    filterMode,
    selectedLevel,
    selectedTeacher,
    levels,
    teacherAssignments,
  ]);

  function resetSelectedStudent() {
    setSelectedStudent(null);
    setStudentDates(null);
    setSelectedEnrollmentId('');
    setSelectedAssignmentId('');
    setEnrollmentDate('');
    setAssignmentDate('');
    setDateMessage('');
  }

  // تغيير طريقة التصفية، وتحميل كاش المعلمين عند الحاجة.
  async function handleFilterModeChange(mode: FilterMode) {
    setFilterMode(mode);
    setSelectedLevel('');
    setSelectedTeacher('');
    setSearch('');
    setSearchMessage('');
    resetSelectedStudent();

    if (!mode) return;

    setIsSearching(true);

    try {
      if (mode === 'teacher') {
        let teacherCache = getTeachersCache();

        if (!teacherCache?.teachers?.length) {
          await loadTeachersCache();
          teacherCache = getTeachersCache();
        }

        refreshCachedData();

        if (!teacherCache?.teachers?.length) {
          setSearchMessage(
            'تعذر تحميل قائمة المعلمين. حاول تحديث البيانات.',
          );
          return;
        }

        if (!teacherCache.assignments?.length) {
          setSearchMessage(
            'قائمة المعلمين متوفرة، لكن لا توجد بيانات تعيينات متاحة للفلترة.',
          );
        }
      } else {
        refreshCachedData();
      }
    } catch (error) {
      setSearchMessage(
        error instanceof Error
          ? `تعذر تحميل بيانات الفلترة: ${error.message}`
          : 'تعذر تحميل بيانات الفلترة. حاول مرة أخرى.',
      );
    } finally {
      setIsSearching(false);
    }
  }

  // تغيير إعداد حذف الطلاب.
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

      setAllowStudentDeletion(Boolean(result.deletionEnabled));
      setMessage(
        result.deletionEnabled
          ? 'تم تفعيل السماح بحذف الطلاب.'
          : 'تم تعطيل السماح بحذف الطلاب.',
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

  // تحديث بيانات الفلترة دون عرض نتائج غير مطابقة.
  async function searchStudents() {
    if (!canManageDates) {
      setSearchMessage('لا تتوفر صلاحية إدارة تواريخ الطلاب.');
      return;
    }

    if (!filterMode) {
      setSearchMessage('اختر طريقة التصفية أولًا.');
      return;
    }

    if (filterMode === 'level' && !selectedLevel) {
      setSearchMessage('اختر المستوى الدراسي أولًا.');
      return;
    }

    if (filterMode === 'teacher' && !selectedTeacher) {
      setSearchMessage('اختر المعلم أولًا.');
      return;
    }

    setIsSearching(true);
    setSearchMessage('');
    resetSelectedStudent();

    try {
      if (filterMode === 'teacher') {
        let teacherCache = getTeachersCache();

        if (!teacherCache?.teachers?.length) {
          await loadTeachersCache();
          teacherCache = getTeachersCache();
        }

        if (!teacherCache?.teachers?.length) {
          setSearchMessage(
            'قائمة المعلمين غير متوفرة. حاول تحديث البيانات.',
          );
          return;
        }

        if (!teacherCache.assignments?.length) {
          setSearchMessage(
            'لا توجد بيانات ربط بين المعلمين والطلاب. تأكد من تحميل تعيينات المعلمين.',
          );
          return;
        }
      }

      const cacheStatus = refreshCachedData();

      if (!cacheStatus.hasStudents) {
        setSearchMessage(
          'بيانات الطلاب غير متوفرة في الكاش الحالي. تعذر تطبيق التصفية.',
        );
        return;
      }

      if (
        filterMode === 'teacher' &&
        !cacheStatus.hasAssignments
      ) {
        setSearchMessage(
          'بيانات تعيينات المعلمين غير متوفرة، لذلك لا يمكن تحديد الطلاب المرتبطين بالمعلم.',
        );
        return;
      }

      setSearchMessage('تم تحديث البيانات. تظهر النتائج المطابقة أدناه.');
    } catch (error) {
      setSearchMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء تحديث قائمة الطلاب.',
      );
    } finally {
      setIsSearching(false);
    }
  }

  // تحميل تفاصيل الطالب من الـ API.
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

      if (data.enrollments?.length) {
        setSelectedEnrollmentId(data.enrollments[0].id);
        setEnrollmentDate(data.enrollments[0].join_date ?? '');
      }

      if (data.assignments?.length) {
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

  function chooseEnrollment(id: string) {
    setSelectedEnrollmentId(id);

    const enrollment = studentDates?.enrollments.find(
      (item) => item.id === id,
    );

    setEnrollmentDate(enrollment?.join_date ?? '');
    setDateMessage('');
  }

  function chooseAssignment(id: string) {
    setSelectedAssignmentId(id);

    const assignment = studentDates?.assignments.find(
      (item) => item.id === id,
    );

    setAssignmentDate(assignment?.join_date ?? '');
    setDateMessage('');
  }

  // فحص مبدئي لترتيب التواريخ؛ والـ API هو المرجع النهائي.
  function validateDateOrder(
    operation:
      | 'updateEnrollmentJoinDate'
      | 'updateAssignmentJoinDate',
    joinDate: string,
  ) {
    if (!studentDates) return null;

    if (operation === 'updateEnrollmentJoinDate') {
      const enrollment = studentDates.enrollments.find(
        (item) => item.id === selectedEnrollmentId,
      );

      const relatedDates = studentDates.assignments
        .filter(
          (item) =>
            item.course_id === enrollment?.course_id &&
            item.join_date,
        )
        .map((item) => item.join_date as string)
        .sort();

      if (relatedDates[0] && joinDate > relatedDates[0]) {
        return 'تاريخ انضمام الدورة يجب أن يكون قبل أو يساوي تاريخ تعيين الطالب عند المعلم.';
      }
    } else {
      const assignment = studentDates.assignments.find(
        (item) => item.id === selectedAssignmentId,
      );

      const hasConflict = studentDates.enrollments.some(
        (item) =>
          item.course_id === assignment?.course_id &&
          item.join_date &&
          item.join_date > joinDate,
      );

      if (hasConflict) {
        return 'تاريخ تعيين الطالب عند المعلم يجب أن يكون بعد أو يساوي تاريخ انضمامه للدورة.';
      }
    }

    return null;
  }

  // حفظ تاريخ الدورة أو تاريخ تعيين المعلم.
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

    if (isEnrollment) {
      setSavingEnrollmentDate(true);
    } else {
      setSavingAssignmentDate(true);
    }

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

  const selectedTeacherName =
    teachers.find((teacher) => teacher.id === selectedTeacher)?.name;

  function getTeacherName(teacherId: string) {
    return (
      teachers.find((teacher) => teacher.id === teacherId)?.name ??
      'اسم المعلم غير متوفر'
    );
  }

  function getLevelName(levelId: string) {
    return (
      levels.find((level) => level.id === levelId)?.name ??
      'المستوى غير محدد'
    );
  }

  return (
    <div dir="rtl" className="space-y-6 p-6">
      {/* عنوان الصفحة */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            إدارة تواريخ الطلاب والتحكم في السماح بحذفهم.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </button>
      </div>

      {/* القسم الأول: إعداد حذف الطلاب */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="font-semibold">التحكم في حذف الطلاب</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              فعّل أو عطّل السماح بحذف الطلاب من النظام.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">السماح بحذف الطلاب</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading
                ? 'جارٍ تحميل الإعداد...'
                : isSavingDeletion
                  ? 'جارٍ حفظ التغيير...'
                  : !canManageDeletion
                    ? 'تعذر تحميل الإعداد أو لا تتوفر صلاحية إدارته.'
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
              isLoading || isSavingDeletion || !canManageDeletion
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

      {/* القسم الثاني: تعديل التواريخ */}
      <section className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="font-semibold">تعديل تواريخ الطلاب</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              اختر المستوى الدراسي أو المعلم، ثم اختر الطالب لتعديل تواريخه.
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
            {!showDateManagement ? (
              <button
                type="button"
                onClick={() => {
                  setShowDateManagement(true);
                  refreshCachedData();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                <CalendarDays className="h-4 w-4" />
                فتح إدارة التواريخ
              </button>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    اختر طريقة التصفية
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDateManagement(false);
                      setFilterMode('');
                      setSearch('');
                      setSelectedLevel('');
                      setSelectedTeacher('');
                      setSearchMessage('');
                      resetSelectedStudent();
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    إغلاق
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleFilterModeChange('level')}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-right transition-colors ${
                      filterMode === 'level'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Filter className="h-5 w-5 text-primary" />
                    <div>
                      <span className="block text-sm font-semibold">
                        حسب المستوى الدراسي
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        عرض الطلاب في مستوى دراسي محدد.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleFilterModeChange('teacher')}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-right transition-colors ${
                      filterMode === 'teacher'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <span className="block text-sm font-semibold">
                        حسب المعلم
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        عرض الطلاب المرتبطين بمعلم محدد.
                      </span>
                    </div>
                  </button>
                </div>

                {filterMode && (
                  <>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">
                          {filterMode === 'level'
                            ? 'المستوى الدراسي'
                            : 'اسم المعلم'}
                        </span>

                        {filterMode === 'level' ? (
                          <select
                            value={selectedLevel}
                            onChange={(event) => {
                              setSelectedLevel(event.target.value);
                              setSearchMessage('');
                              resetSelectedStudent();
                            }}
                            className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
                          >
                            <option value="">اختر المستوى الدراسي</option>
                            {levels.map((level) => (
                              <option key={level.id} value={level.id}>
                                {level.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={selectedTeacher}
                            onChange={(event) => {
                              setSelectedTeacher(event.target.value);
                              setSearchMessage('');
                              resetSelectedStudent();
                            }}
                            className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
                          >
                            <option value="">اختر المعلم</option>
                            {[...teachers]
                              .sort((a, b) =>
                                a.name.localeCompare(b.name, 'ar'),
                              )
                              .map((teacher) => (
                                <option
                                  key={teacher.id}
                                  value={teacher.id}
                                >
                                  {teacher.name}
                                </option>
                              ))}
                          </select>
                        )}
                      </label>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => void searchStudents()}
                          disabled={isSearching || savingDate}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 md:w-auto"
                        >
                          {isSearching ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Filter className="h-4 w-4" />
                          )}
                          تحديث النتائج
                        </button>
                      </div>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">
                        البحث داخل الطلاب
                      </span>
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="اكتب اسم الطالب أو رقمه أو رقمه الشخصي"
                          className="w-full rounded-lg border border-border bg-background py-2.5 pe-9 ps-3 text-sm"
                        />
                      </div>
                    </label>

                    {!cacheAvailable && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        بيانات الطلاب غير متوفرة في الكاش الحالي. حاول تحديث
                        البيانات من الصفحة التي تعرض قائمة الطلاب، ثم ارجع إلى
                        هذه الصفحة.
                      </p>
                    )}

                    {filterMode === 'teacher' &&
                      teachers.length === 0 && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          لم يتم العثور على أسماء المعلمين. اضغط «تحديث
                          النتائج» للمحاولة مرة أخرى.
                        </p>
                      )}

                    {filterMode === 'teacher' &&
                      selectedTeacher &&
                      !teacherCacheAvailable && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          بيانات ربط المعلمين بالطلاب غير متوفرة أو لا تحتوي
                          على تعيينات. لا يمكن عرض الطلاب لهذا المعلم قبل
                          توفر بيانات التعيينات.
                        </p>
                      )}

                    {searchMessage && (
                      <p
                        role="status"
                        aria-live="polite"
                        className="text-sm text-muted-foreground"
                      >
                        {searchMessage}
                      </p>
                    )}

                    {cacheAvailable &&
                      (filterMode === 'level'
                        ? Boolean(selectedLevel)
                        : Boolean(selectedTeacher)) && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold">
                              {filterMode === 'level'
                                ? `طلاب المستوى: ${getLevelName(selectedLevel)}`
                                : `طلاب المعلم: ${selectedTeacherName ?? ''}`}
                            </h3>

                            <span className="text-xs text-muted-foreground">
                              {filteredStudents.length} طالب
                            </span>
                          </div>

                          {filteredStudents.length > 0 ? (
                            <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
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
                                        {student.name || 'اسم الطالب غير متوفر'}
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
                          ) : (
                            <div className="rounded-lg border border-dashed border-border p-6 text-center">
                              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-2 text-sm font-medium">
                                لا توجد نتائج مطابقة
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                جرّب اختيارًا آخر أو غيّر عبارة البحث.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            )}

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
                    الرقم الشخصي: {studentDates.student.personal_id || '—'}
                  </p>
                </div>

                {/* تاريخ الانضمام للدورة */}
                <section className="space-y-4 rounded-lg border border-border p-4">
                  <div>
                    <h3 className="font-semibold">
                      ١. تاريخ انضمام الطالب للدورة
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      اختر تسجيل الدورة، ثم عدّل تاريخ الانضمام واحفظه.
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
                          {studentDates.enrollments.map((item, index) => (
                            <option key={item.id} value={item.id}>
                              تسجيل {index + 1}
                              {' · '}
                              المستوى {getLevelName(item.level_id)}
                              {' · '}
                              الحالة: {item.status}
                            </option>
                          ))}
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
                          savingDate ||
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
                          ? 'جارٍ الحفظ...'
                          : 'حفظ تاريخ الدورة'}
                      </button>
                    </>
                  )}
                </section>

                {/* تاريخ تعيين المعلم */}
                <section className="space-y-4 rounded-lg border border-border p-4">
                  <div>
                    <h3 className="font-semibold">
                      ٢. تاريخ تعيين الطالب عند المعلم
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      اختر تعيين المعلم، ثم عدّل تاريخه واحفظه.
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
                          {studentDates.assignments.map((item, index) => (
                            <option key={item.id} value={item.id}>
                              تعيين {index + 1}
                              {' · '}
                              المعلم: {getTeacherName(item.teacher_id)}
                              {' · '}
                              المادة: {item.subject_id}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">
                          تاريخ التعيين عند المعلم
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
                          savingDate ||
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
                          ? 'جارٍ الحفظ...'
                          : 'حفظ تاريخ المعلم'}
                      </button>
                    </>
                  )}
                </section>

                <p className="text-xs leading-6 text-muted-foreground">
                  يجب أن يكون تاريخ انضمام الدورة قبل أو مساويًا لتاريخ تعيين
                  الطالب عند المعلم. ويتحقق النظام أيضًا من صلاحية التاريخ
                  ضمن الدورة والسنة الدراسية.
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
    </div>
  );
}