'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const HEARTBEAT_INTERVAL = 30_000

export function SessionHeartbeat() {
  const router = useRouter()

  useEffect(() => {
    let stopped = false

    const checkSession = async () => {
      try {
        const response = await fetch(
          '/api/auth/heartbeat',
          {
            method: 'POST',
            cache: 'no-store',
          },
        )

        if (!response.ok && !stopped) {
          await fetch('/api/auth/force-logout', {
            method: 'POST',
            cache: 'no-store',
          })

          router.replace('/login')
          router.refresh()
        }
      } catch {
        // لا نخرج المستخدم بسبب انقطاع مؤقت بالإنترنت.
      }
    }

    checkSession()

    const interval = window.setInterval(
      checkSession,
      HEARTBEAT_INTERVAL,
    )

    return () => {
      stopped = true
      window.clearInterval(interval)
    }
  }, [router])

  return null
}