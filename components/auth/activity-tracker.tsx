'use client'

import { useEffect, useRef } from 'react'

import { clearAllCaches } from '@/lib/clear-all-caches'

const ACTIVITY_THROTTLE_MS = 60 * 1000
const ACTIVITY_START_DELAY_MS = 30 * 1000

export function ActivityTracker() {
  const lastSentRef = useRef(0)
  const requestInFlightRef = useRef(false)

  useEffect(() => {
    let stopped = false
    let started = false

    async function sendActivity() {
      if (
        stopped ||
        !started ||
        requestInFlightRef.current
      ) {
        return
      }

      const now = Date.now()

      if (
        now - lastSentRef.current <
        ACTIVITY_THROTTLE_MS
      ) {
        return
      }

      requestInFlightRef.current = true

      try {
        const response = await fetch(
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
          clearAllCaches()
          window.location.replace('/login')
          return
        }

        if (response.ok) {
          lastSentRef.current = Date.now()
        }
      } catch {
        // لا نسجل خروج المستخدم بسبب انقطاع مؤقت.
      } finally {
        requestInFlightRef.current = false
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
    ] as const

    events.forEach((event) => {
      window.addEventListener(
        event,
        handleActivity,
        { passive: true },
      )
    })

    const startTimer = window.setTimeout(() => {
      started = true
    }, ACTIVITY_START_DELAY_MS)

    return () => {
      stopped = true
      window.clearTimeout(startTimer)

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