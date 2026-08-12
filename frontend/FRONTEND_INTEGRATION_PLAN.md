# MTI Frontend Integration Plan

## 0. Reality check — what we're actually starting from

The uploaded zip (`Multi-view_website.zip`) is a **single-file static mockup**, not a connected app:

- Everything lives in one file: `src/app/App.tsx` (~1,300 lines)
- All "pages" (`home`, `marketplace`, `services`, `quote`, `cart`, `dashboard`) are conditionally rendered inside one component — no routing
- Product data is a **hardcoded array** (`allProducts`) — the same demo data we already seeded into the real backend
- The admin "Product Management" tab has an **Edit modal** and an **Add modal**, but:
  - Inputs use `defaultValue` with no `onChange` — they don't actually update state
  - Save/Add buttons just close the modal — nothing is persisted
  - No category/subcategory picker (just a placeholder text input labeled "Category")
  - No brand picker
  - No image upload — products use static Unsplash URLs
  - No spec builder — specs are a flat array of strings
- No API client exists anywhere — zero `fetch`/`axios` calls in the whole file
- No real auth — the dashboard is reached by just clicking a nav item, no login check
- Dependencies already installed that we can use: `react-router` (v7), `react-hook-form`, `lucide-react`, full shadcn/Radix primitives, Tailwind v4
- Not installed yet, needed: an HTTP client setup (plain `fetch` wrapper is enough, no need for axios), no schema validation library (`zod` recommended alongside `react-hook-form`)

**Conclusion:** this isn't a "wire up the form" task. It's a ground-up integration: introduce routing, an API layer, real auth state, and build the admin product form from scratch (category/subcategory picker, brand picker, multi-image uploader with primary selection, structured spec builder) against the backend shapes we already built. The visual design (Tailwind classes, layout, color tokens) from the mockup is worth preserving — we're replacing the data layer underneath it, not restyling.

---

## 1. Target architecture

```
src/
  app/
    App.tsx                 # becomes just <RouterProvider /> + global providers
  api/
    client.ts                # fetch wrapper: base URL, JWT header injection, error handling
    auth.ts                  # login()
    products.ts               # listProducts, getProductBySlug, createProduct, updateProduct,
                               # deleteProduct, setPrimaryImage, deleteProductImage
    categories.ts             # listCategories, listCategoriesTree, createCategory,
                               # updateCategory, deleteCategory
    brands.ts                 # listBrands
  types/
    product.ts                 # Product, ProductImage, ProductSpec, SpecLabel, Category, Brand
                               # (mirrors backend Pydantic schemas exactly)
  context/
    AuthContext.tsx           # holds JWT + admin user, persists token, exposes useAuth()
  pages/
    HomePage.tsx
    MarketplacePage.tsx
    ProductDetailPage.tsx     # was the "ProductModal", becomes a routed page (also keep as modal if preferred)
    ServicesPage.tsx
    QuotePage.tsx
    CartPage.tsx
    LoginPage.tsx              # NEW — doesn't exist in mockup at all
    admin/
      DashboardLayout.tsx      # sidebar + topbar shell, route guard
      OverviewTab.tsx
      ProductsTab.tsx          # the product table (real data, real delete)
      ProductFormModal.tsx      # NEW — the actual form we're building (create + edit)
      CategoryManagerModal.tsx  # NEW — admin UI to create/edit the category tree
      QuotesTab.tsx
  components/
    products/
      ImageUploader.tsx         # NEW — multi-file picker, preview grid, primary star toggle
      SpecBuilder.tsx           # NEW — add/remove rows of {label dropdown, value, notes}
      CategoryPicker.tsx        # NEW — two-level select (or searchable tree select)
    ui/                        # existing shadcn primitives, unchanged
```

We do **not** need to rewrite every page on day one. The plan below is staged so the admin product flow (the actual ask) ships first, with the minimum scaffolding (router, API client, auth) it depends on.

---

## 2. Backend contract reference (already built, do not change)

These are the exact shapes the frontend must match. All admin product writes are **`multipart/form-data`**, not JSON — this is the single most important constraint for the form component.

### Auth
```
POST /auth/login        (form-data: username, password)  →  { access_token, token_type }
```
Every admin request after login needs header: `Authorization: Bearer <access_token>`

