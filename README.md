# Multi-Society Management Platform

A production-ready SaaS platform for managing housing societies with multi-tenant database isolation.

## Prerequisites
- Node.js (v16+)
- MariaDB / MySQL server

## Database Setup
1. Open your MariaDB/MySQL client.
2. Execute the schema found in `database/schema.sql`. This will create the `saas_master_db` and seed the initial plans.

## Backend Setup
1. Navigate to the `backend` folder: `cd backend`.
2. Install dependencies: `npm install`.
3. Configure environment variables in `backend/.env`:
   - `DB_HOST`: Your database host (default: localhost)
   - `DB_USER`: Your database username (default: root)
   - `DB_PASSWORD`: Your database password
   - `DB_NAME`: `saas_master_db`
   - `JWT_SECRET`: A secure string for token signing
   - `MAIN_DOMAIN`: Your platform domain (e.g., `platform.com`)
4. Start the server: `node server.js`. The API will run on `http://localhost:5000`.

## Frontend Setup
1. Navigate to the `frontend` folder: `cd frontend`.
2. Install dependencies: `npm install`.
3. Start the Vite development server: `npm run dev`.

## Running Tenant Sites Locally
To test subdomains like `greenpark.localhost` or `greenpark.platform.com` locally:
- You may need to edit your `hosts` file (e.g., `C:\Windows\System32\drivers\etc\hosts`) and add:
  ```
  127.0.0.1  greenpark.platform.com
  127.0.0.1  sunshine.platform.com
  ```
- Access the platform via the mapped domains.

## Project Structure
- `frontend/`: React + Tailwind UI with subdomain detection logic.
- `backend/`: Node.js + Express API with multi-tenant database provisioning.
- `database/`: SQL scripts for master database initialization.
