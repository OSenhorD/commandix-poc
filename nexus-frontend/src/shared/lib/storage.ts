const ACCESS_TOKEN_KEY = "nexus.accessToken";
const REFRESH_TOKEN_KEY = "nexus.refreshToken";

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setAccess(accessToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },
  set(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
