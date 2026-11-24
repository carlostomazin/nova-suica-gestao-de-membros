import type { Metadata } from "next"
import { AccessDenied } from "@/components/layout/access-denied"

export const metadata: Metadata = {
  title: "Acesso não autorizado | Membros Nova Suíça",
  robots: { index: false, follow: false },
}

export default function AccessDeniedPage() {
  return <AccessDenied />
}
