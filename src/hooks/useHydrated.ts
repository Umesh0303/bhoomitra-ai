import { useEffect, useState } from "react";

/** True after hydration — gate all browser-only voice UI behind this. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
