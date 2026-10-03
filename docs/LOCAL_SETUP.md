# Local Setup Guide

This guide provides step-by-step instructions for team members to clone, set up, and run The Champions Club Sports Management System locally for development and testing.

**NOTE:** This project is intended for local development only at this phase. Do not deploy to production.

## 1. Prerequisites
Ensure you have the following installed on your local machine:
- **Node.js**: v18.x or v20.x
- **npm**: v9.x or higher
- **Supabase CLI**: Required for local database operations (`npm i -g supabase`)
- **Docker**: Required by Supabase CLI to run the local PostgreSQL and GoTrue services.
- **Git**: For version control.

## 2. Clone the Repository
Clone the repository to your local machine:
```bash
git clone https://github.com/Dhruv-Babriya/ODOOxLDCExFinal.git
cd ODOOxLDCExFinal
```

## 3. Environment Variables
Create a `.env.local` file in the root directory. You can copy the template if one exists, or use the following structure:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
```
*Note: The local keys will be provided by the Supabase CLI when you start it in step 5.*

## 4. Install Dependencies
Run the following command to install all required Node modules:
```bash
npm install
```

## 5. Supabase Configuration & Startup
Start the local Supabase stack. Docker must be running.
```bash
npx supabase start
```
After initialization, Supabase will output your local `API URL`, `anon key`, and `service_role key`. Update your `.env.local` file with these credentials.

## 6. Database Migrations
Apply the database schema to your local Supabase instance. This will execute the migration scripts sequentially (e.g., `20261003000001_initial_schema.sql`, etc.):
```bash
npx supabase db push
# or
npx supabase migration up
```

## 7. Seed Data
To populate the database with development/demo data (members, courts, products, etc.), run the seed script. Do not mix this demo data with real financial records in the future.
```bash
npx supabase db reset
# The reset command automatically runs the seed.sql file located in supabase/seed.sql
```

## 8. Run the Application
Start the Next.js Turbopack development server:
```bash
npm run dev
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

## 9. Test Commands
Before submitting any code for review, execute the quality gates:
```bash
# Type-checking
npx tsc --noEmit

# Linting
npm run lint

# Run automated tests (if configured)
npm run test

# Production Build Simulation
npm run build
```
