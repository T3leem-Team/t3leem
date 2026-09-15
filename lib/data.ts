export type Stat = {
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
  hint: string
}

export const dashboardStats: Stat[] = [
  { label: 'إجمالي الطلاب', value: '١٬٢٤٨', change: '٤٫٢٪+', trend: 'up', hint: 'مقارنة بالفصل السابق' },
  { label: 'المعلمون النشطون', value: '٨٦', change: '٢٫١٪+', trend: 'up', hint: 'مقارنة بالشهر الماضي' },
  { label: 'طلبات تسجيل معلّقة', value: '٣٤', change: '١٢٪−', trend: 'down', hint: 'بانتظار المراجعة' },
  { label: 'إيرادات الشهر', value: '٣٢٤٬٥٠٠ ر.س', change: '٨٫٧٪+', trend: 'up', hint: 'الرسوم المحصّلة' },
]

export type Student = {
  id: string
  name: string
  personalId: string
  grade: string
  phone: string
  whatsapp: string
  paymentStatus: 'مدفوع بالكامل' | 'مدفوع جزئيًا' | 'غير مدفوع' | 'معفي'
  amountDue: number
  amountPaid: number
  chronicDiseases: string
  notes: string
}

export const academicGrades = [
  'الأول ابتدائي',
  'الثاني ابتدائي',
  'الثالث ابتدائي',
  'الرابع ابتدائي',
  'الخامس ابتدائي',
  'السادس ابتدائي',
  'الأول إعدادي',
  'الثاني إعدادي',
  'الثالث إعدادي',
  'الأول ثانوي',
  'الثاني ثانوي',
  'الثالث ثانوي',
  'فوق الثانوي',
]

/* =========================
   السنة الدراسية والدورات
   ========================= */

export type StudyDay =
  | 'الأحد'
  | 'الإثنين'
  | 'الثلاثاء'
  | 'الأربعاء'
  | 'الخميس'
  | 'الجمعة'
  | 'السبت'

export type CourseType = 'عادية' | 'خاصة'

export type StudyCourse = {
  id: string
  academicYearId: string
  name: string
  type: CourseType
  startDate: string | null
  endDate: string | null
  studyDays: StudyDay[]
  isActive: boolean
}

export type AcademicYear = {
  id: string
  name: string
  isCurrent: boolean
  courses: StudyCourse[]
}

export const academicYears: AcademicYear[] = [
  {
    id: 'AY-2026-2027',
    name: '2026 / 2027',
    isCurrent: true,
    courses: [
      {
        id: 'COURSE-01',
        academicYearId: 'AY-2026-2027',
        name: 'الدورة الأولى',
        type: 'عادية',
        startDate: null,
        endDate: null,
        studyDays: ['الأحد', 'الإثنين', 'الأربعاء'],
        isActive: true,
      },
      {
        id: 'COURSE-02',
        academicYearId: 'AY-2026-2027',
        name: 'الدورة الثانية',
        type: 'عادية',
        startDate: null,
        endDate: null,
        studyDays: ['الأحد', 'الإثنين', 'الأربعاء'],
        isActive: false,
      },
      {
        id: 'COURSE-03',
        academicYearId: 'AY-2026-2027',
        name: 'الدورة الثالثة',
        type: 'عادية',
        startDate: null,
        endDate: null,
        studyDays: ['الأحد', 'الإثنين', 'الأربعاء'],
        isActive: false,
      },
    ],
  },
]

export const students: Student[] = [
  { id: '1', name: 'أحمد محمد', personalId: '123456789', grade: 'السادس ابتدائي', phone: '33123456', whatsapp: '33123456', paymentStatus: 'مدفوع بالكامل', amountDue: 1200, amountPaid: 1200, chronicDiseases: 'لا يوجد', notes: '' },
  { id: '2', name: 'فاطمة علي', personalId: '234567890', grade: 'الثالث ابتدائي', phone: '33987654', whatsapp: '33987654', paymentStatus: 'مدفوع جزئيًا', amountDue: 1200, amountPaid: 600, chronicDiseases: 'ربو', notes: 'تحتاج متابعة' },
  { id: '3', name: 'محمد حسن', personalId: '345678901', grade: 'الأول إعدادي', phone: '36012345', whatsapp: '36012345', paymentStatus: 'غير مدفوع', amountDue: 1200, amountPaid: 0, chronicDiseases: 'لا يوجد', notes: '' },
  { id: '4', name: 'نور أحمد', personalId: '456789012', grade: 'الثاني ثانوي', phone: '37765432', whatsapp: '37765432', paymentStatus: 'معفي', amountDue: 0, amountPaid: 0, chronicDiseases: 'لا يوجد', notes: 'إعفاء كامل' },
]

