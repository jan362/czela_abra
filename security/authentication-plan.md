# Implementace přihlašování do aplikace czela_abra

## Kontext

Aplikace czela_abra je aktuálně **veřejně přístupná bez autentizace** - kdokoli může otevřít aplikaci a vidět všechna data z ABRA Flexi systému.

**Bezpečnostní riziko:** I když jsou ABRA Flexi credentials bezpečně uloženy na serveru (v `.env.local`), samotná aplikace nemá žádnou ochranu přístupu. Každý, kdo má přístup k URL aplikace, může zobrazit faktury, bankovní účty, kontakty a provádět operace.

**Požadavek:** Přidat přihlašovací vrstvu, aby byl přístup k aplikaci chráněn uživatelským jménem a heslem.

**Uživatelské preference:**
- ✅ Jeden uživatel (single-user mode)
- ✅ Všichni uživatelé stejná oprávnění (žádné role)
- ✅ Automatické vytvoření admin účtu při startu

---

## Navrhované řešení

**Architektura:** NextAuth.js v5 (Auth.js) + file-based credential storage + bcrypt

### Proč NextAuth.js?
- Průmyslový standard pro Next.js autentizaci
- Bezpečnostní best practices (CSRF, XSS ochrana) out-of-the-box
- Seamless integrace s Next.js 14 App Router
- HTTP-only encrypted cookies pro session management
- Rozšiřitelnost pro budoucí požadavky (OAuth, multi-user)

### Proč file-based storage?
- Žádná databáze není potřeba (projekt aktuálně žádnou nemá)
- Ideální pro single-user nebo malý tým (2-5 uživatelů)
- Jednoduché zálohování (`data/users.json` je portable)
- Bcrypt hash zajišťuje bezpečnost hesel

### Bezpečnostní model
- **Hesla:** Bcrypt hash s salt rounds 10 (industry standard)
- **Session:** JWT v HTTP-only cookie (XSS protected, 30-day expiry)
- **CSRF:** SameSite=Lax cookie + NextAuth CSRF tokens
- **Credentials:** Nadále v `.env.local` (server-side only, gitignored)

---

## Implementace

### 1️⃣ Instalace závislostí

```bash
npm install next-auth@beta bcryptjs
npm install --save-dev @types/bcryptjs
```

**Poznámka:** `next-auth@beta` je NextAuth v5, stabilní pro produkci a plně kompatibilní s App Router.

---

### 2️⃣ Konfigurace prostředí

**Soubor:** `.env.local`

Přidat:
```env
# NextAuth autentizace
NEXTAUTH_SECRET=<vygenerovat pomocí: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Výchozí admin heslo (změnit po prvním přihlášení)
ADMIN_DEFAULT_PASSWORD=changeme123
```

**Soubor:** `.env.example`

Přidat template:
```env
# Authentication
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000
ADMIN_DEFAULT_PASSWORD=changeme123
```

**Soubor:** `.gitignore`

Přidat:
```
data/users.json
```

---

### 3️⃣ User credential storage

**Nový soubor:** `src/lib/user-store.ts`

Implementuje:
- `initializeUserStore()` - Vytvoří `data/users.json` s default admin, pokud neexistuje
- `getUserByUsername(username)` - Načte uživatele pro ověření
- `verifyPassword(password, hash)` - Bcrypt comparison
- `hashPassword(password)` - Bcrypt hashing pro budoucí user management

