
'use client'

import { useEffect, useRef } from 'react'
import { clearAllCaches } from '@/lib/clear-all-caches'

const HEARTBEAT_INTERVAL_MS = 120_000
const ACTIVITY_THROTTLE_MS = 60_000
const START_DELAY_MS = 30_000

type SessionRequestType = 'heartbeat' | 'activity'

export function SessionMonitor() {
  const lastActivitySentAtRef = useRef(0)
  const requestInFlightRef = useRef(false)

  useEffect(() => {
    let stopped = false
    let started = false
    let pendingActivity = false

    async function sendSessionRequest(type: SessionRequestType) {
      if (
        stopped ||
        !started ||
        document.visibilityState !== 'visible'
      ) {
        return
      }

      if (
        type === 'activity' &&
        Date.now() - lastActivitySentAtRef.current <
          ACTIVITY_THROTTLE_MS
      ) {
        return
      }

      if (requestInFlightRef.current) {
        if (type === 'activity') {
          pendingActivity = true
        }
        return
      }

      requestInFlightRef.current = true

      try {
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type }),
        })

        if (stopped) return

        if (response.status === 401) {
          clearAllCaches()
          window.location.replace('/login')
          return
        }

        // أخطاء الخادم أو الشبكة لا تعني وحدها انتهاء الجلسة.
        if (!response.ok) return

        if (type === 'activity') {
          lastActivitySentAtRef.current = Date.now()
        }
      } catch {
        // لا نخرج المستخدم بسبب انقطاع مؤقت بالإنترنت.
      } finally {
        requestInFlightRef.current = false

        if (pendingActivity && !stopped) {
          pendingActivity = false
          void sendSessionRequest('activity')
        }
      }
    }

    const handleActivity = () => {
      void sendSessionRequest('activity')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // إعادة فحص الجلسة عند الرجوع إلى التبويب.
        void sendSessionRequest('heartbeat')
      }
    }

    const events = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
    ] as const

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, {
        passive: true,
      })
    })

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    const startTimer = window.setTimeout(() => {
      started = true
    }, START_DELAY_MS)

    const heartbeatTimer = window.setInterval(() => {
      void sendSessionRequest('heartbeat')
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      stopped = true
      pendingActivity = false

      window.clearTimeout(startTimer)
      window.clearInterval(heartbeatTimer)

      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [])

  return null
}
