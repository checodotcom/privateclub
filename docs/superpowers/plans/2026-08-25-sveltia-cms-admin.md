# Panel CMS Sveltia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Private Club a WordPress-style content panel at `/admin` (Sveltia CMS) so posts, tags, categories, and media can be managed from a UI that commits Markdown straight to the `privateclub` repo, with a draft → review → published editorial workflow.

**Architecture:** Sveltia CMS is a static single-page app (one `index.html` + one `config.yml`) served from `src/admin/` so Eleventy copies it verbatim into `_site/admin/`. It talks to GitHub directly (`backend: name: github`) and authenticates through **Netlify's built-in OAuth provider** (Site settings → Access control → OAuth) — not Netlify Identity, and not a hosted Sveltia auth helper (see Correction to CLAUDE.md below). Two Decap-style collections are defined: `posts` (existing `src/posts/*.md`, gains a cover-image field) and `categorias` (new folder of small YAML files under `src/_data/categorias/`, connected to posts via a `relation` field so category names stay consistent).

**Tech Stack:** Eleventy 2.x (static build, unchanged), Sveltia CMS (loaded from the `unpkg` CDN, no npm dependency), GitHub OAuth App + Netlify's OAuth provider (no serverless function to deploy), YAML/Markdown content files.

**Spec:** [CLAUDE.md](../../../CLAUDE.md)

## Correction to CLAUDE.md before implementing

CLAUDE.md's auth section says "Sveltia trae su propio OAuth helper ya hosteado." That is not accurate — **Sveltia CMS does not ship a publicly hosted OAuth helper.** Per the current official docs (sveltiacms.app/en/docs/backends/github), a GitHub backend needs one of:

1. **Netlify's built-in OAuth provider** — zero deployment. If `base_url`/`auth_endpoint` are left unset in `config.yml` and the site is a Netlify site, Sveltia uses `https://api.netlify.com` automatically, exactly like classic Decap/Netlify CMS did. You register one GitHub OAuth App with callback URL `https://api.netlify.com/auth/done`, paste its Client ID/Secret into Netlify's site settings, and you're done. This is **separate from Netlify Identity** — no Identity widget, no Git Gateway involved.
2. Self-host the `sveltia-cms-auth` Cloudflare Worker (extra infra to run and maintain).
3. A third-party OAuth proxy (unmaintained by the Sveltia team).

Since Private Club already deploys via Netlify, **option 1** satisfies the spec's goal ("evita tener que desplegar una función serverless propia") even better than what CLAUDE.md assumed, so this plan uses it and `config.yml`'s `backend:` block has no `base_url`/`auth_endpoint` keys.

## Global Constraints

- No Netlify Identity, no Git Gateway — auth is `backend: name: github` + Netlify's OAuth provider (see correction above).
- `publish_mode: editorial_workflow` must be set so posts move draft → review → published instead of publishing straight to `main`.
- `posts` collection maps to the real files at `src/posts/*.md` and must preserve the existing frontmatter shape (`layout`, `title`, `date`, `tags`, `excerpt`) — no renaming keys, no breaking already-published posts.
- `categorias` is a separate collection from `tags`; posts reference it through a `relation` field, never free text.
- Media uploads must land in `src/img` and be served at `/img/...` with zero extra Eleventy config (this already works: `.eleventy.js:2` already does `addPassthroughCopy("src/img")`).
- Repo is `checodotcom/privateclub`, default branch `main` (confirmed via `git remote -v` / `git status`).

---

## File Structure

- Create: `src/admin/index.html` — boots the Sveltia CMS app (CDN script + config link). Eleventy's default copy already carries any non-template file under `src/` through to `_site/` at the same relative path, so `_site/admin/index.html` appears automatically.
- Create: `src/admin/config.yml` — the whole CMS schema: backend, media library paths, editorial workflow, and the two collections.
- Create: `src/_data/categorias/resenas.yml` — seed category "Reseñas".
- Create: `src/_data/categorias/selecciones.yml` — seed category "Selecciones".
- Modify: `src/_layouts/post.njk` — render the new `image` frontmatter field (cover image) when a post has one, so the media-library upload is actually visible on the published site.

