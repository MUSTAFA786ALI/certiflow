# CertiFlow — Skilling Certificate Issuance Platform

CertiFlow is a certificate issuance and verification platform designed to manage the lifecycle of skill-training certificates. It supports role-based batch review, multi-level approvals, certificate generation, mock WhatsApp delivery with retries, and public certificate verification.

## Key Features

- **Role-based access:** Training Centre, District Officer, Quality Officer, and State Officer roles.
- **Batch management:** Create and submit candidate batches for approval.
- **Multi-level approval:** Requires approval from two distinct district officers before moving to the next stage.
- **Quality review:** Batches containing 50 or more candidates require an additional quality approval.
- **Certificate issuance:** Generates unique certificate numbers and verification tokens for candidates.
- **Reliable delivery simulation:** Uses BullMQ and Redis to process mock WhatsApp notifications with retry handling.
- **Public verification:** Verify certificates without signing in. Active, cancelled, and unknown certificates display distinct results.
- **Certificate cancellation:** State officers can cancel certificates, and public verification reflects the updated status.
- **Audit logging:** Records important workflow decisions and actions.

## Technology Stack

**Frontend**
- React
- TypeScript
- Vite
- Axios
- Lucide React

**Backend**
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- Zod validation

**Background Processing**
- Redis
- BullMQ
- Mock WhatsApp delivery provider

## Architecture

```text
React + Vite Client
        |
        | REST API
        v
Node.js + Express API
        |
        +------ PostgreSQL (Prisma)
        |
        +------ Redis + BullMQ
                       |
                       v
                Delivery Worker
                       |
                       v
              Mock WhatsApp Provider
```

## Demo Roles

All demo accounts use the password `Demo@123`.

| Role | Demo email |
|---|---|
| Training Centre | anika@certiflow.demo |
| District Officer 1 | dev@certiflow.demo |
| District Officer 2 | meera@certiflow.demo |
| District Officer 3 | kabir@certiflow.demo |
| Quality Officer | neha@certiflow.demo |
| State Officer | farah@certiflow.demo |

These are development/demo credentials. Do not use them in production.

## Local Setup

### Prerequisites

- Node.js and npm
- PostgreSQL database
- Redis instance

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd certiflow
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace_with_a_secure_secret
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=your_redis_connection_string
MOCK_WHATSAPP_FAIL_FIRST_ATTEMPT=true
```

Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Seed the demo accounts:

```bash
npm run db:seed
```

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5000`.

### 3. Configure the frontend

Open another terminal:

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Example Workflow

1. Sign in as the Training Centre and create a candidate batch.
2. Submit the batch for district review.
3. Sign in as two different District Officers and approve it.
4. For batches with 50 or more candidates, sign in as the Quality Officer and approve the quality review.
5. Sign in as the State Officer and issue certificates.
6. Background jobs process mock WhatsApp notifications, retrying failed attempts.
7. Use the public verification page to check a certificate without signing in.

## Verification

The public verification page supports:

- Active certificates
- Cancelled certificates
- Invalid or unknown verification tokens

A certificate's current status is retrieved from the backend.

## Validation Performed

The following checks were performed during development:

- Backend TypeScript check: `npx tsc --noEmit`
- Frontend production build: `npm run build`
- Manual role-based workflow testing.
- Public verification testing for active, cancelled, and invalid tokens.
- 50-candidate issuance test:
  - 50 candidates and 50 certificates.
  - Unique certificate numbers.
  - All certificates active.
  - All 50 mock deliveries sent successfully.
  - Each delivery succeeded after a retry.
  - No remaining delivery errors.

## Current Scope and Limitations

This is a working demonstration project. WhatsApp delivery is simulated; it does not send real WhatsApp messages. Some extended requirements, including spreadsheet import, automated stuck-batch detection, live WebSocket updates, and complete return/rejection workflows, are not implemented in the current version.

Docker-based deployment has not been validated.

## Security Notes

- Keep `.env` files and database credentials private.
- Use a strong JWT secret outside local development.
- Demo accounts and passwords are for demonstration only.
- Configure production CORS, authentication, and infrastructure before deployment.

## License

This project was created as a software engineering assessment demonstration.