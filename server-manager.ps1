# Server Manager for czela_abra Next.js Application
# PowerShell script with interactive menu for server management

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $ProjectRoot "server.log"
$PidFile = Join-Path $ProjectRoot "server.pid"

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ABRA Flexi Web Application Manager" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Spustit server" -ForegroundColor Green
    Write-Host "2. Zastavit server" -ForegroundColor Yellow
    Write-Host "3. Restartovat server" -ForegroundColor Magenta
    Write-Host "4. Stav serveru" -ForegroundColor Blue
    Write-Host "5. Zobrazit logy" -ForegroundColor White
    Write-Host "6. Instalovat zavislosti (npm install)" -ForegroundColor Cyan
    Write-Host "7. Build produkcni verze" -ForegroundColor DarkYellow
    Write-Host "8. Typecheck" -ForegroundColor DarkCyan
    Write-Host "9. Lint" -ForegroundColor DarkGreen
    Write-Host "0. Konec" -ForegroundColor Red
    Write-Host ""
}

function Get-ServerStatus {
    if (Test-Path $PidFile) {
        $serverPid = Get-Content $PidFile
        try {
            $process = Get-Process -Id $serverPid -ErrorAction Stop
            if ($process.ProcessName -like "node*") {
                return @{
                    Running = $true
                    PID = $serverPid
                    Process = $process
                }
            }
        }
        catch {
            Remove-Item $PidFile -Force
        }
    }
    return @{Running = $false}
}

function Start-DevServer {
    Write-Host "`nKontroluji stav serveru..." -ForegroundColor Yellow
    $status = Get-ServerStatus

    if ($status.Running) {
        Write-Host "Server jiz bezi (PID: $($status.PID))" -ForegroundColor Red
        return
    }

    Write-Host "Spoustim development server..." -ForegroundColor Green

    # Zmena do projektoveho adresare
    Set-Location $ProjectRoot

    # Kontrola .env.local
    if (-not (Test-Path ".env.local")) {
        Write-Host "VAROVANI: Soubor .env.local nebyl nalezen!" -ForegroundColor Red
        Write-Host "Server muze selhat bez spravne konfigurace." -ForegroundColor Yellow
        $continue = Read-Host "Pokracovat? (a/n)"
        if ($continue -ne "a") {
            return
        }
    }

    # Spusteni serveru na pozadi
    $ErrorLogFile = Join-Path $ProjectRoot "server-error.log"

    # Vytvorime pomocny PowerShell script pro spusteni serveru
    $startScriptPath = Join-Path $ProjectRoot "start-server-temp.ps1"
    $startScriptContent = @"
Set-Location '$ProjectRoot'
npm run dev *> '$LogFile'
"@
    $startScriptContent | Out-File -FilePath $startScriptPath -Encoding UTF8

    # Spusteni serveru v novem skrytem PowerShell okne
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "powershell.exe"
    $processInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScriptPath`""
    $processInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $processInfo.CreateNoWindow = $true
    $processInfo.WorkingDirectory = $ProjectRoot

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $null = $process.Start()

    # Ulozeni PID PowerShell procesu
    $psPid = $process.Id
    $jobIdFile = Join-Path $ProjectRoot "server.jobid"
    $psPid | Out-File $jobIdFile

    Write-Host "Cekam na spusteni Node.js serveru..." -ForegroundColor Yellow

    # Pockej na spusteni Node procesu (max 15 sekund)
    $maxWait = 15
    $waited = 0
    $nodePid = $null

    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 1
        $waited++

        # Najdi Node proces, ktery patri k tomuto jobu
        $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
            $_.StartTime -gt (Get-Date).AddSeconds(-20)
        } | Sort-Object StartTime -Descending

        if ($nodeProcesses) {
            $nodePid = $nodeProcesses[0].Id
            # Ulozeni PID Node procesu
            $nodePid | Out-File $PidFile
            break
        }

        if ($waited % 3 -eq 0) {
            Write-Host "  Cekam... ($waited/$maxWait s)" -ForegroundColor Gray
        }
    }

    if (-not $nodePid) {
        Write-Host "  Timeout - Node proces nebyl nalezen" -ForegroundColor Yellow
    }

    Start-Sleep -Seconds 3

    # Overeni, ze server bezi
    $status = Get-ServerStatus
    if ($status.Running) {
        Write-Host "`nServer uspesne spusten (PID: $($status.PID))" -ForegroundColor Green
        Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "Logy: $LogFile" -ForegroundColor Gray
        Write-Host "Chyby: $ErrorLogFile" -ForegroundColor Gray
    }
    else {
        Write-Host "`nNepodarilo se spustit server" -ForegroundColor Red
        Write-Host "Zkontrolujte logy:" -ForegroundColor Yellow
        Write-Host "  Standardni: $LogFile" -ForegroundColor Gray
        Write-Host "  Chybovy: $ErrorLogFile" -ForegroundColor Gray
    }
}

