'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { clearAllCaches } from '@/lib/clear-all-caches'

const HEARTBEAT_INTERVAL = 30_000

export function SessionHeartbeat() {
  const router = useRouter()

  useEffect(() => {
    let stopped = false

    const checkSession = async () => {
      if (stopped) {
        return
      }

      try {
        const response =
          await fetch(
            '/api/auth/heartbeat',
            {
              method: 'POST',
              cache: 'no-store',
            },
          )

        if (stopped) {
          return
        }

        if (response.status === 401) {
          clearAllCaches()

          router.replace('/login')
          router.refresh()
          return
        }

        if (!response.ok) {
          // أخطاء مؤقتة في السيرفر/قاعدة البيانات
          // لا تعني انتهاء جلسة المستخدم.
          return
        }
      } catch {
        // لا نخرج المستخدم بسبب انقطاع مؤقت بالإنترنت.
      }
    }

    

    const heartbeatTimer =
      window.setInterval(
        checkSession,
        HEARTBEAT_INTERVAL,
      )

    return () => {
      stopped = true

      window.clearInterval(
        heartbeatTimer,
      )
    }
  }, [router])

  return null
}