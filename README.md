# Playground — export

A Scramjet V2 web proxy. Source files (everything under `src/`, plus the
root configs, `package.json` and `bun.lock`) are baked into this archive
from the real project at build time, so what you unzip is a complete,
runnable project. Build outputs (`public/` runtime files, generated
bundles) come from the live deployment when it serves them.

## Run it

```bash
bun install
bun run dev
```

The first dev start also runs Convex codegen (`src/convex/_generated/` is
gitignored and deliberately not in this archive — it is regenerated on your
machine). If the app needs a Convex backend, run `bun convex dev` once and
point `VITE_CONVEX_URL` at your deployment.

The app is a Vite + React + Tailwind project. The proxy needs the files under
`public/` (`sw.js`, `scramjet/`, `controller/`) served from the same
directory as the app — they are fetched at runtime by the service worker and
the page controller, so they must not be bundled or moved. That directory is
the site root for a root-hosted deploy, or `/<repo>/` on a GitHub Pages
project site.

## Deploy

### GitHub Pages (recommended)

The included workflow does everything. Push to `main` and enable
**Settings → Pages → Source → GitHub Actions**.

1. `bun install && bun run build`
2. Publish `dist/` — a copy of `index.html` is also written as `404.html`
   so client-side routes survive a refresh.
3. Serve over HTTPS — service workers require a secure context, so the proxy
   will refuse to boot on plain HTTP.

Project sites are served from `https://<user>.github.io/<repo>/`, not the
domain root, so the build must be told about the prefix:

```bash
PAGES_BASE=/<repo>/ bun run build
```

The workflow sets this for you. It matters: the proxy fetches `sw.js`,
`controller/` and `scramjet/` relative to that base at runtime, so with the
wrong base the service worker 404s and the proxy never boots.

### Other static hosts

Cloudflare Pages, Netlify and Vercel all work at the domain root with no
prefix, i.e. a plain `bun run build`. Give them `dist/` as the publish
directory and make sure `sw.js` is not rewritten or cached.

### jsDelivr

jsDelivr **cannot** serve the app on its own. It serves `.html` as
`text/plain` with `nosniff` by design, so a browser downloads the page
instead of rendering it, and a service worker cannot be registered from
another origin. Both are non-negotiable.

What works is a split: jsDelivr serves every asset, and a small host serves
the two files it is not allowed to.

```bash
node scripts/build-jsdelivr.mjs <user> <repo> [ref] [--pages-base=/path/]
```

It builds with `ASSET_BASE` pointed at
`https://cdn.jsdelivr.net/gh/<user>/<repo>@<ref>/`, so the hashed bundles,
the Scramjet runtime and wasm, and the controller are all fetched from
jsDelivr. Games are not in the payload at all — `/games` loads LuminSDK from
its own CDN at runtime.

Publish the two output folders:

| Folder | Where it goes | What it is |
| --- | --- | --- |
| `dist/` | the `<ref>` branch of your repo | what jsDelivr serves |
| `dist-host/` | any static host | the ~2 KB jsDelivr can't serve |

`dist-host/` is just `index.html`, `sw.js` and `404.html`. The worker
still runs same-origin, but it is handed the CDN address at registration and
fetches the controller from there via CORS, which is what
`src/lib/paths.ts` exists to keep straight.

#### The SVG — jsDelivr with nothing else

If you want **no second host at all**, there is a way. jsDelivr renders
`.svg`, so the app is wrapped in a standalone SVG document:

```bash
bun run build:svg        # writes dist/playground.svg
```

Commit `dist/` to your repo, then open

`https://cdn.jsdelivr.net/gh/<user>/<repo>@<ref>/playground.svg`

The SVG is self-locating: it derives its base from its own URL, so the same
file works from any repo, branch or path. It works because a page and the
service worker registered from it are **both on `cdn.jsdelivr.net`**, so
same-origin holds where it normally could not. `sw.js`, `scramjet/` and
`controller/` have to sit at the same paths in the same repo.

The generated file is included in this archive when it has been built.
The relay defaults to `wss://kristenblackburnvolleyballcamps.com/socket/`; you can
point it at another wisp server from the in-app relay settings (stored per browser).