### Categories
```
GET    /api/products/categories         → CategoryOut[]               (flat list, for dropdowns)
GET    /api/products/categories/tree    → CategoryTreeOut[]           (nested, for the public nav menu)
POST   /api/products/categories         (JSON) → CategoryOut          (admin only)
PATCH  /api/products/categories/{id}    (JSON) → CategoryOut          (admin only)
DELETE /api/products/categories/{id}                                  (admin only)
```
```ts
interface CategoryOut {
  id: number; name: string; slug: string;
  icon: string | null; parent_id: number | null;
}
interface CategoryTreeOut extends CategoryOut { children: CategoryTreeOut[]; }
```

### Brands
```
GET /api/products/brands → { id: number; name: string }[]
```

### Products — public
```
GET /api/products                  → { total, page, page_size, items: ProductOut[] }
GET /api/products/{slug}           → ProductOut
```

### Products — admin (multipart!)
```
POST  /api/products              (multipart/form-data, admin)  → ProductOut
PATCH /api/products/{id}         (multipart/form-data, admin)  → ProductOut
DELETE /api/products/{id}                                       (admin)
```
Form fields for create/update:
| field | type | notes |
|---|---|---|
| `name` | string | required on create |
| `description` | string | optional |
| `specs` | string | **JSON-encoded string** of `ProductSpecIn[]`, e.g. `[{"label":"RAM","value":"16GB","notes":null}]` |
| `price` | number | required on create |
| `original_price` | number | optional |
| `badge` | string | optional |
| `stock` | number | default 0 |
| `rating` | number | default 4.0 |
| `category_id` | number | optional |
| `brand_id` | number | optional |
| `slug` | string | create only, auto-generated if omitted |
| `primary_index` | number | 0-based index **within this upload batch** marking the cover photo |
| `images` | File[] | repeated `images` parts, `.jpg/.jpeg/.png/.webp` only |

```ts
type SpecLabel = "RAM" | "Processor" | "Graphics Card" | "Storage" | "Screen";

interface ProductSpecIn { label: SpecLabel; value: string; notes?: string | null; }
interface ProductSpecOut extends ProductSpecIn { id: number; }

interface ProductImageOut {
  id: number; image_url: string; is_primary: boolean; position: number;
}

interface ProductOut {
  id: number; name: string; slug: string; description: string | null;
  price: number; original_price: number | null; badge: string | null;
  stock: number; rating: number;
  category_id: number | null; brand_id: number | null;
  category: CategoryOut | null; brand: BrandOut | null;
  images: ProductImageOut[];
  specs: ProductSpecOut[];
  created_at: string; updated_at: string;
}
```

### Product images — admin
```
PATCH  /api/products/{id}/images/{image_id}/primary   → ProductOut   (set cover photo)
DELETE /api/products/{id}/images/{image_id}            → ProductOut   (remove one image)
```

### Important gotchas to encode in the API layer
1. **`image_url` is a relative path** (`/uploads/products/abc.jpg`) returned by the backend — the frontend must prefix it with the API base URL when rendering `<img src>`, since it's not served from the same origin as the frontend dev server.
2. **`specs` is sent as a JSON string inside form-data**, not as native array fields — `formData.append("specs", JSON.stringify(specsArray))`.
3. **Images are appended, not replaced**, on `PATCH`. Uploading new files via update adds to the existing gallery; it does not remove old images. Deleting an image is a separate call.
4. **`primary_index` only applies to the files in the current request.** To change which *already-saved* image is primary without uploading anything new, use the dedicated `PATCH .../images/{id}/primary` endpoint instead.
5. A category can be deleted only if it has no children and no products — the backend returns `400` with a clear message in those cases; surface that error text directly in the UI rather than a generic failure toast.

---

## 3. Staged build plan

### Stage 1 — Foundation (must come first, everything depends on it)
1. Install `react-router-dom` setup is already there via `react-router` v7 — wire `createBrowserRouter` in `main.tsx`/`App.tsx`, replacing the `page` state switch.
2. Add `src/api/client.ts`: a thin `fetch` wrapper that reads `VITE_API_BASE_URL` from env, injects the `Authorization` header from `AuthContext`, parses JSON, and throws a typed error with the backend's `detail` message on non-2xx.
3. Add `src/context/AuthContext.tsx`: stores `{ token, admin }` in React state + `localStorage`/`sessionStorage` (note: this project's artifacts can't use browser storage, but this is a *real Vite app outside the artifact sandbox*, so `localStorage` is fine here), exposes `login()`, `logout()`, `isAuthenticated`.
4. Add `src/pages/LoginPage.tsx` — real form, calls `POST /auth/login`, stores token, redirects to `/admin`.
5. Add a route guard component that redirects to `/login` if `!isAuthenticated` for all `/admin/*` routes.

