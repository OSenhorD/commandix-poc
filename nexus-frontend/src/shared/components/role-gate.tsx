import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/use-auth";
import type { Role } from "@/shared/types/api";

/** Oculta (não desabilita) ações que o papel atual não pode executar. */
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== role) return null;
  return <>{children}</>;
}