function Stop-DevServer {
    Write-Host "`nZastavuji server..." -ForegroundColor Yellow
    $status = Get-ServerStatus

    if (-not $status.Running) {
        Write-Host "Server nebezi" -ForegroundColor Yellow
        if (Test-Path $PidFile) {
            Remove-Item $PidFile -Force
        }
        # Cleanup files
        $jobIdFile = Join-Path $ProjectRoot "server.jobid"
        if (Test-Path $jobIdFile) {
            Remove-Item $jobIdFile -Force
        }
        $startScriptPath = Join-Path $ProjectRoot "start-server-temp.ps1"
        if (Test-Path $startScriptPath) {
            Remove-Item $startScriptPath -Force
        }
        return
    }

    try {
        # Zastaveni Node procesu
        Stop-Process -Id $status.PID -Force -ErrorAction Stop

        # Zastaveni PowerShell procesu pokud existuje
        $jobIdFile = Join-Path $ProjectRoot "server.jobid"
        if (Test-Path $jobIdFile) {
            $psPid = Get-Content $jobIdFile
            try {
                Stop-Process -Id $psPid -Force -ErrorAction SilentlyContinue
            }
            catch {
                # Ignore - proces uz neexistuje
            }
            Remove-Item $jobIdFile -Force
        }

        # Cleanup temp script
        $startScriptPath = Join-Path $ProjectRoot "start-server-temp.ps1"
        if (Test-Path $startScriptPath) {
            Remove-Item $startScriptPath -Force
        }

        Remove-Item $PidFile -Force
        Write-Host "Server zastaven" -ForegroundColor Green
    }
    catch {
        Write-Host "Chyba pri zastavovani serveru: $_" -ForegroundColor Red
    }
}

function Restart-DevServer {
    Write-Host "`nRestartuji server..." -ForegroundColor Magenta
    Stop-DevServer
    Start-Sleep -Seconds 2
    Start-DevServer
}

function Show-ServerStatus {
    Write-Host "`nStav serveru:" -ForegroundColor Cyan
    $status = Get-ServerStatus

    if ($status.Running) {
        Write-Host "  Status: " -NoNewline
        Write-Host "BEZI" -ForegroundColor Green
        Write-Host "  PID: $($status.PID)" -ForegroundColor Gray
        Write-Host "  URL: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "  CPU: $([math]::Round($status.Process.CPU, 2))s" -ForegroundColor Gray
        Write-Host "  Pamet: $([math]::Round($status.Process.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Gray
    }
    else {
        Write-Host "  Status: " -NoNewline
        Write-Host "ZASTAVENO" -ForegroundColor Red
    }
}

