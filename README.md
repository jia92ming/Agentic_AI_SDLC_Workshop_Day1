# Snip

Snip is a tiny URL shortener demonstrating one backend with two clients:
an Angular web app and a Node.js command-line client.

## Repository layout

Each layer is maintained on its own orphan branch and mounted here as a
submodule:

| Folder | Branch | Technology |
| --- | --- | --- |
| `backend/` | `backend` | Bun API server |
| `frontend/` | `frontend` | Angular 19 web app |
| `cli/` | `cli` | Zero-dependency Node.js CLI |

The backend stores links in memory, so restarting it clears all links.

## API contract

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://..." }` | `201` with link details; `400` for invalid input |
| `GET` | `/api/links` | — | `200` array of links |
| `GET` | `/:code` | — | `302` redirect and hit increment; `404` if unknown |

## Clone and run

Clone with submodules populated:

```bash
git clone --recurse-submodules https://github.com/jia92ming/Agentic_AI_SDLC_Workshop_Day1.git
cd Agentic_AI_SDLC_Workshop_Day1
```

Plain clones leave submodule folders empty. To populate them afterward, run
`git submodule update --init --recursive`.

Run the backend in one terminal:

```bash
cd backend
bun start
```

Run the web app in another:

```bash
cd frontend
npm install
npx ng serve
```

Open `http://localhost:4200`. The CLI can use the same backend:

```bash
cd cli
node cli.js ls
node cli.js add https://example.com
```

## Updating a layer

Commit and push changes from inside the submodule, then update its pinned
pointer in this superproject:

```bash
cd backend
git add -A
git commit -m "Describe backend change"
git push
cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

Repeat the same workflow for `frontend` or `cli`.

## Building the release bundle

The `bundle/` submodule is generated output. Rebuild it after source-layer
changes with:

```bash
node scripts/build-bundle.mjs --push
```

This builds the Angular UI, combines it with the Bun server and CLI, pushes
the `bundle` branch, and updates the pinned bundle pointer on `main`.