export type EnrollmentRequest = {
  id: string
  name: string
  grade: string
  guardian: string
  phone: string
  submittedAt: string
  status: 'قيد المراجعة' | 'مقبول' | 'مرفوض'
}

export const enrollmentRequests: EnrollmentRequest[] = [
  { id: 'REQ-2201', name: 'تالا عبدالعزيز السبيعي', grade: 'الصف الأول', guardian: 'عبدالعزيز السبيعي', phone: '٠٥٠١٢٣٤٥٦٧', submittedAt: '١٤ سبتمبر ٢٠٢٦', status: 'قيد المراجعة' },
  { id: 'REQ-2202', name: 'فيصل تركي العنزي', grade: 'الصف الثالث', guardian: 'تركي العنزي', phone: '٠٥٥٧٦٥٤٣٢١', submittedAt: '١٣ سبتمبر ٢٠٢٦', status: 'قيد المراجعة' },
  { id: 'REQ-2203', name: 'رهف سلطان القرني', grade: 'الصف الأول المتوسط', guardian: 'سلطان القرني', phone: '٠٥٣٩٨٧٦٥٤٣', submittedAt: '١٢ سبتمبر ٢٠٢٦', status: 'مقبول' },
  { id: 'REQ-2204', name: 'نواف بندر الشمري', grade: 'الصف الثاني', guardian: 'بندر الشمري', phone: '٠٥٦١٢٣٤٥٦٧', submittedAt: '١١ سبتمبر ٢٠٢٦', status: 'مرفوض' },
  { id: 'REQ-2205', name: 'ملاك راشد البقمي', grade: 'الصف الرابع', guardian: 'راشد البقمي', phone: '٠٥٠٩٨٧٦٥٤٣', submittedAt: '١٠ سبتمبر ٢٠٢٦', status: 'قيد المراجعة' },
]

export type Teacher = {
  id: string
  name: string
  subject: string
  classes: number
  students: number
  status: 'دوام كامل' | 'دوام جزئي'
}

export const teachers: Teacher[] = [
  { id: 'TCH-301', name: 'أ. هند عبدالله الرشيد', subject: 'اللغة العربية', classes: 6, students: 168, status: 'دوام كامل' },
  { id: 'TCH-302', name: 'أ. ماجد سعيد الزهراني', subject: 'الرياضيات', classes: 5, students: 140, status: 'دوام كامل' },
  { id: 'TCH-303', name: 'أ. نورة فيصل العمري', subject: 'العلوم', classes: 4, students: 112, status: 'دوام كامل' },
  { id: 'TCH-304', name: 'أ. سامي عبدالرحمن الدوسري', subject: 'اللغة الإنجليزية', classes: 5, students: 135, status: 'دوام جزئي' },
  { id: 'TCH-305', name: 'أ. ريم خالد المالكي', subject: 'الدراسات الاجتماعية', classes: 3, students: 84, status: 'دوام جزئي' },
  { id: 'TCH-306', name: 'أ. طلال ناصر الحارثي', subject: 'التربية البدنية', classes: 8, students: 224, status: 'دوام كامل' },
]

export type Payment = {
  id: string
  student: string
  item: string
  amount: string
  date: string
  method: string
  status: 'مدفوع' | 'معلّق' | 'متأخر'
}

