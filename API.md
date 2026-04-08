# Customer Summary API — Reference

> **Audience:** Indivara engineering team
> **Status:** Demo / staging
> **Base URL:** `https://indivara-demo.vercel.app`

This document describes the REST API exposed by the Dyna.AI demo
to retrieve the AI-curated **Customer Summary** list for a given RM.
The same JSON shape will be used in the production POC integration.

---

## Overview

There is one endpoint relevant to Indivara's frontend integration:

| Endpoint | Purpose |
|---|---|
| `GET /api/client-list` | Returns a paginated, filtered list of clients for an RM, each with priority tags and an AI-generated suggestion line |

The Client Detail page (full briefing + talking points) and the Product
Recommendation chatbot are delivered as **hosted URLs**, not as APIs:

| Deliverable | URL pattern |
|---|---|
| Client Detail WebView | `https://indivara-demo.vercel.app/detail?customer_id={CUSTOMER_ID}&from={TAG}&sales_code={SALES_CODE}` |
| Chatbot | Embedded inside the Client Detail page (Agent Studio iframe, bottom-right) |

---

## `GET /api/client-list`

### Request

```
GET https://indivara-demo.vercel.app/api/client-list?sales_code=RAMPVERIMG&priority_filter=ALL&page=1&page_size=20
```

### Query parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `sales_code` | string | yes | `RAMPVERIMG` | The RM's sales code. One of: `RAMPVERIMG`, `INVPTL`, `RAMPVER`, `RAMPVER_OFL` |
| `priority_filter` | string | no | `ALL` | Tag filter. One of: `ALL`, `GROWTH`, `UPSELL`, `REBALANCE`, `CROSSSELL` |
| `sort_aum` | string | no | `none` | `none` / `asc` / `desc` — sort by total AUM |
| `sort_holdings` | string | no | `none` | `none` / `asc` / `desc` — sort by holdings count |
| `search` | string | no | (empty) | Substring match against client name or initials |
| `page` | integer | no | `1` | 1-based page number |
| `page_size` | integer | no | `20` | Items per page |

**Notes on sorting:**
- If neither `sort_aum` nor `sort_holdings` is set, the list uses a tab-aware default sort:
  - `GROWTH` → AUM ascending (lowest first — biggest income/AUM gap is most urgent)
  - `REBALANCE` → largest risk-tier mismatch first, then AUM descending
  - `UPSELL` → AUM descending
  - `CROSSSELL` → AUM descending
  - `ALL` → number of priority flags descending, then AUM descending
- If `sort_aum` and `sort_holdings` are both set, AUM is the primary key and Holdings is the secondary key.

### Response

`200 OK`

```json
{
  "sales_code": "RAMPVERIMG",
  "priority_filter": "ALL",
  "sort_aum": "none",
  "sort_holdings": "none",
  "search": "",
  "total": 1255,
  "page": 1,
  "page_size": 20,
  "total_pages": 63,
  "clients": [
    {
      "customer_id": "0x5e2bd0e1701c4e31890952a830b40295",
      "sales_code": "RAMPVERIMG",
      "client_name": "Maria Santos Cruz",
      "avatar_initials": "MC",
      "age": 42,
      "aum": 93683.17,
      "priority_flags": ["GROWTH", "REBALANCE", "UPSELL", "CROSSSELL"],
      "flag_labels": [
        "Growth Opportunity",
        "Rebalance Alert",
        "Up-sell Opportunity",
        "Cross-sell Opportunity"
      ],
      "suggestions": {
        "GROWTH":    "Income ₱5,000,001 - 10,000,000 but only ₱93,683 invested — clear growth opportunity",
        "REBALANCE": "ATRAM Philippine Equity Opportunity Fund (Aggressive) exceeds Moderate tolerance by +2 tiers",
        "UPSELL":    "Holds only ATRAM Philippine Equity Opportunity Fund (₱93,683) — add complementary fund",
        "CROSSSELL": "Sole holding is a Local fund — propose Global allocation"
      },
      "default_suggestion": "Income ₱5,000,001 - 10,000,000 but only ₱93,683 invested — clear growth opportunity",
      "contextual_suggestion": "Income ₱5,000,001 - 10,000,000 but only ₱93,683 invested — clear growth opportunity",
      "holdings_count": 1,
      "max_gap": 2,
      "days_to_birthday": 41,
      "rank": 1
    }
  ]
}
```

### Field reference

