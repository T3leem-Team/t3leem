import {
  LayoutDashboard,
  ShieldCheck,
  Eye,
  ClipboardList,
  GraduationCap,
  Users,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  description: string
}

export const navItems: NavItem[] = [
  {
    title: 'لوحة المعلومات',
    href: '/',
    icon: LayoutDashboard,
    description: 'نظرة عامة على أداء المدرسة',
  },
  {
    title: 'لوحة التحكم',
    href: '/settings',
    icon: ShieldCheck,
    description: 'إدارة إعدادات النظام والصلاحيات',
  },
  {
    title: 'الإشراف',
    href: '/supervision',
    icon: Eye,
    description: 'ممارسة ومتابعة أعمال الإشراف',
  },
  {
    title: 'طلبات التسجيل',
    href: '/enrollment',
    icon: ClipboardList,
    description: 'مراجعة طلبات الالتحاق الجديدة',
  },
  {
    title: 'الطلاب',
    href: '/students',
    icon: GraduationCap,
    description: 'إدارة بيانات وسجلات الطلاب',
  },
  {
    title: 'المعلمون',
    href: '/teachers',
    icon: Users,
    description: 'إدارة هيئة التدريس',
  },
  {
    title: 'المدفوعات',
    href: '/payments',
    icon: CreditCard,
    description: 'متابعة الرسوم والمدفوعات',
  },
]