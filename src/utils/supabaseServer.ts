import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 서버 액션/Route Handler에서만 import할 것 (service role key 노출 금지)
let client: SupabaseClient | null = null

export const getSupabaseServer = (): SupabaseClient => {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다.'
    )
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
