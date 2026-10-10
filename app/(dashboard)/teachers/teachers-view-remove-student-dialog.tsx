'use client'

import { Button } from '@/components/ui/button'

export type RemoveMode =
  | 'assignment_only'
  | 'assignment_and_attendance'

interface TeachersViewRemoveStudentDialogProps {
  open: boolean
  studentName: string
  deleting: boolean
  onConfirm: (mode: RemoveMode) => void
  onCancel: () => void
}

export function TeachersViewRemoveStudentDialog({
  open,
  studentName,
  deleting,
  onConfirm,
  onCancel,
}: TeachersViewRemoveStudentDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-student-dialog-title"
        className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
      >
        <h2
          id="remove-student-dialog-title"
          className="text-lg font-semibold"
        >
          تأكيد إزالة الطالب
        </h2>

        <p className="mt-3 text-sm text-muted-foreground">
          هل تريد إزالة الطالب
          {studentName ? ` «${studentName}»` : ''} من هذا المعلم؟
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          اختر الإجراء المطلوب:
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => onConfirm('assignment_only')}
          >
            مسح التعيين فقط
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => onConfirm('assignment_and_attendance')}
          >
            مسح التعيين وسجل الحضور
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={onCancel}
          >
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  )
}
