'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Plus,
} from 'lucide-react'

import {
  loadSettingsAcademicYearTeachers,
  loadSettingsAcademicYearSubjects,
  loadSettingsAcademicYears,
  loadSettingsCoursesByAcademicYearIds,
  loadSettingsCourseTeachers,
  loadSettingsCourseSubjects,
  loadSettingsCourseSubjectTeachers,
  loadSettingsExistingCourseSubjects,
  deleteSettingsCourseSubjectTeachers,
  deleteSettingsCourseSubjectsByIds,
  insertSettingsCourseSubjects,
  insertSettingsCourseSubjectTeachers,
  deleteSettingsCourseTeachers,
  insertSettingsCourseTeachers,
  updateSettingsAcademicYear,
  clearSettingsCurrentAcademicYear,
  insertSettingsAcademicYear,
  updateSettingsAcademicYearCourse,
  insertSettingsAcademicYearCourse,
  deleteSettingsAcademicYear,
} from '@/lib/features/settings/repositories/settings.repository'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import AcademicYearCourseManagement, {
  AcademicYear,
  Course,
  DayOfWeek,
  Subject,
  Teacher,
  TeacherAssignment,
} from './academic-year-course-management'

export default function Page() {
  const router = useRouter()

  const [years, setYears] = useState<AcademicYear[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [loadingYears, setLoadingYears] = useState(true)
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(true)

  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] =
    useState<string | null>(null)
  const [closingId, setClosingId] =
    useState<string | null>(null)

  const [exportingExcel, setExportingExcel] =
    useState(false)

  const [supabaseStatus, setSupabaseStatus] =
    useState('')

  const [showForm, setShowForm] =
    useState(false)
  const [editingId, setEditingId] =
    useState<string | null>(null)

  const [yearName, setYearName] =
    useState('')
  const [startDate, setStartDate] =
    useState('')
  const [endDate, setEndDate] =
    useState('')
  const [annualFee, setAnnualFee] =
    useState('')

  const [courses, setCourses] =
    useState<Course[]>([])

  const [
    selectedSummaryCourse,
    setSelectedSummaryCourse,
  ] = useState<Course | null>(null)

  const [summaryData, setSummaryData] =
    useState<{
      studentCount: number
      subjectCount: number
      teacherCount: number
      lessonDays: number
      attendance: {
        present: number
        absent: number
        late: number
        excused: number
        notRecorded: number
        percentage: number
      }
    } | null>(null)

  const [summaryLoading, setSummaryLoading] =
    useState(false)

  useEffect(() => {
    const loadTeachers = async () => {
      setLoadingTeachers(true)

      const { data, error } =
        await loadSettingsAcademicYearTeachers()

      if (error) {
        setSupabaseStatus(
          `خطأ في تحميل المعلمين: ${error.message}`,
        )
        setLoadingTeachers(false)
        return
      }

      const mapped: Teacher[] = (
        data ?? []
      ).map((teacher) => ({
        id: teacher.id,
        name: teacher.name ?? '',
        isActive: Boolean(
          teacher.is_active,
        ),
      }))

      mapped.sort((a, b) =>
        a.name.localeCompare(b.name, 'ar'),
      )

      setTeachers(mapped)
      setLoadingTeachers(false)
    }

    loadTeachers()
  }, [])

  useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true)

      const { data, error } =
        await loadSettingsAcademicYearSubjects()

      if (error) {
        setSupabaseStatus(
          `خطأ في تحميل المواد: ${error.message}`,
        )
        setLoadingSubjects(false)
        return
      }

      const mapped: Subject[] = (
        data ?? []
      ).map((subject) => ({
        id: subject.id,
        name: subject.name ?? '',
        isActive: Boolean(
          subject.is_active,
        ),
      }))

      mapped.sort((a, b) =>
        a.name.localeCompare(b.name, 'ar'),
      )

      setSubjects(mapped)
      setLoadingSubjects(false)
    }

    loadSubjects()
  }, [])

  const loadYears = async () => {
    setLoadingYears(true)

    const { data, error } =
      await loadSettingsAcademicYears()

    if (error) {
      setSupabaseStatus(
        `خطأ في تحميل السنوات الدراسية: ${error.message}`,
      )
      setLoadingYears(false)
      return
    }

    const academicYears = data ?? []

    if (academicYears.length === 0) {
      setYears([])
      setSupabaseStatus(
        'متصل بـ Supabase ✅',
      )
      setLoadingYears(false)
      return
    }

    const yearIds = academicYears.map(
      (year) => year.id,
    )

    const {
      data: courseData,
      error: courseError,
    } = await loadSettingsCoursesByAcademicYearIds(
      yearIds,
    )

    if (courseError) {
      setSupabaseStatus(
        `خطأ في تحميل الدورات: ${courseError.message}`,
      )
      setLoadingYears(false)
      return
    }

    const courseIds = (
      courseData ?? []
    ).map((course) => course.id)

    let courseTeacherData: {
      course_id: string
      teacher_id: string
    }[] = []

    let courseSubjectData: {
      id: string
      course_id: string
      subject_id: string
    }[] = []

    let courseSubjectTeacherData: {
      course_subject_id: string
      teacher_id: string
    }[] = []

    if (courseIds.length > 0) {
      const {
        data: relationData,
        error: relationError,
      } = await loadSettingsCourseTeachers(
        courseIds,
      )

      if (relationError) {
        setSupabaseStatus(
          `خطأ في تحميل معلمي الدورات: ${relationError.message}`,
        )
        setLoadingYears(false)
        return
      }

      courseTeacherData =
        relationData ?? []

      const {
        data: courseSubjects,
        error: courseSubjectsError,
      } = await loadSettingsCourseSubjects(
        courseIds,
      )

      if (courseSubjectsError) {
        setSupabaseStatus(
          `خطأ في تحميل مواد الدورات: ${courseSubjectsError.message}`,
        )
        setLoadingYears(false)
        return
      }

      courseSubjectData =
        courseSubjects ?? []

      const courseSubjectIds =
        courseSubjectData.map(
          (item) => item.id,
        )

      if (
        courseSubjectIds.length > 0
      ) {
        const {
          data: subjectTeacherData,
          error: subjectTeacherError,
        } = await loadSettingsCourseSubjectTeachers(
          courseSubjectIds,
        )

        if (subjectTeacherError) {
          setSupabaseStatus(
            `خطأ في تحميل ربط المواد بالمعلمين: ${subjectTeacherError.message}`,
          )
          setLoadingYears(false)
          return
        }

        courseSubjectTeacherData =
          subjectTeacherData ?? []
      }
    }

    const mappedYears: AcademicYear[] =
      academicYears.map((year) => {
        const yearCourses = (
          courseData ?? []
        )
          .filter(
            (course) =>
              course.academic_year_id ===
              year.id,
          )
          .map((course) => {
            const legacyTeacherIds =
              courseTeacherData
                .filter(
                  (relation) =>
                    relation.course_id ===
                    course.id,
                )
                .map(
                  (relation) =>
                    relation.teacher_id,
                )

            const courseSubjects =
              courseSubjectData.filter(
                (item) =>
                  item.course_id ===
                  course.id,
              )

            const assignments: TeacherAssignment[] =
              []

            const teacherIds =
              new Set<string>()

            courseSubjectTeacherData
              .filter((relation) =>
                courseSubjects.some(
                  (subject) =>
                    subject.id ===
                    relation.course_subject_id,
                ),
              )
              .forEach((relation) => {
                teacherIds.add(
                  relation.teacher_id,
                )

                const existing =
                  assignments.find(
                    (item) =>
                      item.teacherId ===
                      relation.teacher_id,
                  )

                const courseSubject =
                  courseSubjects.find(
                    (item) =>
                      item.id ===
                      relation.course_subject_id,
                  )

                if (!courseSubject)
                  return

                if (existing) {
                  if (
                    !existing.subjectIds.includes(
                      courseSubject.subject_id,
                    )
                  ) {
                    existing.subjectIds.push(
                      courseSubject.subject_id,
                    )
                  }
                } else {
                  assignments.push({
                    teacherId:
                      relation.teacher_id,
                    subjectIds: [
                      courseSubject.subject_id,
                    ],
                  })
                }
              })

            legacyTeacherIds.forEach(
              (teacherId) => {
                teacherIds.add(
                  teacherId,
                )

                if (
                  !assignments.some(
                    (item) =>
                      item.teacherId ===
                      teacherId,
                  )
                ) {
                  assignments.push({
                    teacherId,
                    subjectIds: [],
                  })
                }
              },
            )

            return {
              id: course.id,
              name: course.name ?? '',
              startDate:
                course.start_date ?? '',
              endDate:
                course.end_date ?? '',
              days: Array.isArray(
                course.days,
              )
                ? (course.days as DayOfWeek[])
                : [],
              teacherIds:
                Array.from(
                  teacherIds,
                ),
              teacherAssignments:
                assignments,
              isClosed: Boolean(
                course.is_closed,
              ),
              closedAt:
                course.closed_at ??
                null,
            }
          })

        return {
          id: year.id,
          name: year.name ?? '',
          startDate:
            year.start_date ?? '',
          endDate:
            year.end_date ?? '',
          annualFee: Number(
            year.annual_fee ?? 0,
          ),
          courses: yearCourses,
        }
      })

    setYears(mappedYears)
    setSupabaseStatus(
      'متصل بـ Supabase ✅',
    )
    setLoadingYears(false)
  }

  useEffect(() => {
    loadYears()
  }, [])

  const resetForm = () => {
    setYearName('')
    setStartDate('')
    setEndDate('')
    setAnnualFee('')
    setCourses([])
    setEditingId(null)
    setShowForm(false)
  }

  const cloneCourses = (
    source: Course[],
  ): Course[] => {
    return source.map((course) => ({
      ...course,
      days: [...course.days],
      teacherIds: [
        ...course.teacherIds,
      ],
      teacherAssignments:
        course.teacherAssignments.map(
          (assignment) => ({
            teacherId:
              assignment.teacherId,
            subjectIds: [
              ...assignment.subjectIds,
            ],
          }),
        ),
    }))
  }

  const openAddForm = () => {
    setEditingId(null)
    setYearName('')
    setStartDate('')
    setEndDate('')
    setAnnualFee('')
    setCourses([])
    setSupabaseStatus('')
    setShowForm(true)
  }

  const openEditForm = (
    year: AcademicYear,
  ) => {
    setEditingId(year.id)
    setYearName(year.name)
    setStartDate(year.startDate)
    setEndDate(year.endDate)
    setAnnualFee(
      String(year.annualFee ?? ''),
    )
    setCourses(
      cloneCourses(year.courses),
    )
    setSupabaseStatus('')
    setShowForm(true)
  }

  const openAddCourseForYear = (
    year: AcademicYear,
  ) => {
    setEditingId(year.id)
    setYearName(year.name)
    setStartDate(year.startDate)
    setEndDate(year.endDate)
    setAnnualFee(
      String(year.annualFee ?? ''),
    )
    setCourses([
      ...cloneCourses(year.courses),
      {
        id: undefined,
        name: '',
        startDate: '',
        endDate: '',
        days: [],
        teacherIds: [],
        teacherAssignments: [],
        isClosed: false,
        closedAt: null,
      },
    ])
    setSupabaseStatus('')
    setShowForm(true)
  }

  const saveCourseRelations = async (
    courseId: string,
    course: Course,
  ) => {
    const normalizedAssignments =
      course.teacherAssignments
        .map((assignment) => ({
          teacherId:
            assignment.teacherId,
          subjectIds: Array.from(
            new Set(
              assignment.subjectIds,
            ),
          ),
        }))
        .filter(
          (assignment) =>
            assignment.teacherId &&
            assignment.subjectIds
              .length > 0,
        )

    const teacherIds = Array.from(
      new Set(
        normalizedAssignments.map(
          (item) =>
            item.teacherId,
        ),
      ),
    )

    const selectedSubjectIds =
      Array.from(
        new Set(
          normalizedAssignments.flatMap(
            (item) =>
              item.subjectIds,
          ),
        ),
      )

    const {
      data: existingSubjects,
      error: existingSubjectsError,
    } = await loadSettingsExistingCourseSubjects(
      courseId,
    )

    if (existingSubjectsError) {
      return existingSubjectsError
    }

    const existingSubjectRows =
      existingSubjects ?? []

    const existingCourseSubjectIds =
      existingSubjectRows.map(
        (item) => item.id,
      )

    if (
      existingCourseSubjectIds.length >
      0
    ) {
      const {
        error: deleteSubjectTeachersError,
      } = await deleteSettingsCourseSubjectTeachers(
        existingCourseSubjectIds,
      )

      if (
        deleteSubjectTeachersError
      ) {
        return deleteSubjectTeachersError
      }
    }

    const subjectsToKeep =
      existingSubjectRows.filter(
        (item) =>
          selectedSubjectIds.includes(
            item.subject_id,
          ),
      )

    const subjectsToDelete =
      existingSubjectRows.filter(
        (item) =>
          !selectedSubjectIds.includes(
            item.subject_id,
          ),
      )

    if (
      subjectsToDelete.length > 0
    ) {
      const {
        error: deleteUnusedSubjectsError,
      } = await deleteSettingsCourseSubjectsByIds(
        subjectsToDelete.map(
          (item) => item.id,
        ),
      )

      if (
        deleteUnusedSubjectsError
      ) {
        return deleteUnusedSubjectsError
      }
    }

    const subjectsToInsert =
      selectedSubjectIds.filter(
        (subjectId) =>
          !subjectsToKeep.some(
            (item) =>
              item.subject_id ===
              subjectId,
          ),
      )

    if (
      subjectsToInsert.length > 0
    ) {
      const {
        error: insertSubjectsError,
      } = await insertSettingsCourseSubjects(
        subjectsToInsert.map(
          (subjectId) => ({
            course_id: courseId,
            subject_id: subjectId,
          }),
        ),
      )

      if (insertSubjectsError) {
        return insertSubjectsError
      }
    }

    const {
      data: refreshedSubjects,
      error: refreshedSubjectsError,
    } = await loadSettingsExistingCourseSubjects(
      courseId,
    )

    if (refreshedSubjectsError) {
      return refreshedSubjectsError
    }

    const subjectIdToCourseSubjectId =
      new Map<string, string>()

    ;(
      refreshedSubjects ?? []
    ).forEach((item) => {
      subjectIdToCourseSubjectId.set(
        item.subject_id,
        item.id,
      )
    })

    const subjectTeacherRows: {
      course_subject_id: string
      teacher_id: string
    }[] = []

    for (const assignment of normalizedAssignments) {
      for (const subjectId of assignment.subjectIds) {
        const courseSubjectId =
          subjectIdToCourseSubjectId.get(
            subjectId,
          )

        if (!courseSubjectId) {
          return new Error(
            'تعذر تحديد المادة داخل الدورة.',
          )
        }

        subjectTeacherRows.push({
          course_subject_id:
            courseSubjectId,
          teacher_id:
            assignment.teacherId,
        })
      }
    }

    const uniqueSubjectTeacherRows =
      Array.from(
        new Map(
          subjectTeacherRows.map(
            (row) => [
              `${row.course_subject_id}:${row.teacher_id}`,
              row,
            ],
          ),
        ).values(),
      )

    if (
      uniqueSubjectTeacherRows.length >
      0
    ) {
      const {
        error: insertSubjectTeachersError,
      } = await insertSettingsCourseSubjectTeachers(
        uniqueSubjectTeacherRows,
      )

      if (
        insertSubjectTeachersError
      ) {
        return insertSubjectTeachersError
      }
    }

    const {
      error: deleteCourseTeachersError,
    } = await deleteSettingsCourseTeachers(
      courseId,
    )

    if (deleteCourseTeachersError) {
      return deleteCourseTeachersError
    }

    if (teacherIds.length > 0) {
      const {
        error: insertCourseTeachersError,
      } = await insertSettingsCourseTeachers(
        teacherIds.map(
          (teacherId) => ({
            course_id: courseId,
            teacher_id: teacherId,
          }),
        ),
      )

      if (
        insertCourseTeachersError
      ) {
        return insertCourseTeachersError
      }
    }

    return null
  }

  const validateCourses = () => {
    for (
      let index = 0;
      index < courses.length;
      index += 1
    ) {
      const course = courses[index]

      if (course.isClosed) {
        continue
      }

      if (!course.name.trim()) {
        setSupabaseStatus(
          `يرجى إدخال اسم الدورة ${
            index + 1
          }`,
        )
        return false
      }

      if (course.days.length === 0) {
        setSupabaseStatus(
          `يرجى اختيار يوم واحد على الأقل للدورة ${
            index + 1
          }`,
        )
        return false
      }

      if (
        course.teacherAssignments
          .length === 0
      ) {
        setSupabaseStatus(
          `يرجى إضافة معلم واحد على الأقل للدورة ${
            index + 1
          }`,
        )
        return false
      }

      for (const assignment of course.teacherAssignments) {
        if (
          assignment.subjectIds
            .length === 0
        ) {
          const teacher =
            teachers.find(
              (item) =>
                item.id ===
                assignment.teacherId,
            )

          setSupabaseStatus(
            `المادة إجبارية للمعلم "${
              teacher?.name ??
              'المعلم'
            }" في الدورة ${
              index + 1
            }`,
          )

          return false
        }
      }
    }

    return true
  }

  const handleSave = async () => {
    const trimmedName =
      yearName.trim()

    const parsedAnnualFee =
      annualFee.trim() === ''
        ? 0
        : Number(annualFee)

    if (!trimmedName) {
      setSupabaseStatus(
        'يرجى إدخال اسم السنة الدراسية',
      )
      return
    }

    if (
      !Number.isFinite(
        parsedAnnualFee,
      ) ||
      parsedAnnualFee < 0
    ) {
      setSupabaseStatus(
        'يرجى إدخال رسوم سنوية صحيحة',
      )
      return
    }

    if (!validateCourses()) {
      return
    }

    setSaving(true)
    setSupabaseStatus(
      'جاري الحفظ...',
    )

    try {
      if (editingId !== null) {
        const {
          data: updatedYear,
          error: yearError,
        } = await updateSettingsAcademicYear(
          editingId,
          {
            name: trimmedName,
            start_date: startDate || null,
            end_date: endDate || null,
            annual_fee: parsedAnnualFee,
          },
        )

        if (yearError) {
          setSupabaseStatus(
            `خطأ في تعديل السنة الدراسية: ${yearError.message}`,
          )
          return
        }

        const savedCourses: Course[] =
          []

        for (const course of courses) {
          let courseId = course.id

          if (courseId) {
            if (course.isClosed) {
              savedCourses.push({
                ...course,
                days: [
                  ...course.days,
                ],
                teacherIds: [
                  ...course.teacherIds,
                ],
                teacherAssignments:
                  course.teacherAssignments.map(
                    (
                      assignment,
                    ) => ({
                      teacherId:
                        assignment.teacherId,
                      subjectIds: [
                        ...assignment.subjectIds,
                      ],
                    }),
                  ),
              })

              continue
            }

            const {
              data: updatedCourse,
              error: updateCourseError,
            } = await updateSettingsAcademicYearCourse(
              courseId,
              editingId,
              {
                name: course.name.trim(),
                start_date: course.startDate || null,
                end_date: course.endDate || null,
                days: course.days,
              },
            )

            if (
              updateCourseError
            ) {
              setSupabaseStatus(
                `خطأ في حفظ الدورة "${course.name}": ${updateCourseError.message}`,
              )
              return
            }

            courseId =
              updatedCourse.id
          } else {
            const {
              data: insertedCourse,
              error: insertCourseError,
            } = await insertSettingsAcademicYearCourse(
              editingId,
              {
                name: course.name.trim(),
                start_date: course.startDate || null,
                end_date: course.endDate || null,
                days: course.days,
              },
            )

            if (
              insertCourseError
            ) {
              setSupabaseStatus(
                `خطأ في إضافة الدورة "${course.name}": ${insertCourseError.message}`,
              )
              return
            }

            courseId =
              insertedCourse.id
          }

          if (!courseId) {
            setSupabaseStatus(
              `تعذر تحديد رقم الدورة "${course.name}".`,
            )
            return
          }

          const relationError =
            await saveCourseRelations(
              courseId,
              course,
            )

          if (relationError) {
            setSupabaseStatus(
              `خطأ في حفظ مواد ومعلمي الدورة "${course.name}": ${relationError.message}`,
            )
            return
          }

          savedCourses.push({
            id: courseId,
            name: course.name.trim(),
            startDate:
              course.startDate,
            endDate:
              course.endDate,
            days: [
              ...course.days,
            ],
            teacherIds: [
              ...new Set(
                course.teacherAssignments.map(
                  (item) =>
                    item.teacherId,
                ),
              ),
            ],
            teacherAssignments:
              course.teacherAssignments.map(
                (
                  assignment,
                ) => ({
                  teacherId:
                    assignment.teacherId,
                  subjectIds: [
                    ...assignment.subjectIds,
                  ],
                }),
              ),
            isClosed: false,
            closedAt: null,
          })
        }

        const mappedUpdatedYear: AcademicYear =
          {
            id: updatedYear.id,
            name:
              updatedYear.name ??
              '',
            startDate:
              updatedYear.start_date ??
              '',
            endDate:
              updatedYear.end_date ??
              '',
            annualFee: Number(
              updatedYear.annual_fee ??
                0,
            ),
            courses:
              savedCourses,
          }

        setYears((current) =>
          current.map(
            (year) =>
              year.id ===
              editingId
                ? mappedUpdatedYear
                : year,
          ),
        )

        setSupabaseStatus(
          'تم حفظ السنة والدورات والمواد والمعلمين في Supabase ✅',
        )

        resetForm()
        return
      }

      const {
        error: resetCurrentError,
      } = await clearSettingsCurrentAcademicYear()

      if (resetCurrentError) {
        setSupabaseStatus(
          `خطأ في تحديث السنة الحالية: ${resetCurrentError.message}`,
        )
        return
      }

      const {
        data: newYear,
        error: yearError,
      } = await insertSettingsAcademicYear({
        name: trimmedName,
        start_date: startDate || null,
        end_date: endDate || null,
        annual_fee: parsedAnnualFee,
        is_current: true,
        is_active: true,
      })

      if (yearError) {
        setSupabaseStatus(
          `خطأ في إضافة السنة الدراسية: ${yearError.message}`,
        )
        return
      }

      const savedCourses: Course[] =
        []

      for (const course of courses) {
        const {
          data: insertedCourse,
          error: insertCourseError,
        } = await insertSettingsAcademicYearCourse(
          newYear.id,
          {
            name: course.name.trim(),
            start_date: course.startDate || null,
            end_date: course.endDate || null,
            days: course.days,
          },
        )

        if (insertCourseError) {
          setSupabaseStatus(
            `خطأ في حفظ الدورة "${course.name}": ${insertCourseError.message}`,
          )
          return
        }

        const relationError =
          await saveCourseRelations(
            insertedCourse.id,
            course,
          )

        if (relationError) {
          setSupabaseStatus(
            `خطأ في حفظ مواد ومعلمي الدورة "${course.name}": ${relationError.message}`,
          )
          return
        }

        savedCourses.push({
          id: insertedCourse.id,
          name:
            insertedCourse.name ??
            '',
          startDate:
            insertedCourse.start_date ??
            '',
          endDate:
            insertedCourse.end_date ??
            '',
          days: Array.isArray(
            insertedCourse.days,
          )
            ? (insertedCourse.days as DayOfWeek[])
            : [],
          teacherIds: [
            ...new Set(
              course.teacherAssignments.map(
                (item) =>
                  item.teacherId,
              ),
            ),
          ],
          teacherAssignments:
            course.teacherAssignments.map(
              (
                assignment,
              ) => ({
                teacherId:
                  assignment.teacherId,
                subjectIds: [
                  ...assignment.subjectIds,
                ],
              }),
            ),
          isClosed: false,
          closedAt: null,
        })
      }

      const mappedNewYear: AcademicYear =
        {
          id: newYear.id,
          name:
            newYear.name ?? '',
          startDate:
            newYear.start_date ?? '',
          endDate:
            newYear.end_date ?? '',
          annualFee: Number(
            newYear.annual_fee ??
              0,
          ),
          courses:
            savedCourses,
        }

      setYears((current) => [
        mappedNewYear,
        ...current,
      ])

      setSupabaseStatus(
        'تمت إضافة السنة والدورات والمواد والمعلمين في Supabase ✅',
      )

      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (
    id: string,
  ) => {
    const year = years.find(
      (item) => item.id === id,
    )

    if (!year) return

    const displayName =
      year.name ||
      'هذه السنة الدراسية'

    const confirmed =
      window.confirm(
        `هل أنت متأكد من حذف السنة الدراسية "${displayName}"؟\n\nسيتم حذف البيانات التابعة لها إذا كانت قيود قاعدة البيانات تسمح بذلك.\n\nهذا الإجراء لا يمكن التراجع عنه.`,
      )

    if (!confirmed) return

    setDeletingId(id)
    setSupabaseStatus(
      'جاري المسح...',
    )

    const { error } =
      await deleteSettingsAcademicYear(id)

    if (error) {
      setSupabaseStatus(
        `خطأ في مسح السنة الدراسية: ${error.message}`,
      )
      setDeletingId(null)
      return
    }

    setYears((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    )

    setSupabaseStatus(
      'تم مسح السنة الدراسية من Supabase ✅',
    )

    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <Button
          type="button"
          onClick={() => router.back()}
          className="gap-2"
        >
          العودة
        </Button>
      </div>

      <PageHeader
        title="السنة الدراسية والدورات"
        description="إدارة السنوات الدراسية والدورات والمواد والمعلمين"
      />

      {supabaseStatus && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          {supabaseStatus}
        </div>
      )}

      {!showForm && (
        <div className="flex justify-start">
          <Button
            type="button"
            onClick={openAddForm}
            disabled={
              saving ||
              deletingId !== null ||
              closingId !== null
            }
          >
            <Plus className="size-4" />
            إضافة سنة جديدة
          </Button>
        </div>
      )}

      <AcademicYearCourseManagement
        years={years}
        setYears={setYears}
        teachers={teachers}
        subjects={subjects}
        loadingYears={loadingYears}
        loadingTeachers={loadingTeachers}
        loadingSubjects={loadingSubjects}
        saving={saving}
        deletingId={deletingId}
        closingId={closingId}
        exportingExcel={exportingExcel}
        setExportingExcel={
          setExportingExcel
        }
        supabaseStatus={supabaseStatus}
        setSupabaseStatus={
          setSupabaseStatus
        }
        showForm={showForm}
        setShowForm={setShowForm}
        editingId={editingId}
        setEditingId={setEditingId}
        yearName={yearName}
        setYearName={setYearName}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        annualFee={annualFee}
        setAnnualFee={setAnnualFee}
        courses={courses}
        setCourses={setCourses}
        selectedSummaryCourse={
          selectedSummaryCourse
        }
        setSelectedSummaryCourse={
          setSelectedSummaryCourse
        }
        summaryData={summaryData}
        setSummaryData={setSummaryData}
        summaryLoading={summaryLoading}
        setSummaryLoading={
          setSummaryLoading
        }
        onResetForm={resetForm}
        onOpenEditForm={openEditForm}
        onOpenAddCourseForYear={
          openAddCourseForYear
        }
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {!showForm &&
        !loadingYears &&
        years.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <CalendarDays className="mx-auto size-10 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                لا توجد سنوات دراسية
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                اضغط على "إضافة سنة جديدة" لإضافة أول سنة دراسية.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  )
}