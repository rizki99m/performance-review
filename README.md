# DOKI Performance Review Prototype

Performance Review V1 built with Next.js and Neon PostgreSQL. All application data is accessed through authenticated server APIs; database credentials are never exposed to browser code.

## Run locally

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

Configure `.env.local` with your Neon connection string:

```env
DATABASE_URL=your_neon_database_url_here
```

Apply the authoritative [database/schema.sql](database/schema.sql) to an empty Neon database before starting the application. Create the initial Admin user directly in the database with a bcrypt password hash; subsequent users can be managed from the Admin UI.

## Prototype limitations

Sessions use secure HTTP-only cookies and are validated against the database. The application intentionally has no local mock-data fallback: connection and database errors are shown to the user.
