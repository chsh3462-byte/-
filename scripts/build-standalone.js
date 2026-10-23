import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = name => readFile(path.join(root, "public", name), "utf8");
const [template, css, favicon, engine, art, app] = await Promise.all([
  source("index.html"), source("styles.css"), source("favicon.svg"),
  source("engine.js"), source("art.js"), source("app.js"),
]);
const bundle = [engine, art, app]
  .map(text => text.replace(/^import\s+[\s\S]*?\sfrom\s+["'][^"']+["'];\s*/gm, "")
    .replace(/^export\s+/gm, ""))
  .join("\n\n")
  .replace(/<\/script/gi, "<\\/script");
const html = template
  .replace('<html lang="ko">', '<html lang="ko" data-standalone>')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(favicon).toString("base64")}" />`)
  .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>\n${css}\n</style>`)
  .replace(/<script type="module"[^>]*><\/script>/, "")
  .replace("</body>", () => `<script>\n"use strict";\n(() => {\n${bundle}\n})();\n</script>\n</body>`)
  .replace(/[\t ]+$/gm, "");

await mkdir(path.join(root, "dist"), { recursive: true });
await writeFile(path.join(root, "public/play.html"), html);
await writeFile(path.join(root, "dist/HEXA-CROWN.html"), html);
await writeFile(path.join(root, "HEXA-CROWN.html"), html);
console.log(`Standalone game written (${Buffer.byteLength(html)} bytes): dist/HEXA-CROWN.html`);
