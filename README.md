# GroupTrip Ledger

Explaiable group-trip expense settlement application.

## Structure

- `app/` - Next.js pages and API routes
- `components/` - reusable UI components
- `lib/` - Supabase, Gemini, settlement, payment and validation logic
- `types/` - TypeScript types
- `hooks/` - client-side data hooks
- `supabase/` - database migrations and seed data
- `public/` - static assets

## Important implementation flow

Receipt -> Gemini Vision -> Extracted Items -> Item Attribution -> Split Calculator -> Settlement Engine -> AI Explanation -> UPI Deep Link

## Start

```bash
npm install
npm run dev
```

This archive provides the project structure and starter placeholder files. Add your Supabase/Gemini credentials to `.env.local`.
