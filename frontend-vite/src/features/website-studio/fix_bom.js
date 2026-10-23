
const fs = require('fs');
const content = fs.readFileSync('C:/Users/Usuario/Desktop/Veloire-12-2026/agenda-app-copia/agenda-app/frontend-vite/src/features/website-studio/WebsiteRenderer.tsx', 'utf8');
// Remove BOM if present
const cleanContent = content.replace(/^\uFEFF/, '');
fs.writeFileSync('C:/Users/Usuario/Desktop/Veloire-12-2026/agenda-app-copia/agenda-app/frontend-vite/src/features/website-studio/WebsiteRenderer.tsx.new', cleanContent, 'utf8');
console.log('Done');

