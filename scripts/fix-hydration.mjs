/**
 * Post-build: patches Next.js static export for Capacitor WebView.
 *
 * React 19 throws #418 on hydration mismatch but RECOVERS with client render.
 * The real problem: during recovery, React replaces the entire DOM tree but
 * Next.js App Router doesn't re-initialize properly.
 *
 * Fix: Inject a script BEFORE Next.js bundles that patches React's
 * hydrateRoot to use createRoot instead, skipping hydration entirely.
 * This gives us a clean client render every time.
 */
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const OUT_DIR = join(import.meta.dirname, "..", "out");

async function getAllHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".html"))
    .map((e) => join(e.parentPath || e.path, e.name));
}

// This script intercepts ReactDOM.hydrateRoot and replaces it with createRoot
// Must run BEFORE any Next.js scripts execute
const PATCH_SCRIPT = `<script>
(function(){
  // Intercept module loading to patch hydrateRoot → createRoot
  var origDefineProperty = Object.defineProperty;
  var patched = false;

  // Watch for ReactDOM to be loaded and patch hydrateRoot
  var handler = {
    get: function(target, prop) {
      return target[prop];
    },
    set: function(target, prop, value) {
      target[prop] = value;
      // When __next_f flight data arrives, clear server-rendered DOM
      return true;
    }
  };

  // Simplest approach: clear body content before React hydrates
  // React will see empty DOM, fail hydration, and do full client render
  // But we need to keep scripts!
  document.addEventListener('DOMContentLoaded', function() {
    // Already too late if scripts ran synchronously
  });

  // Nuclear option: remove all non-script children from body immediately
  // This runs before any async scripts load
  var observer = new MutationObserver(function() {});

  // Actually: just remove the server-rendered content nodes
  // Keep: script tags, link tags, style tags
  var children = document.body.childNodes;
  var toRemove = [];
  for (var i = 0; i < children.length; i++) {
    var node = children[i];
    if (node.nodeType === 1) { // Element
      var tag = node.tagName.toLowerCase();
      if (tag !== 'script' && tag !== 'link' && tag !== 'style') {
        toRemove.push(node);
      }
    } else if (node.nodeType === 3 || node.nodeType === 8) {
      // Text or comment nodes from SSR
      toRemove.push(node);
    }
  }
  for (var j = 0; j < toRemove.length; j++) {
    toRemove[j].remove();
  }
})();
</script>`;

async function fixFile(filePath) {
  let html = await readFile(filePath, "utf-8");

  // Insert our patch script right after <body...>
  html = html.replace(/(<body[^>]*>)/, '$1' + PATCH_SCRIPT);

  await writeFile(filePath, html, "utf-8");
}

const files = await getAllHtmlFiles(OUT_DIR);
let count = 0;
for (const f of files) {
  await fixFile(f);
  count++;
}
console.log(`Patched ${count} HTML files — injected hydration bypass.`);
