export type Stat = {
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
  hint: string
}

export const dashboardStats: Stat[] = [
  {
    label: 'إجمالي الطلاب',
    value: '١٬٢٤٨',
    change: '٤٫٢٪+',
    trend: 'up',
    hint: 'مقارنة بالفصل السابق',
  },
  {
    label: 'المعلمون النشطون',
    value: '٨٦',
    change: '٢٫١٪+',
    trend: 'up',
    hint: 'مقارنة بالشهر الماضي',
  },
  {
    label: 'طلبات تسجيل معلّقة',
    value: '٣٤',
    change: '١٢٪−',
    trend: 'down',
    hint: 'بانتظار المراجعة',
  },
  {
    label: 'إيرادات الشهر',
    value: '٣٢٤٬٥٠٠ ر.س',
    change: '٨٫٧٪+',
    trend: 'up',
    hint: 'الرسوم المحصّلة',
  },
]

export type Student = {
  id: string
  name: string
  grade: string
  section: string
  guardian: string
  status: 'منتظم' | 'متأخر' | 'موقوف'
}

export const students: Student[] = [
  { id: 'STD-1042', name: 'محمد بن عبدالله القحطاني', grade: 'الصف السادس', section: 'أ', guardian: 'عبدالله القحطاني', status: 'منتظم' },
  { id: 'STD-1043', name: 'سارة أحمد الغامدي', grade: 'الصف الخامس', section: 'ب', guardian: 'أحمد الغامدي', status: 'منتظم' },
  { id: 'STD-1044', name: 'ريان خالد العتيبي', grade: 'الصف الثالث', section: 'أ', guardian: 'خالد العتيبي', status: 'متأخر' },
  { id: 'STD-1045', name: 'لمى فهد الدوسري', grade: 'الصف الأول الثانوي', section: 'ج', guardian: 'فهد الدوسري', status: 'منتظم' },
  { id: 'STD-1046', name: 'عبدالرحمن سعد المطيري', grade: 'الصف الرابع', section: 'ب', guardian: 'سعد المطيري', status: 'موقوف' },
  { id: 'STD-1047', name: 'جود ماجد الشهري', grade: 'الصف الثاني', section: 'أ', guardian: 'ماجد الشهري', status: 'منتظم' },
  { id: 'STD-1048', name: 'يوسف نايف الحربي', grade: 'الصف السادس', section: 'ج', guardian: 'نايف الحربي', status: 'متأخر' },
  { id: 'STD-1049', name: 'دانة وليد الزهراني', grade: 'الصف الخامس', section: 'أ', guardian: 'وليد الزهراني', status: 'منتظم' },
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

export type ChartPoint = { month: string; students: number }

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
