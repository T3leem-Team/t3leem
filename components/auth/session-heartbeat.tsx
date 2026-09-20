'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const HEARTBEAT_INTERVAL = 30_000
const ACTIVITY_INTERVAL = 60_000

export function SessionHeartbeat() {
  const router = useRouter()

  useEffect(() => {
    let stopped = false

    let lastActivitySentAt = 0

    const sendActivity = async () => {
      if (stopped) {
        return
      }

      const now = Date.now()

      if (
        now - lastActivitySentAt <
        ACTIVITY_INTERVAL
      ) {
        return
      }

      lastActivitySentAt = now

      try {
        const response =
          await fetch(
            '/api/auth/activity',
            {
              method: 'POST',
              cache: 'no-store',
            },
          )

        if (
          !response.ok &&
          !stopped
        ) {
          await fetch(
            '/api/auth/force-logout',
            {
              method: 'POST',
              cache: 'no-store',
            },
          )

          router.replace('/login')
          router.refresh()
        }
      } catch {
        // لا نخرج المستخدم بسبب انقطاع مؤقت بالإنترنت.
      }
    }

    const checkSession =
      async () => {
        try {
          const response =
            await fetch(
              '/api/auth/heartbeat',
              {
                method: 'POST',
                cache: 'no-store',
              },
            )

          if (
            !response.ok &&
            !stopped
          ) {
            await fetch(
              '/api/auth/force-logout',
              {
                method: 'POST',
                cache: 'no-store',
              },
            )

            router.replace('/login')
            router.refresh()
          }
        } catch {
          // لا نخرج المستخدم بسبب انقطاع مؤقت بالإنترنت.
        }
      }

    const handleActivity = () => {
      void sendActivity()
    }

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    activityEvents.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleActivity,
          {
            passive: true,
          },
        )
      },
    )

    checkSession()

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

      activityEvents.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleActivity,
          )
        },
      )
    }
  }, [router])

  return null
}