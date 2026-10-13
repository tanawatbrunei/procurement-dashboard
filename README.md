# Procurement Dashboard

**[▶ Live demo](https://procurement-dashboard-nine.vercel.app/)** — runs in the browser with fictional data, no sign-in needed.

An internal-style web app for a central procurement department. It turns Google Sheet and Excel data into dashboards that show where the purchasing process is stuck.
Built as a portfolio project — all company names, people and figures in this repo are fictional placeholders.

![Dashboard](docs/screenshots/tracking-summary.png)

| Projects | Item Master |
|---|---|
| ![Projects](docs/screenshots/projects.png) | ![Item Master](docs/screenshots/item-master.png) |

## Live demo

Try it: **https://procurement-dashboard-nine.vercel.app/**

The demo runs entirely in the browser: the Firebase SDK is swapped for an in-memory mock (`src/demo/`) seeded with generated, fictional data, and you are signed in automatically. Edits work but reset on reload.

```bash
npm run dev:demo      # local demo, no Firebase needed
npm run build:demo    # static build → dist/
```

Deploy: import the repo in Vercel (`vercel.json` is included), or publish to GitHub Pages by copying `docs/github-pages-workflow.yml` to `.github/workflows/deploy-demo.yml` and setting Settings → Pages → Source: GitHub Actions.

## Features

- **PR/PA/PO tracking** — splits each request into three stages with SLA targets, flags the bottleneck stage, ranks overdue items, drills down to the underlying rows, and exports to Excel.
- **Executive dashboard** — KPI cards, stage-duration analysis, top overdue, monthly trend, alerts and data-integrity checks.
- **Item Master** — compares the price of the same item across vendors, shows price variance and trend charts, and imports Excel files by matching column headers (column order doesn't matter).
- **Project register** — executive KPI cards, a table grouped by project with expand/collapse, distribution charts, and portfolio cards with progress bars.
- **Cost control** — reads Firestore in 12-hour batches into an IndexedDB cache, and limits "Sync now" to once per 15 minutes to stay within the free quota.
- **Access control** — a closed system with an email allowlist enforced by Firestore Security Rules (`firestore.rules`).
- **Google Sheets → Firestore sync** via Apps Script (`google-apps-script/`), plus a vendor directory, knowledge base, ESG and org-chart pages.

## Tech stack

React 19 · TypeScript · Vite · Firebase (Auth, Firestore) · Recharts · SheetJS (xlsx) · Google Apps Script · Tabler Icons — plain CSS tokens, no CSS framework.

## Getting started with a real backend

```bash
npm install
cp .env.example .env.local   # fill in your own Firebase web config
npm run dev
```

Replace `admin@example.com` in `src/config/admins.ts` and `firestore.rules` with your own admin email, then publish the rules in the Firebase console.
See `docs/TECHNICAL.md` and `docs/SECURITY.md` for architecture and access-control details.

## Scripts

`npm run dev` · `npm run build` · `npm run lint`
