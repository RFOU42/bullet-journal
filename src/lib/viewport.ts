import { useEffect, useState } from "react";

const QUERY = "(max-width: 720px)";

function readMatch(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks the same breakpoint the stylesheet uses to collapse the sidebar, so
 * the mobile shell (7a/10) and the desktop shell (6a) switch at the same
 * width instead of drifting apart under resize.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(readMatch);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
