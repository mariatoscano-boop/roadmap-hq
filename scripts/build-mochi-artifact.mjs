// Inlines the Mochi build into single pages.
// Usage: npm run mochi:build
//   → mochi/dist/mochi.html             (page body, for publishing as a claude.ai Artifact)
//   → mochi/dist/mochi-standalone.html  (full document: open it directly in a browser)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = 'mochi/dist';
const assets = readdirSync(`${dir}/assets`);
const read = (ext) => readFileSync(`${dir}/assets/${assets.find((f) => f.endsWith(ext))}`, 'utf8');
const css = read('.css');
const js = read('.js').replace(/<\/script/gi, '<\\/script');

const fonts = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&family=Instrument+Serif:ital@1&family=M+PLUS+Rounded+1c:wght@400;500;700&display=swap';
const html = `<title>Mochi</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${fonts}" rel="stylesheet" />
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(`${dir}/mochi.html`, html);
console.log(`${dir}/mochi.html ${(html.length / 1024).toFixed(0)} KB`);

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</head>
<body>
${html}</body>
</html>
`;
writeFileSync(`${dir}/mochi-standalone.html`, standalone);
console.log(`${dir}/mochi-standalone.html ${(standalone.length / 1024).toFixed(0)} KB`);
