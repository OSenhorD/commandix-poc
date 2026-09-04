export function maskAuthKey(
  authKey: string | null | undefined,
): string | null {
  if (authKey == null || authKey === '') {
    return null;
  }

  const lastHyphen = authKey.lastIndexOf('-');
  const suffix =
    lastHyphen >= 0 ? authKey.slice(lastHyphen + 1) : authKey.slice(-4);

  return `****-${suffix}`;
}