function Show-Logs {
    Write-Host "`nLogy serveru:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Gray

    Write-Host "`n[STANDARDNI VYSTUP]" -ForegroundColor Green
    if (Test-Path $LogFile) {
        Get-Content $LogFile -Tail 20
    }
    else {
        Write-Host "Log soubor neexistuje" -ForegroundColor Yellow
    }

    $ErrorLogFile = Join-Path $ProjectRoot "server-error.log"
    Write-Host "`n[CHYBOVY VYSTUP]" -ForegroundColor Red
    if (Test-Path $ErrorLogFile) {
        Get-Content $ErrorLogFile -Tail 20
    }
    else {
        Write-Host "Error log soubor neexistuje" -ForegroundColor Yellow
    }

    Write-Host "========================================" -ForegroundColor Gray
    Write-Host "`nPro sledovani v realnem case:" -ForegroundColor Gray
    Write-Host "  Get-Content '$LogFile' -Wait -Tail 20" -ForegroundColor DarkGray
    Write-Host "  Get-Content '$ErrorLogFile' -Wait -Tail 20" -ForegroundColor DarkGray
}

function Invoke-Build {
    Write-Host "`nSpoustim produkcni build..." -ForegroundColor Yellow
    Set-Location $ProjectRoot

    $result = & npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nBuild dokoncen uspesne" -ForegroundColor Green
    }
    else {
        Write-Host "`nBuild selhal" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
}

function Invoke-Typecheck {
    Write-Host "`nSpoustim TypeScript kontrolu..." -ForegroundColor Yellow
    Set-Location $ProjectRoot

    $result = & npm run typecheck 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nTypecheck prosel bez chyb" -ForegroundColor Green
    }
    else {
        Write-Host "`nTypecheck nasel chyby" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
}

function Invoke-Lint {
    Write-Host "`nSpoustim ESLint..." -ForegroundColor Yellow
    Set-Location $ProjectRoot

    $result = & npm run lint 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nLint prosel bez chyb" -ForegroundColor Green
    }
    else {
        Write-Host "`nLint nasel chyby" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
}

function Install-Dependencies {
    Write-Host "`nInstaluji zavislosti projektu..." -ForegroundColor Yellow
    Set-Location $ProjectRoot

    # Kontrola package.json
    if (-not (Test-Path "package.json")) {
        Write-Host "`nERROR: package.json nebyl nalezen!" -ForegroundColor Red
        return
    }

    Write-Host "Spoustim: npm install" -ForegroundColor Gray
    Write-Host "Toto muze trvat nekolik minut..." -ForegroundColor Gray
    Write-Host ""

    try {
        # Spusteni npm install
        & npm install

        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nZavislosti byly uspesne nainstalovany!" -ForegroundColor Green
            Write-Host "Muzete nyni spustit server (volba 1)." -ForegroundColor Cyan
        }
        else {
            Write-Host "`nInstalace selhala!" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "`nChyba pri instalaci: $_" -ForegroundColor Red
    }
}

# Hlavni smycka
do {
    Show-Menu
    Show-ServerStatus
    Write-Host ""
    $choice = Read-Host "Vyberte akci (0-9)"

    switch ($choice) {
        "1" { Start-DevServer }
        "2" { Stop-DevServer }
        "3" { Restart-DevServer }
        "4" { Show-ServerStatus }
        "5" { Show-Logs }
        "6" { Install-Dependencies }
        "7" { Invoke-Build }
        "8" { Invoke-Typecheck }
        "9" { Invoke-Lint }
        "0" {
            $status = Get-ServerStatus
            if ($status.Running) {
                Write-Host "`nServer stale bezi. Chcete ho zastavit pred ukoncenim? (a/n): " -NoNewline -ForegroundColor Yellow
                $stopServer = Read-Host
                if ($stopServer -eq "a") {
                    Stop-DevServer
                }
            }
            Write-Host "`nNashledanou!" -ForegroundColor Cyan
            return
        }
        default {
            Write-Host "`nNeplatna volba. Zkuste to znovu." -ForegroundColor Red
        }
    }

    if ($choice -ne "0") {
        Write-Host "`nStisknete Enter pro pokracovani..." -ForegroundColor Gray
        Read-Host
    }
} while ($true)
