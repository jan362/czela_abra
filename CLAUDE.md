# CLAUDE.md - Project Conventions for czela_abra

## Project Overview
Web application for accounting operations using the ABRA Flexi REST API.
Built with Next.js 14+ (App Router), TypeScript, and Tailwind CSS.

## Architecture
- **Frontend**: React (Next.js App Router) with Server and Client Components
- **Backend proxy**: Next.js Route Handlers at `/api/flexi/*` proxy requests to Flexi server
- **API client**: `FlexiClient` class in `src/lib/flexi-client.ts` (server-side only)
- **Credentials**: `.env.local` (gitignored), never exposed to the browser

## Key Directories
- `src/app/`           — Pages and API route handlers (Next.js App Router)
- `src/lib/`           — FlexiClient, types, error classes, evidence registry
- `src/components/`    — Reusable React components (layout/, data/, ui/)
- `src/hooks/`         — Client-side React hooks (useFlexiQuery)
- `src/config/`        — Navigation menu and module definitions

## ABRA Flexi API Reference
- **Base URL pattern**: `https://{server}:{port}/c/{company}/{evidence}.json`
- **Auth**: HTTP Basic Auth (credentials from env vars)
- **JSON envelope**: `{ "winstrom": { "@version": "...", "evidence-name": [...] } }`

### URL Construction
```
GET /c/{company}/{evidence}.json                    — list all records
GET /c/{company}/{evidence}/{id}.json               — get single record
GET /c/{company}/{evidence}/(filter).json           — filtered list
POST /c/{company}/{evidence}.json                   — create record
PUT /c/{company}/{evidence}/{id}.json               — update record
DELETE /c/{company}/{evidence}/{id}.json             — delete record
GET /c/{company}/{evidence}/$sum.json               — aggregation
GET /c/{company}/evidence-list.json                 — list all evidences
```

### Filter Syntax
- In URL path as parenthesized expression: `/(datVyst > '2024-01-01')`
- **Operators**: `=`, `!=`, `<`, `>`, `<=`, `>=`, `like`, `starts`, `ends`, `between`, `in`, `is null`, `is not null`
- **Logical**: `and`, `or`, `not` (priority: operators > not > and > or)
- **Functions**: `now()`, `currentYear()`, `me()`
- **Examples**:
  - `/(datVyst between '2024-01-01' '2024-12-31')`
  - `/(firma = 'code:CUSTOMER01' and stavUhrK != 'stavUhr.uhrazeno')`
  - `/(sumCelkem > 10000 or stitky = 'code:VIP')`

### Query Parameters
- `?limit=N` — max records (default 20)
- `?start=M` — offset for pagination
- `?add-row-count=true` — include total count in response
- `?detail=id|summary|full|custom:field1,field2` — detail level
- `?order=fieldName@A` (ascending) or `@D` (descending)
- `?relations=polozky,prilohy` — include sub-records
- `?dry-run=true` — validate without saving
- `?report-name=faktúra` — PDF report export

### Key Evidences
| Evidence slug         | Czech name           | Category   |
|-----------------------|----------------------|------------|
| faktura-vydana        | Faktury vydané       | Fakturace  |
| faktura-prijata       | Faktury přijaté      | Fakturace  |
| banka                 | Banka                | Banka      |
| pokladni-pohyb        | Pokladní pohyby      | Pokladna   |
| adresar               | Adresář              | Kontakty   |
| objednavka-prijata    | Objednávky přijaté   | Objednávky |
| objednavka-vydana     | Objednávky vydané    | Objednávky |
| cenik                 | Ceník                | Ceník      |
| sklad                 | Sklady               | Sklad      |
| skladova-karta        | Skladové karty       | Sklad      |

## Commands
```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript compiler check (tsc --noEmit)
```

## Conventions
- All Flexi API calls go through `FlexiClient` (never call Flexi directly from components)
- Use `getFlexiClient()` factory to obtain the client instance
- New evidences: add entry to `src/lib/flexi-evidences.ts`
- New menu sections: add entry to `src/config/navigation.ts`
- New pages: create directory under `src/app/` with `page.tsx`
- Prefer Server Components; use `"use client"` only when interactivity is needed
- Czech labels use `labelCs` field; English labels use `label` field
- Keep page components thin — business logic belongs in `lib/` or `hooks/`

## Environment Variables (server-side only, no NEXT_PUBLIC_ prefix)
- `FLEXI_BASE_URL`   — Server URL with port, e.g., `https://server.cz:5434`
- `FLEXI_COMPANY`    — Company identifier
- `FLEXI_USERNAME`   — API user
- `FLEXI_PASSWORD`   — API password

## Adding a New Module (3 steps)
1. Register evidence in `src/lib/flexi-evidences.ts`
2. Add navigation entry in `src/config/navigation.ts` (if new top-level section)
3. Create page at `src/app/{module-name}/page.tsx`
   - The generic API route `/api/flexi/[evidence]` handles all evidences automatically
   - Use `useFlexiQuery` hook or `DataTable` component for data display
