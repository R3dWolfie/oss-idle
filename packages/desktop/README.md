# @oss-idle/desktop

The Electron shell that runs the game client as a standalone PC app. Its reason
to exist: browsers throttle (and eventually pause) hidden tabs - rAF stops,
timers are clamped, the `AudioContext` can suspend - which desyncs spectated
plays and stalls autopilot. The shell sets `backgroundThrottling: false`, so the
gameplay clock, render loop, and audio keep running whether or not the window is
focused.

## How it fits the monorepo

- **Renderer = the existing builds.** It does not fork the client. The compiled
  `@oss-idle/client` (and `@oss-idle/web`) bundles are served from a registered
  `app://idle` scheme (standard + secure → stable origin, secure context,
  IndexedDB persists). The `/web` profile platform stays a same-origin iframe.
- **Only the app shell ships.** The on-demand static library (`beatmaps/`,
  `previews/` - ~2.4 GB) is **not** bundled; the `app://` handler proxies those
  paths to the website (`config.ts` `REMOTE_PREFIXES`), the same URLs the browser
  hits. Keeps the installer small and within NSIS's limits. Excluded from the
  copy via `extraResources.filter` in `electron-builder.yml`.
- **API = the public server, over Bearer.** An `app://` origin can't ride the
  HttpOnly session cookie, so the app holds the session token and the client/web
  API layers send it as `Authorization: Bearer`. The server accepts that
  alongside the cookie (`requireAuth`), so the website is unaffected.

## osu! OAuth (native flow)

Sign-in runs in the user's **real system browser** (no embedded webview). The
browser can't hand a cookie or a custom-scheme deep link back to the app (some
browsers, e.g. Firefox, block the latter outright), so the app waits on its own
loopback (RFC 8252):

1. Renderer calls `window.ossIdleDesktop.login()` → main listens on
   `127.0.0.1:<random port>` and opens
   `…/v1/auth/osu/login?client=desktop&port=<port>&key=<random key>` in the system
   browser (up to 5 min).
2. osu! → server callback. The port and key (carried in the signed CSRF state) make
   the callback stash the session under a fresh one-time code and send the browser
   to `http://127.0.0.1:<port>/callback?code=…&key=…`. Only the machine that
   signed in receives it, whoever started the login, so a crafted login link
   can't hand someone's session to its author.
3. The app checks the key, sends the browser on to the "you can close this tab"
   page, and redeems the code with `POST /v1/auth/osu/desktop/exchange` (HTTPS,
   single-use). It stores the token (encrypted, `safeStorage`) and pushes it to
   every frame.
4. The bridge fires `onAuthChanged`; the client re-resolves its session and the
   /web iframe re-reads `/auth/me`.

The long-lived token never travels in a URL (only the one-time code does). **No
new osu! redirect URI is needed** - osu! still calls the same server callback. An
app from before the loopback sign-in can't sign in until it takes the update its
banner offers (see Self-update).

## Build & run

Prereq: `npm install` at the repo root (pulls Electron + electron-builder).

```bash
# Dev: run the usual `npm run dev` (vite client :5173 + server :3873), then:
npm run dev:desktop          # compiles main/preload and launches Electron at :5173

# Package installers (builds shared → server types → client → web → main, then
# electron-builder). NOTE: building client/web also deploys them (see root CLAUDE.md).
npm run dist:desktop
```

Dev talks to the local server (`localhost:3873`) and loads the live Vite client;
packaged builds talk to the public API and load the bundled `app://idle` origin.

