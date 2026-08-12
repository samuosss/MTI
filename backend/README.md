# MTI Backend API

FastAPI backend for the MTI enterprise IT hardware marketplace (product catalog,
quote requests, IT service inquiries, and an admin dashboard).

## Stack

- **FastAPI** + **Pydantic v2**
- **PostgreSQL** via **SQLAlchemy 2.0**
- **JWT** auth (admin-only) with `python-jose` + `passlib[bcrypt]`
- File uploads (RFQ attachments) stored on local disk, served via `/uploads`

## Project layout

```
backend/
├── app/
│   ├── main.py              # FastAPI app, router registration, CORS, static files
│   ├── config.py             # Settings (reads .env)
│   ├── database.py           # Engine, session, declarative Base
│   ├── seed.py                # Seeds admin user + demo catalog
│   ├── core/
│   │   ├── security.py       # Password hashing, JWT encode/decode
│   │   └── deps.py            # get_current_admin dependency
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── user.py            # AdminUser
│   │   ├── product.py         # Category, Brand, Product
│   │   ├── quote.py           # QuoteRequest, QuoteRequestItem
│   │   └── service.py         # ServiceInquiry
│   ├── schemas/                # Pydantic request/response models
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── quote.py
│   │   ├── service.py
│   │   └── dashboard.py
│   ├── crud/                   # DB access logic
│   │   ├── product.py
│   │   └── quote.py
│   └── routers/                # API endpoints
│       ├── auth.py             # POST /api/auth/login, GET /api/auth/me
│       ├── products.py         # Public catalog + admin product CRUD
│       ├── quotes.py           # Public RFQ submission + admin quote management
│       ├── service.py          # Public service inquiry + admin list/resolve
│       └── dashboard.py        # Admin KPIs, category breakdown, recent quotes
├── uploads/                    # Uploaded RFQ files (gitignored)
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

1. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # edit .env: set DATABASE_URL and SECRET_KEY
   ```

4. **Create the PostgreSQL database**
   ```bash
   createdb mti_db
   ```

5. **Seed initial data** (creates tables + admin user + demo products)
   ```bash
   python -m app.seed
   ```
   Default admin login: `admin@mti-solutions.com` / `ChangeMe123!` — **change this in production**.

6. **Run the dev server**
   ```bash
   uvicorn app.main:app --reload
   ```
   API docs available at `http://localhost:8000/docs`.

## Key endpoints

| Method | Path                          | Auth  | Purpose                                  |
|--------|-------------------------------|-------|-------------------------------------------|
| POST   | `/api/auth/login`             | -     | Admin login, returns JWT                  |
| GET    | `/api/auth/me`                | Admin | Current admin profile                     |
| GET    | `/api/products`                | -     | Marketplace listing (search/filter/sort)  |
| GET    | `/api/products/{slug}`         | -     | Product detail                            |
| POST   | `/api/products`                | Admin | Create product                            |
| PATCH  | `/api/products/{id}`           | Admin | Edit product                              |
| DELETE | `/api/products/{id}`           | Admin | Delete product                            |
| POST   | `/api/quotes`                  | -     | Submit RFQ form (multipart, with file)    |
| GET    | `/api/quotes`                  | Admin | List quote requests (dashboard table)     |
| PATCH  | `/api/quotes/{id}`              | Admin | Update quote status                       |
| POST   | `/api/service-inquiries`       | -     | Submit IT Services contact form           |
| GET    | `/api/service-inquiries`       | Admin | List service inquiries                    |
| GET    | `/api/dashboard/overview`       | Admin | KPI cards + category breakdown chart      |
| GET    | `/api/dashboard/recent-quotes`  | Admin | Recent quotes table                       |

## Notes for production

- Replace `Base.metadata.create_all()` in `main.py` with Alembic migrations.
- Swap local-disk uploads for S3/Cloud Storage.
- Set a strong, unique `SECRET_KEY` and restrict `CORS_ORIGINS`.
- Put the API behind HTTPS and a reverse proxy (e.g. Nginx).
