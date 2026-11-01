import { supabase } from '@/lib/supabase'

export async function createCommunicationMessageTemplate(input: {
  name: string
  content: string
}) {
  return supabase
    .from('communication_message_templates')
    .insert(input)
    .select('id, name, content, created_at, updated_at')
    .single()
}
