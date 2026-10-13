// Builds a single self-contained page (CSS + JS inlined) for publishing as a claude.ai Artifact.
// Usage: npm run build && node scripts/build-artifact.mjs  →  dist/product-hq.html
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const assets = readdirSync('dist/assets');
const read = (ext) => readFileSync(`dist/assets/${assets.find((f) => f.endsWith(ext))}`, 'utf8');
const css = read('.css');
const js = read('.js').replace(/<\/script/gi, '<\\/script');

const html = `<title>Product HQ</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync('dist/product-hq.html', html);
console.log(`dist/product-hq.html ${(html.length / 1024).toFixed(0)} KB`);
