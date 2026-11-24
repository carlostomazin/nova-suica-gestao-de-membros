"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"

export function AccessDenied() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    await getSupabaseBrowserClient().auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-primary">
          <LockKeyhole aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Acesso não autorizado</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sua conta está autenticada, mas não tem permissão para gerenciar o cadastro. Peça ao responsável pelo projeto para conceder acesso e entre novamente.
        </p>
        <Button type="button" className="mt-6" onClick={signOut} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
          Sair e trocar de conta
        </Button>
      </section>
    </main>
  )
}
