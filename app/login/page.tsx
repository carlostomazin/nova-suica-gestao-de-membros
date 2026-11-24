import type { Metadata } from "next"
import { ArrowUpRight, UsersRound } from "lucide-react"
import { LoginForm } from "@/app/login/login-form"

export const metadata: Metadata = {
  title: "Entrar | Membros Nova Suíça",
  description: "Acesso seguro ao cadastro de membros da Nova Suíça.",
  robots: { index: false, follow: false },
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const requestedPath = Array.isArray(params.next) ? params.next[0] : params.next
  const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/"

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="relative hidden overflow-hidden bg-navy px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/10">
            <UsersRound aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-wide">NOVA SUÍÇA</span>
        </div>
        <div className="relative z-10 max-w-xl pb-10">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
            Gestão de membros
          </p>
          <h1 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-tight">
            Cuidado com cada pessoa, em um só lugar.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/70">
            Um cadastro simples e organizado para acompanhar a comunidade da Nova Suíça.
          </p>
          <div className="mt-10 flex items-center gap-2 text-sm text-white/70">
            <span className="size-2 rounded-full bg-emerald-400" />
            Ambiente protegido por autenticação
            <ArrowUpRight aria-hidden="true" />
          </div>
        </div>
        <p className="text-xs text-white/50">Nova Suíça · Uso interno</p>
        <div className="pointer-events-none absolute -right-24 -top-24 size-[520px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-5 -top-5 size-[380px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-40 right-24 size-[420px] rounded-full bg-white/[0.04]" />
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-navy text-white">
              <UsersRound aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-navy">NOVA SUÍÇA</span>
          </div>
          <p className="text-sm font-medium text-primary">Bem-vindo de volta</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Entrar no cadastro</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Use suas credenciais para acessar a gestão de membros.
          </p>
          <div className="mt-8">
            <LoginForm nextPath={nextPath} />
          </div>
        </div>
      </section>
    </main>
  )
}