| Field | Type | Description |
|---|---|---|
| `total` | integer | Total clients matching the filter (across all pages) |
| `total_pages` | integer | Total number of pages at the current `page_size` |
| `clients[].customer_id` | string | Unique client identifier (used in the WebView URL) |
| `clients[].client_name` | string | Full name |
| `clients[].avatar_initials` | string | Two-letter initials for the avatar |
| `clients[].age` | integer or null | Calculated from birth date |
| `clients[].aum` | number | Total assets under management in PHP |
| `clients[].priority_flags` | string[] | Active tags. Possible values: `GROWTH`, `REBALANCE`, `UPSELL`, `CROSSSELL` |
| `clients[].flag_labels` | string[] | Human-readable labels matching `priority_flags` |
| `clients[].suggestions` | object | Map of tag → contextual one-line suggestion |
| `clients[].default_suggestion` | string | Default suggestion (priority: `GROWTH > UPSELL > REBALANCE > CROSSSELL`) |
| `clients[].contextual_suggestion` | string | The suggestion matching the active `priority_filter`. Render this in the list. |
| `clients[].holdings_count` | integer | Number of distinct funds held |
| `clients[].max_gap` | integer | Largest risk-tier mismatch (0 if none) |
| `clients[].days_to_birthday` | integer or null | Days until next birthday. Show a 🎂 marker if `0 ≤ days ≤ 7`. |
| `clients[].rank` | integer | 1-based position within the current sort/filter |

### Tag definitions

| Tag | Logic | Suggested action |
|---|---|---|
| `GROWTH` | Annual income ≥ ₱1M **and** AUM < ₱100,000 | Convert idle deposits into ATRAM funds |
| `UPSELL` | Client holds exactly 1 fund | Add a complementary fund |
| `REBALANCE` | Any holding's risk tier exceeds the client's risk profile by ≥ 2 tiers | Rebalance into risk-appropriate funds |
| `CROSSSELL` | All holdings are in the `Local` category | Propose a Global allocation |

---

## Examples

### Example 1 — Default list for RAMPVERIMG

```bash
curl "https://indivara-demo.vercel.app/api/client-list?sales_code=RAMPVERIMG"
```

### Example 2 — Filter by Growth Opportunity, page 2

```bash
curl "https://indivara-demo.vercel.app/api/client-list?sales_code=RAMPVERIMG&priority_filter=GROWTH&page=2&page_size=20"
```

### Example 3 — Sort by AUM descending, top 50

```bash
curl "https://indivara-demo.vercel.app/api/client-list?sales_code=INVPTL&sort_aum=desc&page=1&page_size=50"
```

### Example 4 — Search by name

```bash
curl "https://indivara-demo.vercel.app/api/client-list?sales_code=RAMPVERIMG&search=Cruz"
```

### Example 5 — Rebalance Alert clients only, AUM descending

```bash
curl "https://indivara-demo.vercel.app/api/client-list?sales_code=RAMPVERIMG&priority_filter=REBALANCE&sort_aum=desc"
```

---

## Opening the Client Detail WebView

When the RM clicks a client in the list, open this URL in an iframe or new
window. Pass the `from` parameter so the briefing can highlight the relevant
talking point.

```
https://indivara-demo.vercel.app/detail?customer_id={CUSTOMER_ID}&from={TAG}&sales_code={SALES_CODE}
```

| Parameter | Required | Example |
|---|---|---|
| `customer_id` | yes | `0x5e2bd0e1701c4e31890952a830b40295` |
| `from` | no | `GROWTH`, `UPSELL`, `REBALANCE`, or `CROSSSELL` (the active tab when the user clicked) |
| `sales_code` | no | The RM whose list the user came from (used by the Back button) |

The WebView is fully responsive (mobile / tablet / desktop) and embeds the
Endpoint C product recommendation chatbot in the bottom-right corner.

### Iframe embedding

```html
<iframe
  src="https://indivara-demo.vercel.app/detail?customer_id=0x5e2bd0e1...&from=GROWTH"
  width="100%"
  height="900"
  frameborder="0"
  allow="clipboard-write">
</iframe>
```

The page sends `Content-Security-Policy: frame-ancestors *` so it can be
embedded from any origin. For production we will tighten this to specific
Avantrade domains.

---

## Errors

| Status | Body | Cause |
|---|---|---|
| `400 Bad Request` | `{"error":"Invalid sales_code","allowed":[...]}` | `sales_code` is not in the allowed list |
| `500 Internal Server Error` | `{"error":"Failed to load client list"}` | Server-side issue |

---

## CORS & caching

- `Access-Control-Allow-Origin: *` (the API can be called from any origin)
- `Cache-Control: public, s-maxage=60` (responses are cached at the edge for 60 seconds)

---

## Contact

For questions, schema changes, or to request new filters, please contact
the Dyna.AI team.
