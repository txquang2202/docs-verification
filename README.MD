# Document Verification Workflow

> KVY Tech Take-Home Submission — Tran Xuan Quang

---

## What I Built

### ✅ Working end-to-end

**Complete path: Seller uploads → BullMQ async verification → Inconclusive → Admin reviews → Seller-visible outcome**

- **Auth** — JWT login for both roles (SELLER / ADMIN). Role-based guards on every endpoint.
- **Document upload** — Multer with 10MB limit, MIME-type validation (PDF/JPEG/PNG), one document per seller.
- **Async verification** — BullMQ job enqueued on upload. `VerificationProcessor` calls mock service with exponential backoff (5 attempts max). Zod validates every external response before touching state.
- **State machine** — All transitions enforced at service layer. Invalid transitions throw explicitly; PostgreSQL CHECK constraint is a safety net.
- **Mock verification service** — `POST /internal/mock-verify` returns `verified` (50%) / `rejected` (20%) / `inconclusive` (30%) with 1–5s random delay.
- **Escalation** — After 5 inconclusive/failed attempts, document moves to `PENDING_REVIEW` automatically.
- **Admin review** — `PATCH /verifications/:id/review` with optimistic locking (`version` column). Concurrent review → `409 Conflict` with clear message.
- **Audit log** — Every state transition recorded in `audit_events` (append-only). Admin UI shows full history per document.
- **Notification** — Separate BullMQ `NotificationJob` enqueued on terminal states. Retries independently of verification.
- **Seller UI** — Login → upload form → live status display with refresh.
- **Admin UI** — Login → pending queue → document detail panel → approve/reject form → audit history.
- **Unit tests** — 5 tests covering `VerificationProcessor`: verified/rejected/inconclusive escalation/idempotency guard/mid-flow retry.

### ⚠️ Partially working

- **Email notifications** — Job is enqueued and processed. In dev, emails go to Ethereal (fake SMTP) — check console for preview URL. Real delivery needs `SMTP_*` env vars set.
- **File download for admin** — Admin can see file metadata but no download link. Files are served from `uploads/` folder (local only; needs S3 in production).

### ❌ Not built

- **Seller re-upload / appeal flow** — `REJECTED` is terminal. Documented in DESIGN.md §7.
- **Real-time status updates** — Seller must refresh manually. WebSocket/SSE descoped.
- **Bull Board dashboard** — Job queue visibility not wired up (easy add: `@bull-board/nestjs`).
- **Admin SLA reminders** — No cron escalation for stale `PENDING_REVIEW` items.
- **Malware scanning** — Files are accepted and stored without AV scanning.

---

## What I'd Build Next

Given 2 more hours, in this order:

1. **Bull Board** (`@bull-board/nestjs`) — 20 minutes. Gives immediate visibility into job state, failures, and retries. High value for demo and debugging.
2. **File download endpoint** — 30 minutes. `GET /documents/:id/file` streaming from local disk (+ S3 adapter stub). Admin can't effectively review without seeing the document.
3. **Seller re-upload** — 45 minutes. Arch change is small: allow new upload if current status is `REJECTED`, archive old record. This is the highest-risk descoped item per §7.
4. **Real-time status via SSE** — 25 minutes. `GET /documents/status-stream` with NestJS `@Sse()`. Seller UI connects on mount; eliminates the "refresh to see update" UX problem.

---

## How to Run Locally

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally (or use a Supabase / Railway connection string)
- Redis running locally (or use an Upstash URL)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/doc-verification
cd doc-verification

# Install backend deps
cd apps/backend && npm install && cd ../..

# Install frontend deps
cd apps/frontend && npm install && cd ../..
```

### 2. Configure environment

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env — set DATABASE_URL and REDIS_HOST at minimum

# Frontend
cp apps/frontend/.env.example
# NEXT_PUBLIC_API_URL
```

### 4. Start backend

```bash
cd apps/backend
yarn start:dev
# → http://localhost:8080
```

### 5. Start frontend

```bash
cd apps/frontend
yarn run dev
# → http://localhost:3000
```

### 6. Verify it works

Open `http://localhost:3000/login` and sign in with a test account (see below).

---

## Test Credentials

| Role   | Email             | Password    |
| ------ | ----------------- | ----------- |
| Seller | `seller@demo.com` | `seller123` |
| Admin  | `admin@demo.com`  | `admin123`  |

### Happy path to test

1. Login as **seller** → upload any PDF/image
2. Watch the terminal — BullMQ processes the job within 1–5 seconds
3. Refresh status in seller UI
4. If result is `PENDING_REVIEW`: login as **admin** → find document → approve or reject
5. Seller sees final status on next refresh

To force an inconclusive result every time for testing, edit `apps/backend/src/mock/mock.controller.ts`:

```ts
const WEIGHTS = { verified: 0, rejected: 0, inconclusive: 1 };
```

## Deployment

### Stack used

| Layer                | Service | Cost             |
| -------------------- | ------- | ---------------- |
| Frontend             | Vercel  | Free             |
| Backend + PostgreSQL | Railway | ~$5 credit/month |
| Redis                | Upstash | Free tier        |

## API Reference (key endpoints)

| Method | Path                          | Auth   | Description                      |
| ------ | ----------------------------- | ------ | -------------------------------- |
| POST   | `/auth/login`                 | —      | Login, returns JWT               |
| POST   | `/auth/register`              | —      | Register new seller              |
| POST   | `/documents/upload`           | SELLER | Upload document file             |
| GET    | `/documents/my`               | SELLER | Get own document + status        |
| GET    | `/documents`                  | ADMIN  | All documents                    |
| GET    | `/documents/pending-review`   | ADMIN  | Documents needing review         |
| POST   | `/verifications/:id/review`   | ADMIN  | Approve or reject (with version) |
| GET    | `/verifications/:id/attempts` | ADMIN  | Verification attempt history     |
| GET    | `/audit/:documentId`          | ADMIN  | Full audit trail                 |
| POST   | `/internal/mock-verify`       | —      | Mock external service (internal) |
