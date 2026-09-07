import { useCallback, useEffect, useState } from "react";

import { applyTheme, resolveInitialTheme, type Theme } from "@/shared/lib/theme";

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