export const payments: Payment[] = [
  { id: 'INV-9001', student: 'محمد القحطاني', item: 'رسوم الفصل الدراسي الأول', amount: '٦٬٥٠٠ ر.س', date: '١٤ سبتمبر ٢٠٢٦', method: 'تحويل بنكي', status: 'مدفوع' },
  { id: 'INV-9002', student: 'سارة الغامدي', item: 'رسوم النقل المدرسي', amount: '١٬٢٠٠ ر.س', date: '١٣ سبتمبر ٢٠٢٦', method: 'مدى', status: 'مدفوع' },
  { id: 'INV-9003', student: 'ريان العتيبي', item: 'رسوم الفصل الدراسي الأول', amount: '٦٬٥٠٠ ر.س', date: '١٠ سبتمبر ٢٠٢٦', method: '—', status: 'متأخر' },
  { id: 'INV-9004', student: 'لمى الدوسري', item: 'رسوم الأنشطة', amount: '٨٠٠ ر.س', date: '٠٩ سبتمبر ٢٠٢٦', method: 'بطاقة ائتمان', status: 'معلّق' },
  { id: 'INV-9005', student: 'يوسف الحربي', item: 'رسوم الكتب', amount: '٤٥٠ ر.س', date: '٠٨ سبتمبر ٢٠٢٦', method: 'مدى', status: 'مدفوع' },
  { id: 'INV-9006', student: 'دانة الزهراني', item: 'رسوم الفصل الدراسي الأول', amount: '٦٬٥٠٠ ر.س', date: '٠٧ سبتمبر ٢٠٢٦', method: 'تحويل بنكي', status: 'معلّق' },
]

export type Activity = {
  id: string
  text: string
  time: string
  type: 'student' | 'payment' | 'enrollment' | 'teacher'
}

export const recentActivity: Activity[] = [
  { id: 'a1', text: 'تم قبول طلب تسجيل الطالبة رهف القرني في الصف الأول المتوسط', time: 'قبل ١٠ دقائق', type: 'enrollment' },
  { id: 'a2', text: 'سدّد ولي أمر الطالب محمد القحطاني رسوم الفصل الدراسي الأول', time: 'قبل ٤٥ دقيقة', type: 'payment' },
  { id: 'a3', text: 'انضمت المعلمة نورة العمري إلى قسم العلوم', time: 'قبل ساعتين', type: 'teacher' },
  { id: 'a4', text: 'تم تحديث بيانات الطالبة دانة الزهراني', time: 'قبل ٣ ساعات', type: 'student' },
  { id: 'a5', text: 'وردت ٥ طلبات تسجيل جديدة بانتظار المراجعة', time: 'اليوم ٠٨:٣٠ ص', type: 'enrollment' },
]

export type PermissionAction = {
  key: string
  label: string
}

export type PermissionGroup = {
  key: string
  label: string
  actions: PermissionAction[]
}

export const permissionGroups: PermissionGroup[] = [
  {
    key: 'students',
    label: 'الطلاب',
    actions: [
      { key: 'students.view', label: 'عرض' },
      { key: 'students.create', label: 'إضافة' },
      { key: 'students.edit', label: 'تعديل' },
      { key: 'students.delete', label: 'حذف' },
    ],
  },
  {
    key: 'registration',
    label: 'التسجيل',
    actions: [
      { key: 'registration.view', label: 'عرض' },
      { key: 'registration.manage', label: 'إدارة' },
    ],
  },
  {
    key: 'teachers',
    label: 'المعلمون',
    actions: [
      { key: 'teachers.view', label: 'عرض' },
      { key: 'teachers.manage', label: 'إدارة' },
    ],
  },
  {
    key: 'payments',
    label: 'المدفوعات',
    actions: [
      { key: 'payments.view', label: 'عرض' },
      { key: 'payments.manage', label: 'إدارة' },
    ],
  },
  {
    key: 'attendance',
    label: 'الحضور',
    actions: [
      { key: 'attendance.view', label: 'عرض' },
      { key: 'attendance.manage', label: 'إدارة' },
    ],
  },
  {
    key: 'users',
    label: 'المستخدمون',
    actions: [
      { key: 'users.view', label: 'عرض' },
      { key: 'users.manage', label: 'إدارة' },
    ],
  },
  {
    key: 'settings',
    label: 'الإعدادات',
    actions: [{ key: 'settings.manage', label: 'إدارة' }],
  },
  {
    key: 'reports',
    label: 'التقارير',
    actions: [{ key: 'reports.view', label: 'عرض' }],
  },
]

