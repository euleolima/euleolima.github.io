// gerar-icones.mjs
// Execute: node gerar-icones.mjs
// Gera os ícones PNG necessários para o PWA a partir de SVG

import { writeFileSync, mkdirSync } from 'fs'

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0F0C0A"/>
  <text x="50%" y="58%" font-size="${size * 0.55}" text-anchor="middle" dominant-baseline="middle" fill="#FF9D42">🔥</text>
</svg>`

mkdirSync('public/icons', { recursive: true })

writeFileSync('public/icons/icon-192.svg', svg(192))
writeFileSync('public/icons/icon-512.svg', svg(512))

console.log(`
✅ SVGs gerados em public/icons/

Para converter pra PNG (escolha um):

  Opção A — Figma / Canva:
    Abra o SVG, exporte como PNG 192x192 e 512x512

  Opção B — online (rápido):
    Acesse https://cloudconvert.com/svg-to-png
    Converta icon-192.svg → icon-192.png
    Converta icon-512.svg → icon-512.png

  Opção C — se tiver ImageMagick instalado:
    magick icon-192.svg icon-192.png
    magick icon-512.svg icon-512.png

Coloque os PNGs em public/icons/ antes de fazer o build.
`)
