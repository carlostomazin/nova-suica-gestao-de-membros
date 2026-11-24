"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"

type LoginFormProps = { nextPath: string }

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrorMessage("")

    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        const message = error.code === "email_not_confirmed"
          ? "Confirme seu e-mail antes de entrar."
          : "E-mail ou senha inválidos. Verifique os dados e tente novamente."
        setErrorMessage(message)
        return
      }

      toast.success("Acesso autorizado.")
      router.replace(nextPath)
      router.refresh()
    } catch {
      setErrorMessage("Não foi possível entrar agora. Tente novamente em instantes.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nome@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={pending}
          />
        </Field>
      </FieldGroup>

      {errorMessage ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
        Entrar no sistema
        {!pending ? <ArrowRight data-icon="inline-end" /> : null}
      </Button>

      <div className="flex items-start gap-3 rounded-xl bg-muted/70 p-3.5">
        <ShieldCheck className="mt-0.5 text-primary" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Acesso restrito</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Entre com uma conta autorizada no Supabase. O cadastro de contas não é público.
          </p>
        </div>
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <LockKeyhole aria-hidden="true" /> Seus dados são transmitidos com segurança.
      </p>
    </form>
  )
}
