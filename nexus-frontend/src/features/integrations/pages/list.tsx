import { Button } from "@/components/ui/button";

import { useAuth } from "@/features/auth/use-auth";

export function IntegrationsListPage() {
  const { user, logout } = useAuth();

  return (
    <main className="p-6">
      <p>
        Sessão: {user?.email} ({user?.role})
      </p>
      <Button type="button" onClick={() => void logout()}>
        Sair
      </Button>
    </main>
  );
}
