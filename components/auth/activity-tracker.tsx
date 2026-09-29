'use client'

import { useEffect, useRef } from 'react'

const ACTIVITY_THROTTLE_MS = 60 * 1000

export function ActivityTracker() {
  const lastSentRef = useRef(0)

  useEffect(() => {
    let stopped = false

    async function sendActivity() {
      if (stopped) {
        return
      }

      const now = Date.now()

      if (
        now - lastSentRef.current <
        ACTIVITY_THROTTLE_MS
      ) {
        return
      }

      try {
        const response =
          await fetch(
            '/api/auth/activity',
            {
              method: 'POST',
              credentials: 'include',
              cache: 'no-store',
            },
          )

        if (stopped) {
          return
        }

        if (response.status === 401) {
          window.location.replace(
            '/login',
          )
          return
        }

        if (response.ok) {
          lastSentRef.current = Date.now()
        }
      } catch {
        // لا نسجل خروج بسبب مشكلة شبكة مؤقتة.
        // لن يتم تحديث آخر إرسال إلا بعد نجاح الطلب.
      }
    }

    const handleActivity = () => {
      void sendActivity()
    }

    const events = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
    ]

    events.forEach((event) => {
      window.addEventListener(
        event,
        handleActivity,
        { passive: true },
      )
    })

    return () => {
      stopped = true

      events.forEach((event) => {
        window.removeEventListener(
          event,
          handleActivity,
        )
      })
    }
  }, [])

  return null
}