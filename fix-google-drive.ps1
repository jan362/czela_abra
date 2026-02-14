# Fix Google Drive Sync Issues
# Vytvori .gdignore soubory pro vylouceni node_modules a dalsiho z Google Drive sync

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Google Drive Sync Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "PROBLEM: Google Drive synchronizace muze zpusobovat problemy s Node.js projekty" -ForegroundColor Yellow
Write-Host ""
Write-Host "Reseni:" -ForegroundColor Cyan
Write-Host "  1. Vyloucit node_modules z Google Drive synchronizace" -ForegroundColor White
Write-Host "  2. Vyloucit .next (build cache) z synchronizace" -ForegroundColor White
Write-Host "  3. Vyloucit log soubory" -ForegroundColor White
Write-Host ""

# Vytvorit .gdignore soubory (pokud Google Drive Desktop podporuje)
# Poznamka: Google Drive Desktop nema oficialni .gdignore podporu
# Alternativa je rucni vylouceni pres nastaveni

Write-Host "DULEZITE KROKY:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Otevrete Google Drive Desktop aplikaci" -ForegroundColor White
Write-Host "2. Kliknete na ikonu Google Drive v system tray (vedle hodin)" -ForegroundColor White
Write-Host "3. Kliknete na ikonu nastaveni (ozubene kolo)" -ForegroundColor White
Write-Host "4. Zvolte 'Preferences' nebo 'Nastaveni'" -ForegroundColor White
Write-Host "5. Prejdete na 'Google Drive'" -ForegroundColor White
Write-Host "6. Kliknete na 'Folder preferences' nebo 'Nastaveni slozek'" -ForegroundColor White
Write-Host "7. Najdete tuto slozku a vyloucte z synchronizace:" -ForegroundColor White
Write-Host "   - node_modules" -ForegroundColor Cyan
Write-Host "   - .next" -ForegroundColor Cyan
Write-Host ""

Write-Host "NEBO LEPSI RESENI - Presunout projekt na lokalni disk:" -ForegroundColor Green
Write-Host ""

# Navrhnout lepsi umisteni
$betterLocations = @(
    "C:\Projects\czela_abra",
    "C:\Dev\czela_abra",
    "$env:USERPROFILE\Projects\czela_abra",
    "D:\Projects\czela_abra"
)

Write-Host "Doporucene umisteni (MIMO Google Drive):" -ForegroundColor Cyan
foreach ($loc in $betterLocations) {
    if (Test-Path (Split-Path $loc -Parent)) {
        Write-Host "  $loc (dostupne)" -ForegroundColor Green
    }
    else {
        Write-Host "  $loc" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Chcete presunout projekt na lokalni disk? (a/n): " -NoNewline -ForegroundColor Yellow
$move = Read-Host

if ($move -eq "a") {
    Write-Host ""
    Write-Host "Vyberte cilovou cestu (nebo nechte prazdne pro C:\Projects\czela_abra): " -NoNewline
    $targetPath = Read-Host

    if ([string]::IsNullOrWhiteSpace($targetPath)) {
        $targetPath = "C:\Projects\czela_abra"
    }

    # Vytvorit cilovy adresar
    $targetDir = Split-Path $targetPath -Parent
    if (-not (Test-Path $targetDir)) {
        Write-Host "Vytvarim adresar: $targetDir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    Write-Host ""
    Write-Host "Presouvam projekt do: $targetPath" -ForegroundColor Yellow
    Write-Host "Toto muze trvat nekolik minut..." -ForegroundColor Gray
    Write-Host ""

    try {
        # Vyloucit node_modules a .next z kopirovani (preinstalujeme)
        $excludeDirs = @("node_modules", ".next", "server.log", "server-error.log", "server.pid", "server.jobid", "start-server-temp.ps1")

        Write-Host "Kopiruji soubory (vynechavam node_modules a .next)..." -ForegroundColor Gray

        # Pouzit robocopy pro efektivni kopirovani
        $excludeParams = $excludeDirs | ForEach-Object { "/XD", $_ }

        # Robocopy s vyloucenim
        robocopy $ProjectRoot $targetPath /E /NFL /NDL /NJH /XD "node_modules" ".next" /XF "server.log" "server-error.log" "server.pid" "server.jobid" "start-server-temp.ps1" | Out-Null

        if (Test-Path $targetPath) {
            Write-Host ""
            Write-Host "Projekt byl uspesne presunut!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Dalsi kroky:" -ForegroundColor Cyan
            Write-Host "  1. Prejdete do noveho adresare:" -ForegroundColor White
            Write-Host "     cd '$targetPath'" -ForegroundColor Gray
            Write-Host "  2. Spustte setup:" -ForegroundColor White
            Write-Host "     .\setup-project.ps1" -ForegroundColor Gray
            Write-Host "  3. Spustte server manager:" -ForegroundColor White
            Write-Host "     .\server-manager.ps1" -ForegroundColor Gray
            Write-Host ""
            Write-Host "POZNAMKA: Puvodni slozku muzete smazat po overeni, ze vse funguje." -ForegroundColor Yellow
            Write-Host ""
        }
    }
    catch {
        Write-Host "CHYBA pri presouvani: $_" -ForegroundColor Red
    }
}
else {
    Write-Host ""
    Write-Host "OK - projekt zustane na Google Drive" -ForegroundColor Yellow
    Write-Host "DOPORUCENI: Vyloucte node_modules a .next z Google Drive synchronizace" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Read-Host "Stisknete Enter pro ukonceni"
