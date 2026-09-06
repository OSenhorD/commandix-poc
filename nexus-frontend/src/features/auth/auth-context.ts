import { createContext } from "react";

import type { AuthUser } from "@/shared/types/api";

import type { BootstrapInput, LoginInput } from "./api";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  bootstrap: (input: BootstrapInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
