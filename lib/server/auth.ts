import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) throw new Error("A autenticação Supabase não está configurada.")
  return { url, key }
}

export async function requireAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const { url, key } = getPublicSupabaseConfig()
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Cookie refresh is handled by proxy.ts when this runs in a Server Component.
          }
        },
      },
    })

    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      return Response.json(
        { error: "Sua sessão expirou. Entre novamente para continuar." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      )
    }

    return null
  } catch {
    return Response.json(
      { error: "Não foi possível validar sua sessão." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  }
}

export { getPublicSupabaseConfig }
