import { useCallback, useEffect, useState } from "react";

import { applyTheme, resolveInitialTheme, type Theme } from "@/shared/lib/theme";

/** Usado só pelo menu do usuário — não há segundo consumidor, então não precisa de contexto. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
