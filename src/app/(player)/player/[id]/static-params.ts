// Server-side module — enables static export for Capacitor APK build.
// Capacitor serves index.html as SPA fallback for all unmatched routes.
export async function generateStaticParams() {
  return [];
}