**Struktura `data/users.json`:**
```json
{
  "users": [
    {
      "id": "1",
      "username": "admin",
      "passwordHash": "$2b$10$...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Bezpečnost:**
- Nikdy neexportovat plaintext hesla
- Soubor je v `.gitignore` - nikdy commitovat do gitu
- Validace při čtení (corrupt file handling)

---

### 4️⃣ NextAuth konfigurace

**Nový soubor:** `src/lib/auth.ts`

Konfigurace:
- **Provider:** Credentials (username + password)
- **Session strategy:** JWT (stateless, škálovatelné)
- **Session expiry:** 30 dní
- **Custom pages:** `/auth/login`, `/auth/error`
- **Callbacks:** JWT + session pro user ID tracking

Export:
```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({...});
```

**Nový soubor:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

Vytváří API endpointy:
- `/api/auth/signin`
- `/api/auth/signout`
- `/api/auth/session`

---

### 5️⃣ Route protection middleware

**Nový soubor:** `src/middleware.ts`

Logika:
1. Auth pages (`/auth/login`, `/auth/error`) - vždy přístupné
2. Pokud uživatel již přihlášen a navštíví `/auth/login` → redirect na `/`
3. Všechny ostatní stránky - vyžadují autentizaci
4. Nepřihlášený uživatel → redirect na `/auth/login?callbackUrl={původní_url}`

**Matcher:** Chrání všechny cesty kromě statických souborů (`_next/static`, obrázky, favicon)

---

### 6️⃣ Login UI

**Nový soubor:** `src/components/auth/LoginForm.tsx`

Client component s formulářem:
- Input: Uživatelské jméno (text)
- Input: Heslo (password)
- Submit button
- Error message display
- Loading state

Použije NextAuth `signIn("credentials", {...})` pro autentizaci.

**Nový soubor:** `src/app/auth/login/page.tsx`

Čistá login stránka bez sidebaru:
- Vycentrovaná karta
- Název aplikace: "Flexi Operations"
- Podnadpis: "Přihlaste se k pokračování"
- `<LoginForm />`

Tailwind styling konzistentní s existujícím designem.

**Nový soubor:** `src/app/auth/error/page.tsx`

Jednoduchá error stránka pro NextAuth chyby.

---

### 7️⃣ Logout funkce

**Nový soubor:** `src/components/auth/LogoutButton.tsx`

Client component:
```tsx
"use client";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/auth/login' })}>
      Odhlásit se
    </button>
  );
}
```

---

### 8️⃣ Integrace do layoutu

**Upravit:** `src/app/layout.tsx`

Změny:
1. Import `auth` z `@/lib/auth`
2. Zavolat `const session = await auth()` v layout funkci (server component)
3. Wrap children s `<SessionProvider session={session}>`
4. Podmíněné zobrazení sidebaru: `{session && <Sidebar />}`
5. Podmíněný padding: `<main className={session ? "flex-1 p-8" : "flex-1"}>`

**Upravit:** `src/components/layout/sidebar.tsx`

Přidat logout button do spodní části sidebaru:
```tsx
import { LogoutButton } from "@/components/auth/LogoutButton";

// V rámci sidebar bottom section:
<div className="p-3 border-t border-gray-700">
  <Link href="/settings">...</Link>
  <div className="mt-2">
    <LogoutButton />
  </div>
</div>
```

---

### 9️⃣ Ochrana API endpointů

**Vzor pro všechny API routes:**

```typescript
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest, ...) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... existing logic ...
}
```

**Soubory k úpravě:**
- `src/app/api/flexi/[evidence]/route.ts` - Přidat auth check do GET, POST, PUT, DELETE
- `src/app/api/flexi/connection/route.ts`
- `src/app/api/flexi/match-payment/route.ts`
- `src/app/api/flexi/find-invoices/route.ts`
- `src/app/api/flexi/export-matching/route.ts`
- `src/app/api/flexi/customer-balance/route.ts`
- `src/app/api/flexi/export-customer-balance/route.ts`

**Důvod:** Middleware chrání stránky, ale API endpointy mohou být volány přímo → nutné ověřit session i zde.

---

### 🔟 Inicializace user store při startu

**Upravit:** `src/lib/user-store.ts`

Přidat volání `initializeUserStore()` při importu modulu (top-level side effect):

```typescript
// Na konci souboru:
if (process.env.NODE_ENV !== 'test') {
  initializeUserStore().catch(console.error);
}
```

**Efekt:** Při prvním spuštění aplikace se automaticky vytvoří `data/users.json` s admin účtem.

---

## Kritické soubory

### Vytvořit nové
- `src/lib/auth.ts` - NextAuth konfigurace, credential provider, session callbacks
- `src/lib/user-store.ts` - User credential management, bcrypt operations, file I/O
- `src/middleware.ts` - Route protection logic, redirect rules
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route handlers
- `src/app/auth/login/page.tsx` - Login stránka
- `src/app/auth/error/page.tsx` - Auth error stránka
- `src/components/auth/LoginForm.tsx` - Login formulář component
- `src/components/auth/LogoutButton.tsx` - Logout button component
- `data/users.json` - User credentials (auto-generated, gitignored)

### Upravit existující
- `src/app/layout.tsx` - SessionProvider wrap, conditional sidebar
- `src/components/layout/sidebar.tsx` - Přidat logout button
- `src/app/api/flexi/[evidence]/route.ts` - Auth checks (GET, POST, PUT, DELETE)
- `src/app/api/flexi/connection/route.ts` - Auth check
- `src/app/api/flexi/match-payment/route.ts` - Auth check
- `src/app/api/flexi/find-invoices/route.ts` - Auth check
- `src/app/api/flexi/export-matching/route.ts` - Auth check
- `src/app/api/flexi/customer-balance/route.ts` - Auth check
- `src/app/api/flexi/export-customer-balance/route.ts` - Auth check
- `.env.local` - Přidat NEXTAUTH_SECRET, NEXTAUTH_URL, ADMIN_DEFAULT_PASSWORD
- `.env.example` - Přidat template pro auth env vars
- `.gitignore` - Přidat data/users.json

---

## Ověření funkčnosti

### Po implementaci otestovat:

1. **Nepřihlášený uživatel:**
   - Otevřít `http://localhost:3000/` → měl by být přesměrován na `/auth/login`
   - Otevřít `http://localhost:3000/matching` → redirect na `/auth/login`
   - API call na `/api/flexi/banka` → 401 Unauthorized

