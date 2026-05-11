"use client";

// ═══════════════════════════════════════════════════════════════
//  Capacitor Native HTTP Wrapper
//
//  When running as an installed APK, CapacitorHttp is already
//  configured to intercept ALL fetch() and XMLHttpRequest calls
//  and route them through Android's native OkHttp client.
//  This completely bypasses CORS, mixed-content blocking, and
//  WebView network restrictions.
//
//  We just need to:
//  1. Detect if we're in a native Capacitor context
//  2. Skip the /api/proxy wrapper for external URLs
//  3. Set proper headers so the IPTV server accepts the request
// ═══════════════════════════════════════════════════════════════

/**
 * Returns true when the app is running as a native Android/iOS APK.
 * False in browser (Vercel, Chrome, etc.)
 */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      typeof (window as any).Capacitor !== "undefined" &&
      (window as any).Capacitor.isNativePlatform() === true
    );
  } catch {
    return false;
  }
}

/**
 * Fetch JSON from an external IPTV URL.
 *
 * In NATIVE mode (APK): fetch directly — CapacitorHttp handles CORS natively.
 * In BROWSER mode (Vercel): route through /api/proxy to bypass CORS.
 */
export async function nativeFetch(url: string): Promise<Response> {
  if (isNative()) {
    // Direct fetch — CapacitorHttp intercepts this and uses OkHttp on Android
    return fetch(url, {
      headers: {
        "User-Agent": "VLC/3.0.20 LibVLC/3.0.20",
        "Accept": "application/json, */*",
      },
    });
  }
  // Browser: proxy through Vercel API route
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  return fetch(proxyUrl);
}

/**
 * Build a stream proxy URL.
 * In native APK: return the URL directly (no proxy needed).
 * In browser: route through /api/proxy.
 */
export function buildProxyUrl(url: string): string {
  if (typeof window === "undefined") return url;
  if (isNative()) return url; // Native HTTP handles everything
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) return url;
  } catch {}
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}
