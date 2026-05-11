/**
 * Reliable navigation for Capacitor static export.
 * Adds trailing slash for static routes so Capacitor serves the correct
 * index.html file directly instead of falling back to 404.html.
 */
function addTrailingSlash(path: string): string {
  if (path.includes("?")) {
    const [base, query] = path.split("?", 2);
    if (!base.endsWith("/")) return `${base}/?${query}`;
    return path;
  }
  if (!path.endsWith("/")) return path + "/";
  return path;
}

export function nav(path: string): void {
  window.location.href = addTrailingSlash(path);
}

export function navReplace(path: string): void {
  window.location.replace(addTrailingSlash(path));
}

export function navBack(): void {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.replace("/");
  }
}
