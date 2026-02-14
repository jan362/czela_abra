# Saldo odběratelů

## Popis funkce

Modul **Saldo odběratelů** poskytuje přehled o stavu pohledávek a závazků vůči všem odběratelům. Zobrazuje aktuální finanční pozici každého odběratele a zvýrazňuje případy s nezaplacenými fakturami.

## Použití

1. V menu klikněte na **Saldo odběratelů** (ikona 💰)
2. Systém načte aktuální stav všech odběratelů
3. Zobrazí se přehledná tabulka se saldy

## Funkce

### 📊 Statistiky (v záhlaví)

- **Celkové pohledávky**: Součet všech kladných sald (co nám dluží odběratelé)
- **Celkové závazky**: Součet všech záporných sald (co dlužíme my)
- **Nezaplacené faktury**: Celkový počet faktur, které ještě nebyly uhrazeny
- **Po splatnosti**: Počet faktur, které jsou po datu splatnosti

### 🔍 Filtry

#### Typ salda:
- **Vše**: Zobrazí všechny odběratele se saldem
- **Pouze pohledávky**: Zobrazí pouze odběratele, kteří nám dluží
- **Pouze závazky**: Zobrazí pouze odběratele, kterým dlužíme my

#### Nezaplacené faktury:
- **Zaškrtnuto**: Zobrazí pouze odběratele s nezaplacenými fakturami
- **Nezaškrtnuto**: Zobrazí všechny odběratele se saldem

### 📋 Tabulka odběratelů

Sloupce:
- **Odběratel**: Název a kód firmy
- **Pohledávky**: Částka, kterou nám firma dluží (červeně)
- **Závazky**: Částka, kterou dlužíme my (zeleně)
- **Saldo celkem**: Celkové saldo (kladné = pohledávky, záporné = závazky)
- **Nezaplacené**: Počet nezaplacených faktur (oranžový badge)
- **Po splatnosti**: Počet faktur po splatnosti (červený badge)

### 🎨 Barevné zvýraznění

- **Červené pozadí**: Odběratel s pohledávkami A má nezaplacené faktury ⚠️
- **Bílé pozadí**: Odběratel s pohledávkami, ale všechny faktury jsou zaplacené
- **Zelené pozadí**: Odběratel, kterému dlužíme my
- **Šedé pozadí**: Vyrovnané saldo

## Technické informace

### API Endpoint

**URL**: `/api/flexi/customer-balance`
**Metoda**: `GET`

### Response struktura:

```json
{
  "success": true,
  "balances": [
    {
      "id": 123,
      "kod": "FIRMA01",
      "nazev": "Testovací firma s.r.o.",
      "saldoZdroj": 50000.00,
      "saldoCil": 0.00,
      "saldoCelkem": 50000.00,
      "unpaidInvoices": 3,
      "overdueInvoices": 1
    }
  ],
  "count": 1
}
```

### Datové zdroje

Funkce využívá ABRA Flexi REST API:

1. **Evidence `adresar-saldo`**
   - Speciální evidence pro saldo odběratelů
   - Obsahuje předpočítané hodnoty saldoZdroj, saldoCil, saldoCelkem
   - Dokumentace: https://podpora.flexibee.eu/cs/articles/8650590-saldo-rest-api

2. **Evidence `faktura-vydana`**
   - Pro získání seznamu nezaplacených faktur
   - Filtr: `stavUhrK != 'stavUhr.uhrazeno'`
   - Kontrola splatnosti porovnáním `datSplat` s dnešním datem

### Výpočet sald

- **saldoZdroj** (pohledávky): Kladná částka = odběratel nám dluží
- **saldoCil** (závazky): Kladná částka = dlužíme my odběrateli
- **saldoCelkem**: `saldoZdroj - saldoCil`
  - Kladné = pohledávky (červené)
  - Záporné = závazky (zelené)
  - Nulové = vyrovnáno (šedé)

## Příklady použití

### Případ 1: Sledování pohledávek
**Situace**: Chcete zjistit, kdo vám dluží peníze

1. Nastavte filtr "Pouze pohledávky"
2. Seřadit podle sloupce "Saldo celkem" (nejvyšší nahoře)
3. Červeně zvýrazněné řádky = mají nezaplacené faktury → priorita pro upomínky

### Případ 2: Upomínky po splatnosti
**Situace**: Potřebujete poslat upomínky

1. Zaškrtněte "Pouze s nezaplacenými fakturami"
2. Podívejte se na sloupec "Po splatnosti"
3. Červené badges = faktury po splatnosti → okamžitá akce

### Případ 3: Kontrola závazků
**Situace**: Kontrola, komu dlužíte peníze

1. Nastavte filtr "Pouze závazky"
2. Zelené řádky = vaše závazky vůči dodavatelům
3. Zkontrolujte nezaplacené faktury

## Optimalizace výkonu

### Rychlost načítání

Pro **100 odběratelů** s pohledávkami:
- Načtení sald: ~500ms (1 request)
- Načtení faktur: ~100 requestů × 50ms = ~5s
- **Celkem: ~5-6 sekund**

### Možná vylepšení (budoucnost)

1. **Caching**: Ukládat saldo na 5-10 minut
2. **Batch loading**: Načíst všechny faktury najednou pomocí IN operátoru
3. **Lazy loading**: Načítat faktury jen pro rozbalené řádky
4. **WebSocket updates**: Real-time aktualizace při změnách

## Časté dotazy

**Q: Proč se saldo nezobrazuje pro všechny firmy?**
A: Zobrazují se pouze firmy s nenulovým saldem (> 0.01 Kč).

**Q: Co znamená červené pozadí?**
A: Firma má pohledávky (dluží vám peníze) A má nezaplacené faktury. Měli byste ji poslat upomínku.

**Q: Jak často se aktualizují data?**
A: Data jsou vždy aktuální z ABRA Flexi systému. Klikněte na "Obnovit" pro nové načtení.

**Q: Proč trvá načítání dlouho?**
A: Pro každého odběratele s pohledávkami se načítají nezaplacené faktury. Pro 100 odběratelů to může trvat 5-10 sekund.

**Q: Co když firma má pohledávky i závazky?**
A: Zobrazí se netto saldo (saldoCelkem). Detaily jsou v sloupcích "Pohledávky" a "Závazky".

## Řešení problémů

### Chyba: "Načítání salda se nezdařilo"
- Zkontrolujte připojení k ABRA Flexi serveru
- Ověřte přístupová práva k evidenci `adresar-saldo`
- Podívejte se do server logů pro detaily

### Saldo je nesprávné
- Zkontrolujte, zda jsou všechny platby správně spárovány
- Ověřte, že faktury mají správný stav úhrady
- Přepočítejte saldo v ABRA Flexi (Administrace → Přepočet)

### Nezobrazují se žádní odběratelé
- Možná nemáte žádné odběratele s nenulovým saldem
- Zkuste zrušit všechny filtry
- Zkontrolujte, zda máte faktury v systému

## Bezpečnost

- **Read-only**: Modul pouze čte data, nic nemění
- **Server-side**: Veškerá komunikace s ABRA Flexi probíhá na serveru
- **Autentizace**: Používá stejné přihlašovací údaje jako ostatní moduly
- **Oprávnění**: Vyžaduje přístup k evidencím `adresar-saldo` a `faktura-vydana`
