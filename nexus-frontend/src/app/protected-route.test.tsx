import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";
import { RoleGate } from "@/shared/components/role-gate";
import type { AuthUser } from "@/shared/types/api";

import { ProtectedRoute } from "./protected-route";

const admin: AuthUser = { id: "u1", email: "admin@acme.com", role: "ADMIN", tenantId: "t1" };
const viewer: AuthUser = { id: "u2", email: "viewer@acme.com", role: "VIEWER", tenantId: "t1" };

function authValue(user: AuthUser | null, isLoading = false): AuthContextValue {
  return {
    user,
    isLoading,
    login: () => Promise.resolve(),
    bootstrap: () => Promise.resolve(),
    logout: () => Promise.resolve(),
  };
}

function renderRoutes(user: AuthUser | null, initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <p>tela de login</p> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/integrations", element: <p>lista de integrações</p> },
          {
            element: <ProtectedRoute roles={["ADMIN"]} />,
            children: [{ path: "/integrations/new", element: <p>formulário</p> }],
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );

  return render(
    <AuthContext value={authValue(user)}>
      <RouterProvider router={router} />
    </AuthContext>,
  );
}

describe("ProtectedRoute", () => {
  it("manda para o login quem não está autenticado", () => {
    renderRoutes(null, "/integrations");
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("deixa o ADMIN entrar em rota restrita", () => {
    renderRoutes(admin, "/integrations/new");
    expect(screen.getByText("formulário")).toBeInTheDocument();
  });

  it("redireciona o VIEWER que tenta abrir rota de ADMIN", () => {
    renderRoutes(viewer, "/integrations/new");
    expect(screen.getByText("lista de integrações")).toBeInTheDocument();
    expect(screen.queryByText("formulário")).not.toBeInTheDocument();
  });
});

describe("RoleGate", () => {
  it("mostra a ação para o papel correspondente", () => {
    render(
      <AuthContext value={authValue(admin)}>
        <RoleGate role="ADMIN">
          <button type="button">Nova integração</button>
        </RoleGate>
      </AuthContext>,
    );
    expect(screen.getByRole("button", { name: "Nova integração" })).toBeInTheDocument();
  });

  it("oculta a ação para o VIEWER", () => {
    render(
      <AuthContext value={authValue(viewer)}>
        <RoleGate role="ADMIN">
          <button type="button">Nova integração</button>
        </RoleGate>
      </AuthContext>,
    );
    expect(screen.queryByRole("button", { name: "Nova integração" })).not.toBeInTheDocument();
  });
});
