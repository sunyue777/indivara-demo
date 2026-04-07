# Indivara × Dyna.AI — RM Assist Demo

A Next.js project that delivers **Endpoint B (Client Detail WebView)** for the Indivara × Dyna.AI demo, with placeholders for Endpoints A and C.

---

## What's inside

```
indivara-demo/
├── pages/
│   ├── index.js              # Test client list (Endpoint A preview)
│   ├── detail.js             # ⭐ The main WebView page (Endpoint B)
│   ├── _app.js               # Global styles loader
│   ├── _document.js          # HTML shell
│   └── api/
│       ├── client-list.js    # Backend for Endpoint A
│       └── client-detail.js  # Backend for Endpoint B
├── lib/
│   └── agent-studio.js       # ⭐ THE ONE FILE TO EDIT when real API is ready
├── public/
│   └── data/
│       ├── clients_list.json   # Mock: 1,255 real RAMPVERIMG clients
│       └── clients_detail.json # Mock: full detail for each
├── styles/globals.css
├── tailwind.config.js
├── next.config.js
├── package.json
└── README.md
```

---

## Local setup (run on your computer)

Open a terminal in this folder and run:

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in a browser.

- `/` — the test client list (click any client to drill down)
- `/detail?customer_id=XXX` — the main WebView page

You can grab a real customer_id from the list page and test the detail view directly.

---

## Deploy to Vercel

### Option A — Upload via GitHub (recommended)

1. Create a new GitHub repository (e.g. `indivara-demo`) at https://github.com/new
2. Upload all files in this folder (GitHub web UI supports drag-and-drop upload)
3. Go to https://vercel.com/new → import the repo
4. Vercel auto-detects Next.js, click **Deploy**
5. In 1–2 minutes you'll get a URL like `https://indivara-demo.vercel.app`

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow prompts. Vercel creates the project and gives you a URL.

---

## Environment variables (to set in Vercel later)

When the real Agent Studio API is ready, add these in:
**Vercel Dashboard → Project → Settings → Environment Variables**

```
AGENT_STUDIO_API_URL       = https://agents.dyna.ai/api/v1/xxx
AGENT_STUDIO_TOKEN         = MTc3NDU5MDc3MDIyOAp...
AGENT_STUDIO_AGENT_A_ID    = NCmdb3bZhG... (for client list)
AGENT_STUDIO_AGENT_B_ID    = NCmdb3bZhG... (for client detail)
```

After setting, click **Redeploy** once for them to take effect.

---

## How to switch from mock to real API

**Edit only one file: `lib/agent-studio.js`**

Inside `getClientList()` and `getClientDetail()`, you'll see a `TODO` block with
a commented-out `fetch()` example. Replace the mock-loading code below the
TODO block with the real fetch call. Keep the return shape the same — the
frontend does not need to change.

---

## How the three endpoints map to this project

| Endpoint | What Dyna delivers | Where it lives |
|---|---|---|
| **A — Client List** | JSON API | `/api/client-list` — Indivara calls this from Avantrade |
| **B — Client Detail** | WebView URL | `/detail?customer_id=XXX` — Indivara opens this in iframe/window |
| **C — Chatbot** | Agent Studio iframe embed | Inside `/detail` page, bottom-right floating button |

### For Endpoint A (API)

Indivara hits:
```
GET https://<your-vercel-domain>/api/client-list?sales_code=RAMPVERIMG&priority_filter=ALL&page=1&page_size=20
```

Returns:
```json
{
  "total": 1255,
  "clients": [
    {
      "customer_id": "0x...",
      "client_name": "...",
      "avatar_initials": "XY",
      "aum": 93683,
      "priority_flags": ["P1", "P2"],
      "flag_labels": ["AUM Growth Opportunity", "Single Product Upsell"],
      "ai_suggestion": "We Suggest you to Diversify!",
      "holdings_count": 1,
      "rank": 1
    }
  ]
}
```

### For Endpoint B (WebView)

Indivara opens in an iframe or new window:
```
https://<your-vercel-domain>/detail?customer_id=<id>
```

The page loads client data, renders Summary + Portfolio + Risk Check + Talking Points,
and shows a floating chat button (Endpoint C) bottom-right.

### For Endpoint C (Chatbot)

Currently a placeholder inside `/detail`. When Agent Studio Agent C is ready,
replace the placeholder div in `pages/detail.js` (search for `Chatbot placeholder`)
with the iframe embed script, appending `&customer_id=${customer_id}` so the
agent knows which client is in context.

---

## Responsive breakpoints

- **Mobile** (<640px): single column, portfolio as cards, chat fullscreen
- **Tablet** (640–1024px): single column, portfolio as table
- **Desktop** (≥1024px): two columns, main content left, talking points right

Test by resizing your browser or using Chrome DevTools device toolbar.

---

## Open items

- [ ] Confirm exact Agent Studio API URL and auth scheme
- [ ] Confirm how to pass `customer_id` to the Endpoint C chatbot iframe
- [ ] Confirm pagination default (currently 20 per page)
- [ ] Production: tighten iframe CSP `frame-ancestors` to specific Indivara domains
- [ ] Add a short-lived token signature to the `/detail` URL for access control
