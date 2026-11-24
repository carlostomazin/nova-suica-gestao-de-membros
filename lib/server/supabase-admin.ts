import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | undefined

export function getSupabaseAdmin() {
  if (adminClient) return adminClient

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url || !serviceKey) {
    throw new Error("A integração Supabase não está configurada no servidor.")
  }

  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return adminClient
}
