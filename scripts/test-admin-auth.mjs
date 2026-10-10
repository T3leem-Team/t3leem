import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = readFileSync('.env.local', 'utf8')
const getEnv = (name) => {
  const match = env.match(new RegExp(`^${name}=(.*)$`, 'm'))
  return match?.[1]?.trim().replace(/^["']|["']$/g, '')
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const key = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

if (!url || !key) {
  console.error('Missing Supabase URL or publishable key in .env.local')
  process.exit(1)
}

const email = 'r3dha.ahmed@gmail.com'
const password = process.env.ADMIN_TEST_PASSWORD

if (!password) {
  console.error('Set ADMIN_TEST_PASSWORD in your terminal before running.')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (error) {
  console.log('AUTH_TEST: FAILED')
  console.log('Status:', error.status)
  console.log('Code:', error.code ?? 'not provided')
  console.log('Message:', error.message)
} else {
  console.log('AUTH_TEST: SUCCESS')
  console.log('User ID:', data.user.id)
  await supabase.auth.signOut()
}
