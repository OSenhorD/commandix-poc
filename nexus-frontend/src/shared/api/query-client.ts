import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./errors";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Erro da API (4xx) nunca é retentado; falha de rede tenta mais uma vez.
        retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  });
}
