
import 'server-only'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null

function getMissingEnvironmentError() {
  return {
    data: null,
    error: new Error(
      'Supabase server environment variables are missing',
    ),
  }
}

export async function loadPrimaryAdminProfile(
  userId: string,
) {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('user_profiles')
    .select(`
      id,
      auth_user_id,
      username,
      full_name,
      role,
      is_active
    `)
    .eq('auth_user_id', userId)
    .maybeSingle()
}

export async function loadSystemElements() {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('system_elements')
    .select(`
      id,
      element_key,
      element_name,
      description,
      section_name,
      is_active,
      created_at,
      updated_at
    `)
    .order('section_name', {
      ascending: true,
    })
    .order('element_name', {
      ascending: true,
    })
}

export async function loadActiveSystemUsers() {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('user_profiles')
    .select(`
      id,
      username,
      full_name,
      role,
      department,
      is_active
    `)
    .eq('is_active', true)
    .order('role', {
      ascending: true,
    })
    .order('full_name', {
      ascending: true,
    })
}

export async function loadSystemElementAssignments() {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('system_element_users')
    .select(`
      id,
      element_id,
      user_profile_id,
      created_at
    `)
}

export async function loadSystemElementById(
  elementId: string,
) {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('system_elements')
    .select('id, element_key, is_active')
    .eq('id', elementId)
    .maybeSingle()
}

export async function loadSystemElementUserById(
  userProfileId: string,
) {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('user_profiles')
    .select(`
      id,
      username,
      full_name,
      role,
      is_active
    `)
    .eq('id', userProfileId)
    .maybeSingle()
}

export async function upsertSystemElementAssignment(
  elementId: string,
  userProfileId: string,
) {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('system_element_users')
    .upsert(
      {
        element_id: elementId,
        user_profile_id: userProfileId,
      },
      {
        onConflict: 'element_id,user_profile_id',
      },
    )
    .select(`
      id,
      element_id,
      user_profile_id,
      created_at
    `)
    .single()
}

export async function loadSystemElementUserForDelete(
  userProfileId: string,
) {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('user_profiles')
    .select('id, username')
    .eq('id', userProfileId)
    .maybeSingle()
}

export async function deleteSystemElementAssignment(
  elementId: string,
  userProfileId: string,
) {
  if (!supabaseAdmin) return getMissingEnvironmentError()

  return await supabaseAdmin
    .from('system_element_users')
    .delete()
    .eq('element_id', elementId)
    .eq('user_profile_id', userProfileId)
}
