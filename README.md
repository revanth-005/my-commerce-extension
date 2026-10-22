# My Commerce Extension

An Adobe App Builder project for Adobe Commerce. It has a few Runtime actions that read Commerce data, enrich it, and keep product badges up to date.

All actions live in `src/commerce-extensibility-1/actions/labs/`.

## Setup

1. Add these values to `.env`:
   - `IMS_OAUTH_S2S_CLIENT_ID`, `IMS_OAUTH_S2S_CLIENT_SECRET`, `IMS_OAUTH_S2S_ORG_ID`, `IMS_OAUTH_S2S_SCOPES`
   - `COMMERCE_API_BASE_URL`
2. Deploy: `aio app deploy`

---

## Week 3: App Builder and Commerce APIs

**What it does:** Runtime actions that call the Commerce REST API using IMS server-to-server login (client credentials). The credentials stay on the server and never reach the browser.

| Action | What it does |
|---|---|
| `product-enrichment` | Takes a `sku`, reads the product from Commerce and adds a sustainability score and delivery estimate. API Mesh uses it. |
| `get-order-details` | Takes an `orderId` and returns basic order info. |
| `get-enriched-orders` | Returns the orders saved by the order consumer (used by the Admin dashboard). |

Every response includes a `correlationId` and a `timestamp`. Errors look like `{ "error": "...", "correlationId": "...", "timestamp": "..." }`.

---

## Week 4: Catalog-driven processing

**What it does:** When a product is saved in Commerce, an event updates the product's badges. The storefront reads those badges and shows them on the page.

```
Save product in Admin
   -> Commerce event (catalog_product_save_after)
   -> product-event-consumer  (reads product, works out badges, saves them)
   -> get-product-badge       (storefront asks for badges by SKU)
```

### Why this event

`catalog_product_save_after` fires whenever a product is saved. Everything the badges depend on (price, special price, status, created date) changes through a product save, so one event covers all of it. Inventory events could be added later, but they carry a product ID instead of a SKU and would need an extra lookup.

### Badge rules

- `sale`: the special price is lower than the regular price (and the discount meets the minimum, see Week 5).
- `new`: the product was created within the last N days (30 by default).
- `low-stock`: the quantity left is above zero and at or below the threshold (5 by default).
- Disabled products get no badges.

The rules are in `src/commerce-extensibility-1/actions/badges.js`. Merchants can change the numbers in Commerce Admin (Week 5).

### How it works

- The event only needs to carry the `sku`. The consumer then reads the full product from Commerce.
- Badges are saved in App Builder state under the key `badge-<sku>` for 30 days.
- The same event ID is never processed twice.
- If the product no longer exists in Commerce, its badges are removed.
- If Commerce is unreachable, the action returns an error so the event is retried.

### Reading badges (for the storefront)

`GET /api/v1/web/course-labs/get-product-badge?sku=EMS-2026`

```json
{ "sku": "EMS-2026", "badges": ["sale", "new"], "found": true, "updatedAt": "..." }
```

If nothing is stored for that SKU you get `"badges": []` and `"found": false`.

### Commerce setup (one time)

1. In Commerce Admin, add an event subscription for `observer.catalog_product_save_after` with the field `sku`.
2. Run **Execute Synchronization** in Adobe I/O Events settings.
3. In Adobe Developer Console, add the event to your Stage workspace and deliver it to the runtime action `course-labs/product-event-consumer`.

### Try it

1. Edit a product in Admin, set a Special Price below the Price, and save.
2. Wait a few seconds, then open the `get-product-badge` URL above. You should see `sale`.
3. Remove the special price and save again. `sale` should disappear.

### Known limit

The sale rule ignores the Special Price from/to dates. An expired special price still counts as a sale until it is removed.

---

## Week 5: Merchant configuration and hardening

**What it does:** A merchant can change the badge rules in Commerce Admin, without a code change.

```
Admin > Product Enrichment > Badge Settings tab  (src/commerce-backend-ui-2)
   -> get-badge-config / save-badge-config   (need a logged-in Admin user)
   -> settings file in App Builder Files storage
   -> product-event-consumer uses them the next time a product is saved
```

### Settings

| Rule | Setting | Default |
|---|---|---|
| NEW badge | on/off, days | on, 30 |
| SALE badge | on/off, minimum discount % | on, 1 |
| LOW STOCK badge | on/off, quantity threshold | on, 5 |

The save action checks every value (for example days must be a whole number from 1 to 365) and returns a clear error if one is wrong.

Changed rules only affect a product when it is next saved. Existing badges are not recalculated.

### Safety basics

- **Secrets:** `.env`, `.aio`, `.aws.tmp.creds.json`, `dist/` and `.parcel-cache/` are in `.gitignore`. Real values live in `.env` locally and in GitHub secrets for deployment.
- **Authentication:** `get-badge-config`, `save-badge-config`, `get-order-details` and `get-enriched-orders` require a logged-in Adobe user. Only `get-product-badge` and `product-enrichment` are public, because the storefront needs them and they return no personal data.
- **CORS:** the Runtime gateway adds the CORS headers, so the actions do not add their own.

### Deploying with GitHub Actions

`.github/workflows/deploy.yml` deploys on every push to `main`. It needs these repository secrets:

`AIO_RUNTIME_NAMESPACE`, `AIO_RUNTIME_AUTH`, `IMS_OAUTH_S2S_CLIENT_ID`, `IMS_OAUTH_S2S_CLIENT_SECRET`, `IMS_OAUTH_S2S_ORG_ID`, `IMS_OAUTH_S2S_SCOPES`, `IMS_TECHNICAL_ACCOUNT_ID`, `IMS_TECHNICAL_ACCOUNT_EMAIL`, `COMMERCE_API_BASE_URL`, `COMMERCE_STORE_CODE`, `AIO_PROJECT_ID`, `AIO_PROJECT_NAME`, `AIO_PROJECT_ORG_ID`, `AIO_PROJECT_WORKSPACE_ID`, `AIO_PROJECT_WORKSPACE_NAME`, `AIO_PROJECT_WORKSPACE_DETAILS_SERVICES`.