export const allPermissionKeys: string[] = permissionGroups.flatMap((group) =>
  group.actions.map((action) => action.key),
)

export type Role = {
  key: string
  label: string
  description: string
  permissions: string[]
}

export const roles: Role[] = [
  {
    key: 'admin',
    label: 'مدير النظام',
    description: 'صلاحيات كاملة على جميع الأقسام',
    permissions: allPermissionKeys,
  },
  {
    key: 'admin2',
    label: 'مدير مساعد',
    description: 'صلاحيات إدارية دون إعدادات النظام',
    permissions: allPermissionKeys.filter(
      (key) => key !== 'settings.manage',
    ),
  },
  {
    key: 'supervisor',
    label: 'مشرف',
    description: 'متابعة الطلاب والمعلمين والحضور',
    permissions: [
      'students.view',
      'students.edit',
      'registration.view',
      'registration.manage',
      'teachers.view',
      'teachers.manage',
      'attendance.view',
      'attendance.manage',
      'reports.view',
    ],
  },
  {
    key: 'teacher',
    label: 'معلم',
    description: 'إدارة الحضور والاطلاع على الطلاب',
    permissions: [
      'students.view',
      'attendance.view',
      'attendance.manage',
      'reports.view',
    ],
  },
  {
    key: 'registrar',
    label: 'مسجّل',
    description: 'إدخال بيانات الطلاب ومعالجة التسجيل',
    permissions: [
      'students.view',
      'students.create',
      'students.edit',
      'registration.view',
      'registration.manage',
      'reports.view',
    ],
  },
]

export type User = {
  id: string
  username: string
  fullName: string
  roleKey: string
  department: string
  active: boolean
  permissions: string[]
}

function rolePermissions(key: string): string[] {
  return roles.find((role) => role.key === key)?.permissions ?? []
}

export const users: User[] = [
  {
    id: 'USR-01',
    username: 'a.alqahtani',
    fullName: 'عبدالله القحطاني',
    roleKey: 'admin',
    department: 'الإدارة العامة',
    active: true,
    permissions: rolePermissions('admin'),
  },
  {
    id: 'USR-02',
    username: 'h.alrashid',
    fullName: 'هند الرشيد',
    roleKey: 'admin2',
    department: 'الشؤون الأكاديمية',
    active: true,
    permissions: rolePermissions('admin2'),
  },
  {
    id: 'USR-03',
    username: 'm.alzahrani',
    fullName: 'ماجد الزهراني',
    roleKey: 'supervisor',
    department: 'الإشراف التربوي',
    active: true,
    permissions: rolePermissions('supervisor'),
  },
  {
    id: 'USR-04',
    username: 'n.alomari',
    fullName: 'نورة العمري',
    roleKey: 'teacher',
    department: 'قسم العلوم',
    active: true,
    permissions: rolePermissions('teacher'),
  },
  {
    id: 'USR-05',
    username: 's.aldosari',
    fullName: 'سامي الدوسري',
    roleKey: 'registrar',
    department: 'شؤون التسجيل',
    active: false,
    permissions: rolePermissions('registrar'),
  },
  {
    id: 'USR-06',
    username: 'r.almalki',
    fullName: 'ريم المالكي',
    roleKey: 'teacher',
    department: 'قسم اللغة العربية',
    active: true,
    permissions: rolePermissions('teacher'),
  },
]

export function roleLabel(key: string): string {
  return roles.find((role) => role.key === key)?.label ?? key
}

export type ChartPoint = {
  month: string
  students: number
}

export const enrollmentTrend: ChartPoint[] = [
  { month: 'يناير', students: 980 },
  { month: 'فبراير', students: 1010 },
  { month: 'مارس', students: 1035 },
  { month: 'أبريل', students: 1070 },
  { month: 'مايو', students: 1095 },
  { month: 'يونيو', students: 1120 },
  { month: 'يوليو', students: 1150 },
  { month: 'أغسطس', students: 1198 },
  { month: 'سبتمبر', students: 1248 },
]
