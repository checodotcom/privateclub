# 🎵 Private Club — Music Blog

Blog personal de música con estética Windows 95, construido con [Eleventy (11ty)](https://11ty.dev).

## Estructura del proyecto

```
privateclub/
├── src/
│   ├── _layouts/
│   │   ├── base.njk       ← Layout principal (taskbar, sidebar, header)
│   │   └── post.njk       ← Layout para posts individuales
│   ├── posts/
│   │   ├── posts.njk      ← Página /posts/ (lista de todos)
│   │   └── *.md           ← Tus posts aquí
│   ├── css/
│   │   └── win95.css      ← Todos los estilos Windows 95
│   ├── index.njk          ← Homepage
│   ├── about.njk          ← Página About
│   └── tags.njk           ← Página de tags
├── .eleventy.js           ← Configuración de 11ty
└── package.json
```

## Instalación

```bash
npm install
```

## Comandos

```bash
npm run build   # Genera el sitio en ./_site/
npm start       # Servidor local en http://localhost:8080
```

## Escribir un nuevo post

Crea un archivo `.md` en `src/posts/`:

```markdown
---
layout: post.njk
title: "Nombre del álbum o tema"
date: 2024-12-01
tags:
  - posts
  - ambient
  - electronic
excerpt: "Descripción corta que aparece en la lista de posts."
---

Contenido del post aquí en Markdown...
```

### Tags disponibles
`ambient` · `electronic` · `jazz` · `noise` · `post-punk` · `experimental` · `world`

(Puedes agregar los que quieras — se crean automáticamente)

## Personalización

- **Sidebar "Now Playing"** → edita `src/_layouts/base.njk`, busca `np-track`
- **Marquee de arriba** → edita el texto en `base.njk`, busca `marquee-inner`
- **Color acento** (magenta neón) → en `win95.css`, busca `--accent`
- **Paleta** → todas las variables CSS están al inicio de `win95.css`

## Deploy

El output es estático (carpeta `_site/`). Compatible con:
- GitHub Pages
- Netlify (`npm run build`, publish dir: `_site`)
- Vercel
- Cualquier hosting estático
