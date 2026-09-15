import {
  LayoutDashboard,
  GraduationCap,
  ClipboardList,
  Users,
  CreditCard,
  Settings,
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
    title: 'لوحة التحكم',
    href: '/',
    icon: LayoutDashboard,
    description: 'نظرة عامة على أداء المدرسة',
  },
  {
    title: 'الطلاب',
    href: '/students',
    icon: GraduationCap,
    description: 'إدارة بيانات وسجلات الطلاب',
  },
  {
    title: 'طلبات التسجيل',
    href: '/enrollment',
    icon: ClipboardList,
    description: 'مراجعة طلبات الالتحاق الجديدة',
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
  {
    title: 'الإدارة والإعدادات',
    href: '/settings',
    icon: Settings,
    description: 'ضبط إعدادات النظام والصلاحيات',
  },
]