### Stage 2 — Read-only admin product list (prove the connection works end-to-end)
1. `src/types/product.ts` — the TypeScript interfaces from section 2.
2. `src/api/products.ts`, `src/api/categories.ts`, `src/api/brands.ts`.
3. Replace the mockup's `products` state (currently `useState(allProducts)`) in the Products tab with a real fetch on mount, rendering the existing table UI unchanged — this validates auth + API client before touching the form.

### Stage 3 — The actual ask: Product create/edit form
1. `CategoryPicker.tsx` — fetches `GET /categories` (flat), groups by `parent_id` into optgroups (or a two-step "Category → Subcategory" cascading select, matching the screenshot's UX), emits the chosen leaf `category_id`.
2. `SpecBuilder.tsx` — repeatable row UI: label `<select>` constrained to the 5 `SpecLabel` enum values, value text input, optional notes text input, add/remove row buttons. Outputs `ProductSpecIn[]`.
3. `ImageUploader.tsx` — multi-file `<input type="file" multiple accept="image/jpeg,image/png,image/webp">`, client-side preview thumbnails via `URL.createObjectURL`, a "set as cover" affordance per thumbnail that tracks the index to send as `primary_index`. For edit mode, also render **already-uploaded** images (from `product.images`) with their own delete button (calling the per-image DELETE endpoint) and primary-toggle (calling the per-image PATCH endpoint) — these are separate API calls from the form submit, since existing images aren't re-uploaded.
4. `ProductFormModal.tsx` — replaces both the broken "Edit modal" and "Add modal". Built with `react-hook-form` (already a dependency) for field state; on submit, constructs a `FormData` object per the multipart contract above and calls `createProduct`/`updateProduct` from `src/api/products.ts`.
5. Wire the table's "Edit"/"New Listing" buttons to open this one shared modal in create or edit mode.

### Stage 4 — Category management UI
1. `CategoryManagerModal.tsx` — simple tree view (top-level rows, expandable to show children), with inline "add subcategory" and "add top-level category" actions, calling the category CRUD endpoints. Surface the backend's 400 error text verbatim when delete is blocked.

### Stage 5 — Public-facing pages
1. `MarketplacePage.tsx` — replace `allProducts` with `listProducts()`, wire the existing filter UI (search/category/brand/price/sort) to the corresponding query params the backend already supports.
2. Category nav menu (the screenshot's mega-menu) — fetch `GET /categories/tree` once at app shell level, render top-level + children exactly like the Tunisianet reference.
3. `ProductDetailPage.tsx` — fetch `getProductBySlug`, render the new `images[]` as a gallery (primary first) and `specs[]` as a spec table, replacing the old flat string list rendering.
4. `QuotePage.tsx` — minimal change: the quote form already exists in the mockup with the right fields: just wire its submit to `POST /api/quotes` (multipart, matches the backend's `submit_quote_request` exactly — company/contact_person/email/phone/description/category/items/attachment).

---

## 4. Open questions before implementation starts

- **Category picker UX**: cascading two-step select (Category dropdown → Subcategory dropdown, like a typical e-commerce admin) vs. a single searchable tree dropdown (better for deeper nesting later, since we deliberately designed the backend to support unlimited depth)?
- **Product detail page**: keep it as a modal overlay (matches current mockup) or promote it to a real routed page (`/marketplace/:slug`) for shareable links and SEO? Routing makes more sense once `react-router` is wired in anyway.
- **Env config**: confirm the dev backend URL to bake into `VITE_API_BASE_URL` (currently `http://127.0.0.1:8000` per our testing) and whether ngrok will be used for the mobile app's tunnel only, or also for local web dev.

---

## 5. Suggested order of delivery (conversation-sized chunks)

1. Stage 1 (routing + API client + auth) — one focused pass
2. Stage 3 components individually (`CategoryPicker`, `SpecBuilder`, `ImageUploader`) — each is self-contained and testable alone
3. `ProductFormModal.tsx` wiring it all together
4. Stage 2 + the rest of Stage 3 (table hookup)
5. Stage 4 (category manager)
6. Stage 5 (public pages) last, since it's lower risk and less novel than the admin form work
