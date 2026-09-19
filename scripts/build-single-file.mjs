// Folds `npm run build` output into one self-contained HTML file, for hosts
// that serve a single page (a published Artifact) rather than a directory.
// Usage: npm run build && node scripts/build-single-file.mjs
//
// Since the app now talks to Supabase, this only fully works on a host whose
// CSP allows fetching *.supabase.co — a published Claude Artifact's sandbox
// does not (only a short list of script/font CDNs is reachable there), so the
// bundle it produces will load but auth/data calls will fail silently. Fine
// for a static preview of the UI; not a substitute for a real deploy.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "dist/assets");
const files = readdirSync(dir);
const js = readFileSync(`${dir}/${files.find(f => f.endsWith(".js"))}`, "utf8");
const css = readFileSync(`${dir}/${files.find(f => f.endsWith(".css"))}`, "utf8");

// A literal </script> anywhere in the bundle would close the inline tag early.
const safeJs = js.replaceAll("</script", "<\\/script");

const out = `<title>Carnet bullet</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Caveat:wght@500;600&family=Work+Sans:wght@400;500;600&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;

writeFileSync(join(root, "artifact.html"), out);
console.log("written", (out.length / 1024).toFixed(0) + "KB", "| script-escape hits:", js.split("</script").length - 1);
