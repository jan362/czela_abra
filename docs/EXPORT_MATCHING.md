# Export nespárovaných plateb a faktur

## Popis funkce

Funkce exportu umožňuje exportovat nespárované bankovní platby spolu s fakturami, které mají stejný variabilní symbol jako platba, do CSV souboru.

## Použití

1. Přejděte na stránku **Párování plateb** (`/matching`)
2. Klikněte na tlačítko **Export do CSV** v pravém horním rohu
3. Stáhne se CSV soubor s názvem `nesparovane-platby-YYYY-MM-DD.csv`

## Struktura CSV souboru

CSV soubor obsahuje následující sloupce:

### Informace o platbě:
- **Platba - Kód**: Kód bankovního pohybu
- **Platba - Datum**: Datum vystavení platby
- **Platba - Částka**: Částka platby v Kč
- **Platba - VS**: Variabilní symbol
- **Platba - Firma**: Název firmy (partnera)
- **Platba - Typ**: Typ pohybu (příjem/výdaj)
- **Platba - Popis**: Popis platby

### Informace o faktuře:
- **Faktura - Kód**: Kód faktury
- **Faktura - Typ**: Typ faktury (Vydaná/Přijatá)
- **Faktura - Datum vystavení**: Datum vystavení faktury
- **Faktura - Datum splatnosti**: Datum splatnosti faktury
- **Faktura - Částka**: Částka faktury v Kč
- **Faktura - VS**: Variabilní symbol faktury
- **Faktura - Firma**: Název firmy na faktuře
- **Faktura - Stav úhrady**: Stav úhrady (Neuhrazeno/Částečně uhrazeno/Uhrazeno)

## Logika exportu

### 1. Platba bez variabilního symbolu
Pokud platba nemá variabilní symbol, export obsahuje pouze informace o platbě (sloupce pro faktury jsou prázdné).

```csv
BP001;2024-01-15;1000.00;;;Firma A;Příjem;Platba bez VS;;;;;;
```

### 2. Platba s VS, ale bez nalezených faktur
Pokud platba má variabilní symbol, ale nebyla nalezena žádná faktura s tímto VS, export obsahuje platbu s prázdnými údaji o faktuře.

```csv
BP002;2024-01-16;2000.00;123456;Firma B;Příjem;Úhrada za zboží;;;;;;
```

### 3. Platba s VS a nalezenými fakturami
Pro každou nalezenou fakturu se vytvoří samostatný řádek s informacemi o platbě a faktuře.

```csv
BP003;2024-01-17;5000.00;789012;Firma C;Příjem;Úhrada;FAV001;Vydaná;2024-01-10;2024-01-24;5000.00;789012;Firma C;Neuhrazeno
BP003;2024-01-17;5000.00;789012;Firma C;Příjem;Úhrada;FAP015;Přijatá;2024-01-12;2024-01-26;3000.00;789012;Firma C;Částečně uhrazeno
```

## Technické detaily

### API Endpoint
- **URL**: `/api/flexi/export-matching`
- **Metoda**: `GET`
- **Odpověď**: CSV soubor s UTF-8 BOM (pro správné zobrazení v Excelu)

### Formát CSV
- **Oddělovač**: středník (`;`)
- **Kódování**: UTF-8 s BOM
- **Escapování**: Hodnoty obsahující středník, uvozovky nebo nový řádek jsou obaleny uvozovkami
- **Uvozovky v datech**: Zdvojení (`"` → `""`)

### Limity
- Export načítá max. **1000 nespárovaných plateb**
- Pro každou platbu se hledá max. **100 faktur** (vydaných i přijatých)

## Příklad použití v Excelu

1. Otevřete stažený CSV soubor v Excelu
2. Data by měla být automaticky rozdělena do sloupců
3. Pokud ne:
   - Vyberte sloupec A
   - Záložka **Data** → **Text na sloupce**
   - Vyberte **Oddělený** → **Další**
   - Zaškrtněte **Středník** → **Dokončit**

## Filtrace a analýza

V Excelu můžete data filtrovat:

- **Platby bez VS**: Filtr na prázdný sloupec "Platba - VS"
- **Platby bez faktur**: Filtr na prázdný sloupec "Faktura - Kód"
- **Platby s fakturami**: Filtr na neprázdný sloupec "Faktura - Kód"
- **Podle stavu úhrady**: Filtr na sloupec "Faktura - Stav úhrady"

## Časté dotazy

**Q: Proč se platba opakuje víckrát?**
A: Pokud k jedné platbě existuje více faktur se stejným variabilním symbolem, platba se objeví na každém řádku s jinou fakturou.

**Q: Mohu exportovat i spárované platby?**
A: Ne, aktuálně se exportují pouze nespárované platby (kde `sparovano = false`).

**Q: Jak často mohu exportovat data?**
A: Export můžete spouštět kdykoliv. Data jsou vždy aktuální z ABRA Flexi systému.

**Q: Můžu upravit strukturu CSV?**
A: Ano, struktura CSV je definována v souboru `src/app/api/flexi/export-matching/route.ts`.

## Řešení problémů

### CSV se neotevře správně v Excelu
- Ujistěte se, že používáte Excel 2016 nebo novější
- Zkuste otevřít přes **Soubor → Otevřít** místo dvojkliku
- Zkontrolujte, že Excel má nastaveno české regionální nastavení

### Chybí diakritika (háčky, čárky)
- Soubor obsahuje UTF-8 BOM, což by mělo zajistit správné zobrazení
- Pokud problém přetrvává, importujte soubor přes **Data → Z textu/CSV** a vyberte kódování UTF-8

### Export trvá dlouho
- Export může trvat déle při velkém počtu nespárovaných plateb
- Každá platba vyžaduje 2 dotazy do ABRA Flexi (vydané a přijaté faktury)
- Pro 100 plateb může export trvat 30-60 sekund

## Budoucí vylepšení

- [ ] Export i spárovaných plateb (volitelně)
- [ ] Filtrace podle data (od-do)
- [ ] Export do XLSX (Excel) formátu
- [ ] Agregace - souhrn podle firem
- [ ] Export s možností výběru sloupců
