import { createBrowserRouter, Navigate } from "react-router-dom";

import { BootstrapPage } from "@/features/auth/pages/bootstrap";
import { LoginPage } from "@/features/auth/pages/login";
import { ExecutionDetailPage } from "@/features/executions/pages/detail";
import { ExecutionsListPage } from "@/features/executions/pages/list";
import { IntegrationFormPage } from "@/features/integrations/pages/form";
import { IntegrationsListPage } from "@/features/integrations/pages/list";

import { NotFoundPage } from "./not-found";
import { ProtectedRoute } from "./protected-route";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/bootstrap", element: <BootstrapPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <Navigate to="/integrations" replace /> },
      { path: "/integrations", element: <IntegrationsListPage /> },
      { path: "/integrations/:id/executions", element: <ExecutionsListPage /> },
      { path: "/executions/:id", element: <ExecutionDetailPage /> },
      {
        element: <ProtectedRoute roles={["ADMIN"]} />,
        children: [
          { path: "/integrations/new", element: <IntegrationFormPage /> },
          { path: "/integrations/:id/edit", element: <IntegrationFormPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