## The game shelf

Games come from **LuminSDK**, which is loaded at runtime from
`https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js` — it is not
bundled here. It runs in headless mode: the SDK supplies the catalog, the
search, the category list, the cover art and the playable URLs, while the
shelf and the Scramjet player in `src/pages/GamesPage.tsx` stay local.

Two consequences worth knowing before you deploy:

- **The shelf needs a working connection to that CDN.** A relay-only setup
  cannot fix a blocked script tag. If it fails, `/games` shows an offline card
  with a Retry rather than a blank page.
- **Game URLs are single-use tokens.** `getGameUrl(id)` is called fresh on
  every play, every retry and every "open in a tab", so a cached URL will not
  work — that is intentional.

Covers resolve to blob URLs through `src/lib/lumin.ts` and are cached in
memory for the session, so scrolling the shelf back and forth does not re-fetch
artwork.

## Included files

- `.github/workflows/pages.yml`
- `.nojekyll`
- `bun.lock`
- `components.json`
- `convex.json`
- `index.html`
- `package.json`
- `public/.nojekyll`
- `public/controller/controller.api.js`
- `public/controller/controller.inject.js`
- `public/controller/controller.sw.js`
- `public/logo.svg`
- `public/manifest.webmanifest`
- `public/scramjet/scramjet.js`
- `public/scramjet/scramjet.wasm`
- `public/sw.js`
- `public/uv-engine/worker.js`
- `public/uv/sw.js`
- `scripts/audit-export.mjs`
- `scripts/build-jsdelivr.mjs`
- `scripts/build-svg.mjs`
- `scripts/e2e-full.mjs`
- `scripts/e2e-music.mjs`
- `scripts/e2e-unblocker.mjs`
- `scripts/inspect-runtime.mjs`
- `scripts/probe-wisp-real.mjs`
- `scripts/probe-wisp.mjs`
- `src/assets/logo.svg`
- `src/components/AuroraStage.tsx`
- `src/components/BrowseView.tsx`
- `src/components/ChangelogDialog.tsx`
- `src/components/ClassroomSplash.tsx`
- `src/components/PasswordGate.tsx`
- `src/components/ui/accordion.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/button-group.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/empty.tsx`
- `src/components/ui/field.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/index.ts`
- `src/components/ui/input-group.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/item.tsx`
- `src/components/ui/kbd.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/radio-group.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/spinner.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/tooltip.tsx`
- `src/convex/_generated/api.d.ts`
- `src/convex/_generated/api.js`
- `src/convex/_generated/dataModel.d.ts`
- `src/convex/_generated/server.d.ts`
- `src/convex/_generated/server.js`
- `src/convex/auth.config.ts`
- `src/convex/auth.ts`
- `src/convex/auth/emailOtp.ts`
- `src/convex/http.ts`
- `src/convex/schema.ts`
- `src/convex/tsconfig.json`
- `src/convex/users.ts`
- `src/hooks/use-auth.ts`
- `src/hooks/use-mobile.ts`
- `src/hooks/use-theme.ts`
- `src/index.css`
- `src/instrumentation.tsx`
- `src/lib/access.ts`
- `src/lib/changelog.ts`
- `src/lib/cloak.ts`
- `src/lib/close-guard.ts`
- `src/lib/exportManifest.ts`
- `src/lib/hifi.ts`
- `src/lib/lumin.ts`
- `src/lib/paths.ts`
- `src/lib/proxy.ts`
- `src/lib/scramjet-controller.ts`
- `src/lib/theme.ts`
- `src/lib/utils.ts`
- `src/lib/uv.ts`
- `src/lib/vly-integrations.ts`
- `src/lib/zip.ts`
- `src/main.tsx`
- `src/pages/FilesScreen.tsx`
- `src/pages/GamesPage.tsx`
- `src/pages/Landing.tsx`
- `src/pages/MusicPage.tsx`
- `src/pages/NotFound.tsx`
- `src/types/global.d.ts`
- `src/vite-env.d.ts`
- `tsconfig.app.json`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `vly-toolbar-readonly.tsx`
