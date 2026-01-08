# IndividualJourney

A lightweight personal journaling app (Articles + Life Records) deployed on Netlify.

## Architecture

- **Auth**: Supabase Auth (login only)
- **Database**: Netlify DB (Neon Postgres)
- **API layer**: Netlify Functions (`netlify/functions/*`)
- **Frontend**: Single-file static app (`index.html`)

The frontend never connects to Neon directly. All data access goes through Netlify Functions.

## Features

- Articles (create/update/delete)
- Life records (create/delete)
- Private/Public switch
- Public feed pagination (load more)
- Sync local data to cloud after login

## Project Structure

- `index.html` — frontend UI + client logic
- `netlify.toml` — Netlify config (functions directory)
- `package.json` — function dependencies (`pg`)
- `netlify/functions/_db.js` — Neon Postgres connection (via env vars)
- `netlify/functions/_auth.js` — verify Supabase access token and get current user
- `netlify/functions/articles.js` — Articles API (CRUD + pagination)
- `netlify/functions/life.js` — Life records API (CRUD + pagination)
- `neon_schema.sql` — SQL schema for Neon

## Requirements

- Netlify site (recommended: Git-based deploy)
- Neon database (Netlify DB)
- Supabase project (Auth enabled)

## Environment Variables (Netlify)

Set these in Netlify **Site settings → Environment variables**:

- `NETLIFY_DATABASE_URL`
  - Provided by Netlify DB / Neon
  - Alternatively, `NETLIFY_DATABASE_URL_UNPOOLED` or `DATABASE_URL` can be used
- `SUPABASE_URL`
  - Your Supabase project URL (same as in `index.html`)
- `SUPABASE_ANON_KEY`
  - Your Supabase anon key (same as in `index.html`)

## Database Setup (Neon)

1. Open Neon / Netlify DB SQL editor
2. Run the SQL in `neon_schema.sql`
3. Confirm you have tables:
   - `articles`
   - `life_records`

## Deploy

### Recommended: Git Deploy (Functions supported)

Netlify drag-and-drop deploy is mainly for static files and often won’t deploy Functions correctly.

1. Push this project to GitHub (or GitLab)
2. In Netlify: **Add new site → Import an existing project**
3. Build settings:
   - **Build command**: empty
   - **Publish directory**: `.`
4. Deploy
5. Add environment variables (see above)
6. Trigger a new deploy

### Verify Functions

After deploy, open:

- `https://<your-site>/.netlify/functions/articles?mode=public&from=0&limit=1`

Expected result: JSON response (even `data: []` is OK). If you see 404, Functions are not deployed.

## Local Development (optional)

If you want to run locally with Netlify Functions:

1. Install Node.js (LTS)
2. Install dependencies:

   ```bash
   npm install
   ```

3. Install Netlify CLI:

   ```bash
   npm install -g netlify-cli
   ```

4. Create a `.env` file (or set env vars in your terminal) with:

   - `NETLIFY_DATABASE_URL=...`
   - `SUPABASE_URL=...`
   - `SUPABASE_ANON_KEY=...`

5. Run:

   ```bash
   netlify dev
   ```

Then open the local URL shown by Netlify CLI.

## Notes / Troubleshooting

- If the public/private switch is slow, check:
  - Netlify Functions are deployed (no 404)
  - Neon region vs your users’ region (latency)
  - Database indexes exist (see `neon_schema.sql`)
- Auth errors (401):
  - Ensure you are logged in
  - Ensure Netlify env vars `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set

## License

Private project (no license specified).
