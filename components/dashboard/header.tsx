'use client'

import { usePathname } from 'next/navigation'
import { Menu, Search, Bell } from 'lucide-react'

import { navItems } from '@/lib/nav'

function currentTitle(pathname: string) {
  const match = navItems.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
  )
  return match?.title ?? 'تعليم'
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="text-base font-semibold md:text-lg">
        {currentTitle(pathname)}
      </h1>

      <div className="relative mr-auto hidden md:block">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="بحث عن طالب، معلم، طلب..."
          className="h-9 w-64 rounded-lg border border-border bg-card pr-9 pl-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </div>

      <button
        type="button"
        className="relative mr-auto rounded-lg p-2 text-muted-foreground hover:bg-muted md:mr-0"
        aria-label="الإشعارات"
      >
        <Bell className="size-5" />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
      </button>

      <span
        className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        aria-hidden="true"
      >
        م أ
      </span>
    </header>
  )
}
