import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getPublicSupabaseConfig, hasMembersAccess } from "@/lib/server/auth"

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
  const isAccessDeniedPage = request.nextUrl.pathname === "/access-denied"
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/")
  const hasAccess = Boolean(data.user && hasMembersAccess(data.user))

  if (isApiRequest && !data.user) {
    return NextResponse.json(
      { error: "Sua sessão expirou. Entre novamente para continuar." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  }

  if (isApiRequest && !hasAccess) {
    return NextResponse.json(
      { error: "Sua conta não tem permissão para acessar o cadastro." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    )
  }

  if (isLoginPage && data.user) {
    return NextResponse.redirect(new URL(hasAccess ? "/" : "/access-denied", request.url))
  }

  if (isAccessDeniedPage) {
    if (!data.user) return NextResponse.redirect(new URL("/login", request.url))
    if (hasAccess) return NextResponse.redirect(new URL("/", request.url))
    return response
  }

  if (!data.user && !isLoginPage) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (data.user && !hasAccess) {
    return NextResponse.redirect(new URL("/access-denied", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
