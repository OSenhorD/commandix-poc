import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./errors";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  });
}