2. **Přihlášení:**
   - Zadat správné username "admin" + heslo z `.env.local` → úspěšné přihlášení
   - Zadat špatné heslo → zobrazí se chyba "Neplatné přihlašovací údaje"
   - Po úspěšném login → redirect na původní URL (callbackUrl)

3. **Přihlášený uživatel:**
   - Vidí sidebar s logout tlačítkem
   - Může přistupovat na všechny stránky (/, /matching, /invoices, atd.)
   - API requesty vrací data (200 OK)

4. **Odhlášení:**
   - Kliknout "Odhlásit se" → vymaže session, redirect na `/auth/login`
   - Po odhlášení, pokus o přístup na `/` → redirect na login

5. **Session persistence:**
   - Přihlásit se → zavřít browser → otevřít znovu → měl by být stále přihlášen
   - Session vyprší po 30 dnech

6. **Automatická inicializace:**
   - Smazat `data/users.json`
   - Restartovat aplikaci (`npm run dev`)
   - Ověřit, že se vytvořil nový `data/users.json` s admin účtem

---

## Bezpečnostní poznámky

### Co je chráněno
✅ ABRA Flexi credentials zůstávají v `.env.local` (server-side only)
✅ User hesla hashována bcryptem (nikdy plaintext)
✅ Session token v HTTP-only cookie (XSS protected)
✅ CSRF ochrana (SameSite cookie + NextAuth tokens)
✅ Všechny stránky i API endpointy vyžadují autentizaci
✅ `data/users.json` v `.gitignore` (nikdy commitovat)

### Doporučení po nasazení
- **Změnit výchozí heslo** ihned po prvním přihlášení
- **Použít HTTPS** v produkci (Secure flag na cookies)
- **Silný NEXTAUTH_SECRET** (32+ znaků, unique pro každé prostředí)
- **Pravidelné zálohy** `data/users.json`
- **Monitorovat** failed login attempts (budoucí enhancement: rate limiting)

### Budoucí vylepšení (volitelné)
- 2FA (two-factor authentication)
- Password complexity requirements
- Account lockout po N neúspěšných pokusech
- Audit log přihlášení
- Password reset functionality
- Multi-user upgrade s SQLite/PostgreSQL

---

## Pořadí implementace

1. **Závislosti:** `npm install next-auth@beta bcryptjs @types/bcryptjs`
2. **Env vars:** Aktualizovat `.env.local`, `.env.example`, `.gitignore`
3. **User store:** Vytvořit `src/lib/user-store.ts`
4. **NextAuth config:** Vytvořit `src/lib/auth.ts` + API route
5. **Middleware:** Vytvořit `src/middleware.ts`
6. **Login UI:** Vytvořit login page + form + logout button components
7. **Layout integrace:** Upravit `layout.tsx` a `sidebar.tsx`
8. **API ochrana:** Přidat auth checks do všech API routes
9. **Testování:** Ověřit všechny scénáře (viz sekce Ověření funkčnosti)
10. **Dokumentace:** Aktualizovat README s instrukcemi pro setup
