# ZAKI Backend

This backend manages ZAKI user accounts (email + verification) and creates NOVA.TYP users when verified users log in.

## Setup

1) Copy the environment file:

```
cp .env.example .env
```

2) Edit `.env` and set:
- `DATABASE_URL` (ex: `postgres://user:pass@localhost:5433/zaki`)
- `NOVA_TYP_BASE_URL` (ex: `https://typ.novanuggets.com`)
- `NOVA_TYP_API_KEY` (admin API key from NOVA.TYP)
- `ZAKI_ALLOWED_ORIGINS` (comma-separated list of frontend origins)
- `ZAKI_PUBLIC_URL` (public backend URL for verification links)
- `ZAKI_APP_URL` (public frontend URL for password reset links)
- `ZAKI_EMAIL_MODE` (`console`, `smtp`, `resend`, or `non`)
- `ZAKI_RESET_TTL_MINUTES` (password reset TTL in minutes)

3) Install and run:

```
npm install
npm run dev
```

## Migration (SQLite → Postgres)

1) Ensure `DATABASE_URL` points to Postgres.
2) Set `SQLITE_PATH` if your SQLite file is not `backend/data/zaki.sqlite`.
3) Run:

```
npm run migrate:sqlite
```

## Endpoints

- `GET /health`
- `POST /signup` — body `{ "email": "...", "password": "...", "name": "...", "dateOfBirth": "YYYY-MM-DD" }`
- `GET /verify?token=...`
- `POST /login` — body `{ "email": "...", "password": "..." }`
- `POST /zaki/workspaces` — body `{ "name": "..." }` (requires Authorization header)
- `POST /password-reset/request` — body `{ "email": "..." }`
- `POST /password-reset/confirm` — body `{ "token": "...", "password": "..." }`

## Notes

- NOVA.TYP must be in multi-user mode for user creation.
- Users are created in NOVA.TYP as `role: "default"` on first verified login.
- If `ZAKI_EMAIL_MODE=console`, verification links are logged to stdout.
- If `ZAKI_EMAIL_MODE=non`, users are auto-verified on signup.
- If `ZAKI_EMAIL_MODE=resend`, set `RESEND_API_KEY` and `RESEND_FROM`.
