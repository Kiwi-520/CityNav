# CityNav Auth + Prisma + PostgreSQL Setup

## 1. Install PostgreSQL Locally (Ubuntu/Debian)

1. Install packages:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

2. Start and enable service:

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

3. Create DB user and database:

```bash
sudo -u postgres psql
```

Inside psql:

```sql
CREATE USER citynav_user WITH PASSWORD 'your_password';
CREATE DATABASE citynav OWNER citynav_user;
\c citynav
CREATE EXTENSION IF NOT EXISTS postgis;
\q
```

## 2. Configure Environment Variables

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Update these values in .env.local:

- DATABASE_URL
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

Example DATABASE_URL:

```env
DATABASE_URL=postgresql://citynav_user:your_password@localhost:5432/citynav?schema=public
```

## 3. Prisma Database Setup

1. Generate Prisma client:

```bash
npx prisma generate
```

2. Create and apply migration from schema:

```bash
npx prisma migrate dev --name init_auth_forum_schema
```

3. Apply advanced SQL extras (PostGIS indexes, view, functions, trigger):

```bash
psql "$DATABASE_URL" -f prisma/sql/community_forum_extras.sql
```

## 4. Google OAuth Setup

1. Open Google Cloud Console.
2. Create OAuth 2.0 credentials (Web application).
3. Add Authorized redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

4. Put client ID and secret in .env.local.

## 5. Run the App

```bash
npm run dev
```

Open:

- /auth for Login/Signup
- /api/auth/signin for Auth.js provider debug page (optional)

## 6. Behavior Implemented

- Manual signup:
  - If email already exists: user is told to login.
  - Else account is created and user is logged in.

- Manual login:
  - If email does not exist: user is told to signup.
  - If account has no password (Google account): user is told to use Google login.

- Google login:
  - If account exists: user logs in.
  - If account does not exist: new account is auto-created and logged in.

## 7. Useful Prisma Commands

```bash
npx prisma studio
npx prisma migrate status
npx prisma db pull
```
