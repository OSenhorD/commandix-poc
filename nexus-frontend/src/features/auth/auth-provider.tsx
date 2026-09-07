import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { setUnauthorizedHandler } from "@/shared/api/client";
import { tokenStorage } from "@/shared/lib/storage";

import {
  bootstrap as bootstrapRequest,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  type BootstrapInput,
  type LoginInput,
} from "./api";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => tokenStorage.getAccess() !== null);

  const { data, isPending } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
  });

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setHasToken(false);
    queryClient.clear();
  }, [queryClient]);

  // O cliente HTTP derruba a sessão quando o refresh falha.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await loginRequest(input);
      tokenStorage.set(response.accessToken, response.refreshToken);
      setHasToken(true);
      queryClient.setQueryData(["auth", "me"], response.user);
    },
    [queryClient],
  );

  const bootstrap = useCallback(
    async (input: BootstrapInput) => {
      await bootstrapRequest(input);
      await login({
        email: input.adminEmail,
        password: input.adminPassword,
      });
    },
    [login],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefresh();
    try {
      if (refreshToken) await logoutRequest(refreshToken);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      isLoading: hasToken && isPending,
      login,
      bootstrap,
      logout,
    }),
    [data, hasToken, isPending, login, bootstrap, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