A **staging build** is packaged too, but its `package.json` carries
`staging: { api, site }` (set through electron-builder's `extraMetadata`): it talks
to that server instead, keeps its own data folder beside the real game's, and leaves
the `oss-idle://` scheme alone. Its renderer is built with `vite build --mode
staging`: release code plus the dev tools menu (`client/src/dev/devMenu.ts`).
Release builds drop all of it at compile time.
Deep links in dev require the protocol to point back at the dev Electron binary -
`main.ts` handles that automatically. The `oss-idle://` scheme is registered and
routed (see deeplink.ts) but currently carries no actions - it's kept as the
transport for future app-directed links.

## Self-update

Packaged builds update via `electron-updater` over a **generic** feed (the
`publish` block in `electron-builder.yml` → the website's `/download`). The build
bundles `app-update.yml`, so the app finds the feed with no extra wiring. Update
is **user-initiated**, reusing the client's existing version poll:

1. The client already polls the server version every few seconds. When it sees a
   newer one **and** it's the desktop app, it calls `ossIdleDesktop.update.check()`
   instead of the browser's "refresh to update" prompt.
2. The in-game `DesktopUpdate` banner (client) shows *Download* → progress →
   *Restart & install*, driven by `update.onStatus` and ending in `quitAndInstall`.

`autoDownload` is off (the player chooses); a fetched update also auto-applies on
the next quit. Auto-update only runs in packaged builds. **Signing note:** macOS
auto-update requires a signed + notarized app; Windows NSIS updates work unsigned
(with a SmartScreen prompt) - sign for production.

## Moving the install (Windows)

The NSIS install is per-user in `%LOCALAPPDATA%\Programs`; AppImage and the macOS
app are already portable, so only Windows gets *Move installation...*
(Options → Maintenance). Every NSIS install copies its own installer to
`%LOCALAPPDATA%\<updaterCacheDirName>\installer.exe` (the name comes from the
bundled `app-update.yml`); `install.ts` re-runs it as
`--updated /S --force-run /D=<picked>\oss!idle`, the same args electron-updater
uses. The installer uninstalls the old folder first (registry `InstallLocation`),
then installs, rewrites the registry and shortcuts, and relaunches, so later
updates follow the new folder. Because the old install is gone before the new one
is written, the app refuses a target inside the current install, a non-empty
`oss!idle` folder (a later uninstall wipes it whole), or one it can't write to.
The option is absent when the stored installer is missing.

## Discord Rich Presence

Shows what the player is up to on their Discord profile (the current scene, or
the map being played with an elapsed timer). It's **renderer-driven and
self-healing**, so there's almost nothing to manage:

1. The client's `online/presence.ts` watches the live scene (`SceneManager`) and
   the playing map (`music.beatmap`) and pushes a small `DesktopPresence` snapshot
   through the bridge - `ossIdleDesktop.setPresence(...)`. Inert in a browser.
2. `presence.ts` (main) speaks Discord's local IPC protocol directly (no
   dependency - just the documented opcode+length framing over the
   `discord-ipc-*` socket). It connects lazily, remembers the last snapshot, and
   reconnects on its own, so the renderer can fire-and-forget whether or not
   Discord is running.

**Setup (one-time):** create an app at the [Discord Developer Portal](https://discord.com/developers/applications),
upload a Rich Presence art asset (default key `logo`), and paste its Application
ID into `DISCORD_CLIENT_ID` in `config.ts`. Leave it empty to disable presence
entirely - everything no-ops. To label a new scene, add a case to `sceneLabel`
in the client's `presence.ts`; the Discord plumbing here never changes.

## Publishing (part of a full deploy)

A deploy (the maintainers' own setup, outside this repo) builds the Linux
(AppImage) + Windows (NSIS, via Wine) installers with `npm -w @oss-idle/desktop run dist`,
then copies `oss-idle.exe` / `oss-idle.AppImage` + the `latest*.yml` feed and a
`manifest.json` (version + filenames, read by the web *Play oss!idle* page) into
the download dir. Stable filenames + a single `latest` channel
(`detectUpdateChannel: false`), so the URL never changes and auto-update always
sees the next build. So every release also refreshes the download.

**Where it lands (no config needed):** the site's Apache DocumentRoot is
`packages/client/dist`, so `/download` is just `dist/download`. Like
`beatmaps`/`previews`, the durable copy lives in `client/public/download`
(re-emitted to `dist` on every client build, so a later `newmap` never wipes it);
it's also dropped straight into the current `dist/download` so the deploy serves
the new build immediately. Override with `DESKTOP_PUBLISH_DIR` to publish to one
explicit path instead. The desktop bundle excludes `download/**` (like
beatmaps/previews) so the installers never recurse into the app.

Cross-building the Windows `.exe` from Linux needs **Wine** (the `dist` script
runs in the `electronuserland/builder:wine` Docker image). macOS installers can't
be cross-built from Linux - add them via a Mac or CI runner later (electron-builder
`--mac`); the manifest already tolerates a missing macOS file.

## Steam (later)

The app is **not** Steam-coupled: `window.ossIdleDesktop.steam` is an inert
feature-detect stub today. Wiring Steamworks (overlay, achievements, cloud saves,
rich presence) means adding `steamworks.js` in the main process and filling that
namespace - no change to the auth or rendering paths.
