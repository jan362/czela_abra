# Offline Installation Script
# Instaluje npm zavislosti mimo Google Drive a pak je presune zpet

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OFFLINE NPM INSTALACE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TempDir = "C:\_projekty\czela_abra_temp"
$NodeModulesSource = Join-Path $SourceDir "node_modules"
$NodeModulesTemp = Join-Path $TempDir "node_modules"

# ============================================
# KROK 1: Kontrola Node.js
# ============================================
Write-Host "KROK 1/6: Kontrola Node.js a npm..." -ForegroundColor Yellow

try {
    $nodeVersion = & node --version 2>&1
    $npmVersion = & npm --version 2>&1
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "  npm: v$npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "  CHYBA: Node.js nebo npm nejsou nainstalovany!" -ForegroundColor Red
    Write-Host "  Spustte nejdriv: .\install-nodejs.ps1" -ForegroundColor Yellow
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

Write-Host ""

# ============================================
# KROK 2: Priprava docasneho adresare
# ============================================
Write-Host "KROK 2/6: Priprava docasneho adresare..." -ForegroundColor Yellow

# Vytvorit C:\_projekty pokud neexistuje
if (-not (Test-Path "C:\_projekty")) {
    Write-Host "  Vytvarim: C:\_projekty" -ForegroundColor Gray
    New-Item -ItemType Directory -Path "C:\_projekty" -Force | Out-Null
}

# Smazat stary temp adresar pokud existuje
if (Test-Path $TempDir) {
    Write-Host "  Mazu stary temp adresar..." -ForegroundColor Gray
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Vytvorit novy temp adresar
Write-Host "  Vytvarim: $TempDir" -ForegroundColor Gray
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

Write-Host "  OK: Docasny adresar pripraven" -ForegroundColor Green
Write-Host ""

# ============================================
# KROK 3: Kopirovani package.json a dalsiho
# ============================================
Write-Host "KROK 3/6: Kopirovani konfiguracnich souboru..." -ForegroundColor Yellow

$filesToCopy = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    ".npmrc"
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $SourceDir $file
    if (Test-Path $sourcePath) {
        Write-Host "  Kopiruji: $file" -ForegroundColor Gray
        Copy-Item -Path $sourcePath -Destination $TempDir -Force
    }
}

Write-Host "  OK: Soubory zkopirovany" -ForegroundColor Green
Write-Host ""

# ============================================
# KROK 4: Instalace zavislosti v temp adresari
# ============================================
Write-Host "KROK 4/6: Instalace zavislosti (v C:\_projekty)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Pracovni adresar: $TempDir" -ForegroundColor Gray
Write-Host "  POZOR: Toto muze trvat 3-10 minut!" -ForegroundColor Yellow
Write-Host ""

Set-Location $TempDir

# Nastavit npm registry
& npm config set registry https://registry.npmjs.org/

Write-Host "  Spoustim: npm install" -ForegroundColor Gray
Write-Host ""

$installStart = Get-Date

try {
    & npm install --loglevel=error

    if ($LASTEXITCODE -eq 0) {
        $installEnd = Get-Date
        $duration = ($installEnd - $installStart).TotalSeconds

        Write-Host ""
        Write-Host "  OK: Instalace dokoncena za $([math]::Round($duration, 1)) sekund" -ForegroundColor Green

        # Overit node_modules
        if (Test-Path $NodeModulesTemp) {
            $itemCount = (Get-ChildItem $NodeModulesTemp -Directory).Count
            Write-Host "  Nainstalovano balicku: $itemCount" -ForegroundColor Gray
        }
    }
    else {
        Write-Host ""
        Write-Host "  CHYBA: Instalace selhala!" -ForegroundColor Red
        Read-Host "Stisknete Enter pro ukonceni"
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "  CHYBA: $_" -ForegroundColor Red
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

Write-Host ""

# ============================================
# KROK 5: Smazani stareho node_modules v Google Drive
# ============================================
Write-Host "KROK 5/6: Priprava ciloveho adresare..." -ForegroundColor Yellow

if (Test-Path $NodeModulesSource) {
    Write-Host "  Mazu stary node_modules v Google Drive..." -ForegroundColor Gray
    Write-Host "  Cesta: $NodeModulesSource" -ForegroundColor DarkGray

    try {
        Remove-Item -Path $NodeModulesSource -Recurse -Force -ErrorAction Stop
        Write-Host "  OK: Stary node_modules smazan" -ForegroundColor Green
    }
    catch {
        Write-Host "  VAROVANI: Nepodarilo se smazat stary node_modules" -ForegroundColor Yellow
        Write-Host "  Zkuste rucne smazat: $NodeModulesSource" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Pokracovat? (a/n)"
        if ($continue -ne "a") {
            exit 1
        }
    }
}

Write-Host ""

# ============================================
# KROK 6: Presun node_modules do Google Drive
# ============================================
Write-Host "KROK 6/6: Presun node_modules do Google Drive..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Z: $NodeModulesTemp" -ForegroundColor Gray
Write-Host "  Do: $NodeModulesSource" -ForegroundColor Gray
Write-Host ""
Write-Host "  POZOR: Toto muze trvat 5-15 minut kvuli Google Drive!" -ForegroundColor Yellow
Write-Host "  Google Drive bude synchronizovat tisice souboru..." -ForegroundColor Yellow
Write-Host ""

$moveStart = Get-Date

try {
    # Pouzit Move-Item (rychlejsi nez Copy + Delete)
    Write-Host "  Presouvam..." -ForegroundColor Gray

    # Na stejnem disku pouzit robocopy pro lepsi performance
    # Ale mezi C: a H: musime pouzit Move/Copy

    # Nejdriv zkusit rychly presun
    Move-Item -Path $NodeModulesTemp -Destination $NodeModulesSource -Force -ErrorAction Stop

    $moveEnd = Get-Date
    $duration = ($moveEnd - $moveStart).TotalSeconds

    Write-Host ""
    Write-Host "  OK: Presun dokoncen za $([math]::Round($duration, 1)) sekund" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "  Rychly presun selhal, zkousim kopirovani..." -ForegroundColor Yellow

    try {
        # Fallback: Copy + Delete
        Copy-Item -Path $NodeModulesTemp -Destination $NodeModulesSource -Recurse -Force
        Remove-Item -Path $NodeModulesTemp -Recurse -Force -ErrorAction SilentlyContinue

        $moveEnd = Get-Date
        $duration = ($moveEnd - $moveStart).TotalSeconds

        Write-Host ""
        Write-Host "  OK: Kopirovani dokonceno za $([math]::Round($duration, 1)) sekund" -ForegroundColor Green
    }
    catch {
        Write-Host ""
        Write-Host "  CHYBA: Presun selhal: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "  RUCNI KROK:" -ForegroundColor Yellow
        Write-Host "  1. Rucne presunte slozku:" -ForegroundColor White
        Write-Host "     Z: $NodeModulesTemp" -ForegroundColor Gray
        Write-Host "     Do: $NodeModulesSource" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Stisknete Enter pro ukonceni"
        exit 1
    }
}

Write-Host ""

# ============================================
# KROK 7: Cleanup temp adresare
# ============================================
Write-Host "Cleanup: Mazu docasny adresar..." -ForegroundColor Gray

Set-Location $SourceDir

if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""

# ============================================
# OVERENI
# ============================================
Write-Host "Overeni instalace..." -ForegroundColor Yellow

$nextPath = Join-Path $NodeModulesSource ".bin\next.cmd"
if (Test-Path $nextPath) {
    Write-Host "  Next.js: NAINSTALOVANO" -ForegroundColor Green
}
else {
    Write-Host "  VAROVANI: Next.js nebyl nalezen!" -ForegroundColor Red
}

if (Test-Path $NodeModulesSource) {
    $itemCount = (Get-ChildItem $NodeModulesSource -Directory -ErrorAction SilentlyContinue).Count
    Write-Host "  Pocet balicku: $itemCount" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# HOTOVO
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "  INSTALACE DOKONCENA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Co se stalo:" -ForegroundColor Cyan
Write-Host "  1. Zavislosti byly nainstalovany v C:\_projekty (rychle)" -ForegroundColor White
Write-Host "  2. node_modules byl presunut do Google Drive" -ForegroundColor White
Write-Host "  3. Docasne soubory byly vymazany" -ForegroundColor White
Write-Host ""

Write-Host "Dalsi kroky:" -ForegroundColor Cyan
Write-Host "  1. Zkontrolujte .env.local (pristupove udaje k ABRA Flexi)" -ForegroundColor White
Write-Host "  2. Spustte server manager: .\server-manager.ps1" -ForegroundColor White
Write-Host "  3. Vyberte volbu 1 (Spustit server)" -ForegroundColor White
Write-Host ""

Write-Host "POZNAMKA: Google Drive bude synchronizovat node_modules na pozadi." -ForegroundColor Yellow
Write-Host "To muze trvat nekolik minut, ale neovlivni to beh serveru." -ForegroundColor Yellow
Write-Host ""

# Nabidnout test spusteni
Write-Host "Chcete zkusit spustit server ted? (a/n): " -NoNewline -ForegroundColor Yellow
$testRun = Read-Host

if ($testRun -eq "a") {
    Write-Host ""
    Write-Host "Spoustim test serveru..." -ForegroundColor Yellow
    Write-Host "Stisknete Ctrl+C pro zastaveni" -ForegroundColor Gray
    Write-Host ""

    Start-Sleep -Seconds 2

    try {
        Set-Location $SourceDir
        & npm run dev
    }
    catch {
        Write-Host ""
        Write-Host "Server byl zastaven" -ForegroundColor Yellow
    }
}
else {
    Write-Host ""
    Write-Host "Pro spusteni serveru pouzijte: .\server-manager.ps1" -ForegroundColor Cyan
    Write-Host ""
}

Read-Host "Stisknete Enter pro ukonceni"
