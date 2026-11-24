import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getPublicSupabaseConfig } from "@/lib/server/auth"

export async function proxy(request: NextRequest) {
  const { url, key } = getPublicSupabaseConfig()
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data } = await supabase.auth.getUser()
  const isLoginPage = request.nextUrl.pathname === "/login"
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/")

  if (isLoginPage && data.user) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!data.user && isApiRequest) {
    return NextResponse.json(
      { error: "Sua sessão expirou. Entre novamente para continuar." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  }

  if (!data.user && !isLoginPage) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