No changes to `.eleventy.js`, `package.json`, or existing post files are needed.

---

### Task 1: Admin shell (`index.html`)

**Files:**
- Create: `src/admin/index.html`

**Interfaces:**
- Consumes: nothing (static HTML).
- Produces: the `/admin/` entry point that Task 2's `config.yml` is loaded into.

- [ ] **Step 1: Create the admin folder and index.html**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Private Club — Panel</title>
    <link href="/admin/config.yml" type="application/yaml" rel="cms-config-url" />
  </head>
  <body>
    <script
      src="https://unpkg.com/@sveltia/cms@0.200.0/dist/sveltia-cms.js"
      integrity="sha384-9RgYenhub2P/XrlUTms8iPbiPPnZQA9OWU2SiicZbSttVjadMoaRajCo8ZYjJwia"
      crossorigin="anonymous"
    ></script>
  </body>
</html>
```

Save this as `src/admin/index.html`. (No `type="module"` on the script tag — Sveltia isn't distributed as an ES module and adding it can break the loader.)

The script is pinned to `0.200.0` (current stable release as of this writing) with a Subresource Integrity hash instead of the docs' default unversioned `/dist/sveltia-cms.js` URL — that avoids trusting unpkg/the upstream package to serve unchanged content on every page load. The trade-off: Sveltia releases fairly often, and this pin won't auto-update. When you want a newer version, bump the version in the URL and regenerate the hash:

```bash
curl -sL https://unpkg.com/@sveltia/cms@<new-version>/dist/sveltia-cms.js -o /tmp/sveltia-cms.js
openssl dgst -sha384 -binary /tmp/sveltia-cms.js | openssl base64 -A
```

- [ ] **Step 2: Commit**

```bash
git add src/admin/index.html
git commit -m "Add Sveltia CMS admin shell"
```

---

### Task 2: CMS schema (`config.yml`)

**Files:**
- Create: `src/admin/config.yml`

**Interfaces:**
- Consumes: repo `checodotcom/privateclub`, branch `main`, existing frontmatter shape from `src/posts/*.md`.
- Produces: the `posts` collection (writes to `src/posts/*.md`) and the `categorias` collection (writes to `src/_data/categorias/*.yml`) that Task 3's seed files must match field-for-field.

- [ ] **Step 1: Write `src/admin/config.yml`**

```yaml
backend:
  name: github
  repo: checodotcom/privateclub
  branch: main

publish_mode: editorial_workflow

media_folder: "src/img"
public_folder: "/img"

collections:
  - name: "posts"
    label: "Reseñas"
    label_singular: "Reseña"
    description: "Reseñas y selecciones musicales de privateclub."
    folder: "src/posts"
    create: true
    slug: "{{slug}}"
    extension: "md"
    format: "frontmatter"
    fields:
      - {label: "Layout", name: "layout", widget: "hidden", default: "post.njk"}
      - {label: "Título", name: "title", widget: "string"}
      - {label: "Fecha", name: "date", widget: "datetime", format: "YYYY-MM-DD", date_format: "YYYY-MM-DD", time_format: false, picker_utc: true}
      - {label: "Imagen de portada", name: "image", widget: "image", required: false, media_folder: "/src/img", public_folder: "/img"}
      - {label: "Extracto", name: "excerpt", widget: "text", hint: "Descripción corta que aparece en la lista de posts."}
      - label: "Categoría"
        name: "categoria"
        widget: "relation"
        collection: "categorias"
        search_fields: ["nombre"]
        value_field: "{{slug}}"
        display_fields: ["nombre"]
        required: false
      - label: "Tags"
        name: "tags"
        widget: "select"
        multiple: true
        default: ["posts"]
        options: ["posts", "seleccion", "ambient", "electronic", "jazz", "noise", "post-punk", "experimental", "world"]
      - {label: "Cuerpo", name: "body", widget: "markdown"}

  - name: "categorias"
    label: "Categorías"
    label_singular: "Categoría"
    description: "Tipos de contenido editorial (distinto de los tags de género musical)."
    folder: "src/_data/categorias"
    create: true
    slug: "{{slug}}"
    extension: "yml"
    format: "yml"
    fields:
      - {label: "Nombre", name: "nombre", widget: "string"}
      - {label: "Descripción", name: "descripcion", widget: "text", required: false}
      - {label: "Color de acento", name: "color", widget: "color", required: false, allowInput: true}
```

Notes for whoever edits this later:
- `media_folder`/`public_folder` at the top level are the CMS-wide defaults; the `posts.image` field repeats them explicitly (`/src/img` with a leading slash means "relative to repo root" in Decap/Sveltia's media-folder syntax, matching the top-level default) so the field is self-documenting.
- `tags` uses `widget: select` with `multiple: true` (a dropdown of known tags) rather than free-text `list`, because Sveltia/Decap's `list` widget has no built-in autocomplete — `select` is the closest built-in equivalent to "suggestions from tags already in use." The options above are every tag actually found in `src/posts/*.md` today (`posts`, `seleccion`, `experimental`, `electronic`) plus the extra genre tags CLAUDE.md documents as intended future tags.
- `categoria` is a `relation` field, not free text, per the spec's requirement to avoid inconsistent category names.

- [ ] **Step 2: Validate the YAML parses**

```bash
npx --yes js-yaml src/admin/config.yml >/dev/null && echo "config.yml is valid YAML"
```

Expected: `config.yml is valid YAML` with no error output. (This only checks YAML syntax, not CMS-specific field validation — that's covered by the live login test in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add src/admin/config.yml
git commit -m "Add Sveltia CMS config: posts + categorias collections, editorial workflow"
```

---

### Task 3: Seed the `categorias` collection

**Files:**
- Create: `src/_data/categorias/resenas.yml`
- Create: `src/_data/categorias/selecciones.yml`

**Interfaces:**
- Consumes: the `categorias` field schema from Task 2 (`nombre`, `descripcion`, `color`).
- Produces: the two category files the `posts.categoria` relation field resolves against (matched by filename slug: `resenas`, `selecciones`).

- [ ] **Step 1: Create `src/_data/categorias/resenas.yml`**

```yaml
nombre: "Reseñas"
descripcion: "Análisis a fondo de un álbum o lanzamiento."
color: "#ff00ff"
```

- [ ] **Step 2: Create `src/_data/categorias/selecciones.yml`**

```yaml
nombre: "Selecciones"
descripcion: "Recopilaciones mensuales de canciones sueltas."
color: "#00e5ff"
```

- [ ] **Step 3: Verify Eleventy picks them up as global data**

```bash
npx eleventy --to=json 2>/dev/null | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const page = data.find(p => p.data && p.data.categorias);
console.log(page ? page.data.categorias : 'categorias not found in global data');
"
```

Expected: an object showing `{ resenas: { nombre: 'Reseñas', ... }, selecciones: { nombre: 'Selecciones', ... } }`. This confirms Eleventy's `_data` directory convention (files in `src/_data/<folder>/*.yml` become nested global data under `<folder>`) is exposing the categories, independent of Sveltia.

- [ ] **Step 4: Commit**

```bash
git add src/_data/categorias/
git commit -m "Seed categorias collection: Reseñas, Selecciones"
```

---

### Task 4: Render the cover image on post pages

**Files:**
- Modify: `src/_layouts/post.njk:9-16` (the `post-header` block)

**Interfaces:**
- Consumes: the `image` frontmatter field the CMS now writes (Task 2), an `/img/...`-relative path.
- Produces: no new interface — this is the last consumer in the chain.

- [ ] **Step 1: Add a conditional cover image right after the opening of `post-header`**

In `src/_layouts/post.njk`, change:

```njk
    <div class="post-header">
      <h1 class="post-title">{{ title }}</h1>
```

to:

```njk
    <div class="post-header">
      {% if image %}
        <img class="post-cover" src="{{ image }}" alt="{{ title }}" />
      {% endif %}
      <h1 class="post-title">{{ title }}</h1>
```

Posts created before this change have no `image` key, so `{% if image %}` is falsy and they render exactly as before — no migration needed for the four existing posts.

- [ ] **Step 2: Build and confirm no regression**

```bash
npm run build
```

Expected: build succeeds (exit 0), and `_site/posts/privateclub-abril-2025/index.html` (an existing post with no `image` field) contains no `<img class="post-cover"` tag, while structure is otherwise unchanged.

```bash
grep -c 'post-cover' _site/posts/privateclub-abril-2025/index.html
```

Expected: `0`.

- [ ] **Step 3: Commit**

```bash
git add src/_layouts/post.njk
git commit -m "Render cover image on post pages when present"
```

---

### Task 5: Build verification + GitHub/Netlify OAuth wiring (manual, outside the repo)

This task has no file changes — it wires up authentication in GitHub's and Netlify's web UIs (both require your own login, so this is done by you, not executed by the agent) and then proves the whole pipeline end-to-end.

**Files:** none.

- [ ] **Step 1: Local build sanity check**

```bash
npm run build && ls _site/admin/
```

Expected: `config.yml` and `index.html` both listed — proof Eleventy copied `src/admin/` into the output untouched.

- [ ] **Step 2: Register the GitHub OAuth App**

Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App, using:
- **Application name:** `Private Club CMS` (or any label you recognize)
- **Homepage URL:** your site's live URL (e.g. `https://panoramica.store`)
- **Authorization callback URL:** `https://api.netlify.com/auth/done`

Save it, then generate a **Client Secret**. Keep the Client ID and Client Secret handy for the next step (don't paste the secret into chat).

- [ ] **Step 3: Register the OAuth provider in Netlify**

In the Netlify dashboard, open the `privateclub` site → **Site configuration → Access control → OAuth** → **Install provider** → GitHub → paste the Client ID and Client Secret from Step 2 → Save.

Do **not** enable Netlify Identity or Git Gateway for this — they're unrelated to this OAuth provider and unnecessary here.

- [ ] **Step 4: Push and let Netlify deploy `/admin`**

```bash
git push origin main
```

Wait for the Netlify deploy to finish (check the Netlify dashboard's Deploys tab), then confirm `/admin` is live:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<your-site-domain>/admin/
```

Expected: `200`.

- [ ] **Step 5: End-to-end login + content test**

In a browser, visit `https://<your-site-domain>/admin/`, click "Login with GitHub", and authorize the OAuth App from Step 2 the first time it's used. Then:
1. Open the **Reseñas** collection, create a new entry with a title, a tag, a **Categoría** (should show "Reseñas"/"Selecciones" from Task 3, not free text), and a cover image upload.
2. Save it as a draft (editorial workflow should show a "Drafts" status, not publish immediately).
3. Move it through review to **published** from the CMS's editorial workflow UI.
4. Confirm in GitHub that this created a commit (and, if a PR-based workflow, that Sveltia used a branch/PR) touching `src/posts/<new-file>.md` with `image` and `categoria` set.
5. Wait for the resulting Netlify deploy, then load the new post's live URL and confirm the cover image renders (Task 4) and the layout matches other posts.

Expected: every one of the 5 checks above passes. If login fails with an OAuth error, re-check the callback URL in Step 2 matches `https://api.netlify.com/auth/done` exactly and that the Client ID/Secret in Netlify (Step 3) are the current ones (regenerating the secret in GitHub invalidates the old one).

---

## Self-Review Notes

- **Spec coverage:** ver/gestionar posts → Task 2 `posts` collection; categorías estructuradas → Tasks 2+3; tags por post → Task 2 `tags` field; media library → `media_folder`/`public_folder` in Task 2 (already passthrough-copied by existing `.eleventy.js`); borrador antes de publicar → `publish_mode: editorial_workflow` in Task 2; GitHub OAuth sin Identity → Task 5 (corrected from CLAUDE.md's inaccurate "hosted helper" assumption, documented above); slug automático → `slug: "{{slug}}"` default in Task 2; login + crear post + build automático + reflejo en el sitio → Task 5 Step 5.
- **Placeholder scan:** no TBD/TODO left; every step has literal file content or literal commands.
- **Type/name consistency:** `image` (post frontmatter key) matches between Task 2's field name and Task 4's `{{ image }}` template reference; `categoria` matches between Task 2's post field and its `relation` target; category slugs `resenas`/`selecciones` match between Task 2's example and Task 3's actual filenames.
