"use client";

/**
 * Send image URLs to the Service Worker for background caching.
 * Called after a grid of covers loads so subsequent visits are instant.
 */
export function prefetchImages(urls: (string | undefined | null)[]): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;

  const valid = urls.filter((u): u is string => typeof u === "string" && u.startsWith("http"));
  if (valid.length === 0) return;

  // Batch in chunks of 50 to avoid overwhelming the SW
  for (let i = 0; i < valid.length; i += 50) {
    navigator.serviceWorker.controller.postMessage({
      type: "PREFETCH_IMAGES",
      urls: valid.slice(i, i + 50),
    });
  }
}
