// Pravi jednu HTML stranu za probnu verziju u Claude artefaktu (ReComp): isti kod kao aplikacija,
// ali sa config.artifact = true (podaci u bazi artefakta, bez prijave i service workera).
// Pokretanje: node tools/build-artifact.mjs <izlaz.html>   (treba esbuild: npm i esbuild)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || join(ROOT, "artifact.html");
const require = createRequire(process.env.ESBUILD_FROM || join(ROOT, "package.json"));
const esbuild = require("esbuild");

const res = await esbuild.build({ entryPoints: [join(ROOT, "js/app.js")], bundle: true, format: "iife", target: "es2019", charset: "utf8", write: false, legalComments: "none" });
let js = res.outputFiles[0].text;
if (/<\/script/i.test(js)) js = js.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(join(ROOT, "styles.css"), "utf8");
const theme = readFileSync(join(ROOT, "js/theme.js"), "utf8");
const cfg = { appName: "ReKomp", artifact: true, appUrl: "https://rekomp.me/" };

const html = `<title>ReComp</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#141D26">
<meta name="color-scheme" content="dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap">
<style>
${css}
</style>
<script>
${theme}
</script>
<div id="app"><main class="wrap"><p class="muted">Učitavam…</p></main></div>
<div id="toast" role="status" hidden></div>
<noscript><p style="padding:16px">Uključi JavaScript.</p></noscript>
<script>window.REKOMP_CONFIG = ${JSON.stringify(cfg)};</script>
<script>
${js}
</script>
`;
writeFileSync(out, html);
console.log("ok", out, Math.round(html.length / 1024) + " KB");
