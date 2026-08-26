# Private Club — Panel CMS (Sveltia)

## Contexto del proyecto

Private Club es un sitio editorial de música construido con **Eleventy** (generador de sitios estáticos), desplegado en **Netlify** vía GitHub. Estética Windows 95 (escritorio teal, ventanas biseladas, acento neón magenta). Incluye una interacción de flip-card en las reseñas de álbumes.

Repo: `github.com/checodotcom/privateclub`

**Estado actual confirmado (revisado directo en el repo):**
- NO existe todavía ninguna carpeta `admin/` ni archivo `config.yml` — se parte de cero, no hay CMS instalado aún.
- Estructura real del proyecto:
  ```
  src/
    _layouts/base.njk    ← taskbar, sidebar, header
    _layouts/post.njk    ← layout de posts individuales
    posts/*.md           ← posts existentes
    posts/posts.njk      ← listado /posts/
    css/win95.css
    index.njk, about.njk, tags.njk
  .eleventy.js
  ```
- Frontmatter actual de un post:
  ```yaml
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
  ```
- Tags existentes en uso: `ambient`, `electronic`, `jazz`, `noise`, `post-punk`, `experimental`, `world` (más el tag técnico `posts` que Eleventy usa para la colección)
- Build: `npm run build` genera `_site/`. Deploy compatible con Netlify (publish dir `_site`), también GitHub Pages/Vercel.
- El sitio usará un CMS basado en Git para gestión de contenido — no hay backend tradicional ni base de datos: el panel escribirá archivos Markdown directo al repo vía commits, y eso disparará un build automático en Netlify.

## Objetivo de esta tarea

Configurar un panel de administración de contenido tipo WordPress simplificado, accesible en `/admin`, que permita:
- Ver y gestionar todos los posts (reseñas)
- Administrar categorías de forma estructurada
- Administrar etiquetas (tags) por post
- Subir imágenes desde una media library integrada
- Guardar posts como borrador antes de publicar (editorial workflow)

## Decisión: CMS — Sveltia CMS (definitivo)

Se usará **Sveltia CMS**, no Decap. Motivo principal: simplifica la autenticación sin depender de Netlify Identity (ver siguiente sección). Misma estructura de `config.yml` que Decap, así que la config es transferible si en algún momento se quisiera migrar.

## Decisión: Autenticación — SIN Netlify Identity

Netlify Identity + Git Gateway están en camino de deprecarse y no se usarán. En su lugar:

- **Backend de auth: GitHub OAuth directo** (`backend: name: github` en config.yml)
- Requiere registrar una OAuth App en GitHub Developer Settings (Authorization callback URL apuntando al dominio del sitio o al helper de auth)
- Sveltia trae su propio OAuth helper ya hosteado (revisar docs oficiales de Sveltia para la URL de auth endpoint vigente) — evita tener que desplegar una función serverless propia para el intercambio OAuth

## Decisión: Categorías separadas de Tags

Se agrega una categoría real, distinta de los tags de género musical que ya existen. Categoría = tipo de contenido editorial (ej. "Reseñas", "Selecciones" — alineado a las secciones planeadas del sitio). Tags = género musical (ambient, jazz, noise, etc., como ya existe hoy).

### Colección: posts
Campos: título, fecha, imagen de portada, cuerpo (markdown), slug automático desde título, `tags` (widget `list`, texto libre con sugerencias basadas en los tags ya en uso), `categoria` (widget `relation` apuntando a la colección de categorías)

### Colección: categorias
Colección separada con archivos individuales: nombre, descripción, color/acento (opcional). El campo `categoria` de cada post se conecta aquí vía `relation` para evitar inconsistencias de texto libre. Poblar inicialmente con al menos "Reseñas" y "Selecciones".

### Media library
Configurar carpeta de medios (`media_folder` / `public_folder`) para que las imágenes subidas desde el panel se guarden en el repo y sean servibles por Eleventy sin pasos manuales.

### Editorial workflow
Activar `publish_mode: editorial_workflow` en config.yml para tener estados de borrador → revisión → publicado, en vez de publicar directo a producción.

## Pasos de implementación

Se parte de cero — no hay admin/config.yml existente, no hay riesgo de sobreescribir configuración previa.

1. Crear carpeta `admin/` dentro de `src/` (para que Eleventy la copie a `_site/admin` en el build) con `index.html` cargando Sveltia CMS
2. Escribir `admin/config.yml` con:
   - Colección `posts` mapeada a `src/posts/*.md`, reflejando el frontmatter real ya en uso (title, date, tags, excerpt) y agregando campo de imagen de portada
   - Colección `categorias` nueva, con relation desde posts
3. Poblar la colección de categorías con las categorías iniciales ("Reseñas", "Selecciones")
4. Configurar `backend: github` sin Identity — registrar OAuth App en GitHub, apuntar al auth endpoint hosteado de Sveltia
5. Activar `publish_mode: editorial_workflow`
6. Probar flujo completo: login en `/admin`, crear post de prueba con tags y categoría, confirmar commit al repo y build automático en Netlify, confirmar que el post aparece en el sitio en vivo respetando el layout `post.njk` existente

## Criterio de éxito

- Puedo entrar a `panoramica.store/admin` (o el dominio de Private Club), loguearme con GitHub OAuth sin depender de Netlify Identity, crear/editar posts con tags y categoría desde una interfaz visual (Sveltia), y ver el cambio reflejado en el sitio publicado tras el build automático.
