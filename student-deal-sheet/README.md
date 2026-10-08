# Student deal sheet

This app serves three role cards, saves unfinished work in the browser, stores submitted deal sheets in Supabase, and provides a protected instructor dashboard at `/teach`.

## Configuration

Copy `.env.example` to `.env.local` for local development. Set the same four variables in Vercel for production. Run `supabase/schema.sql` once in your Supabase project before accepting submissions.

`SUPABASE_SERVICE_ROLE_KEY` and `TEACHER_COOKIE_SECRET` must remain server-only.

## Checks

```bash
npm run check
npm test
```

The browser smoke test in `tools/role-ui-smoke.mjs` requires Playwright and is optional.
