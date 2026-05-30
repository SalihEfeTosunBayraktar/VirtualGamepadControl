@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title VirtualGamepadControl - Setup & Start

:: Scriptin bulundugu klasoru kaydet (sona ters slash ile gelir)
set "SCRIPT_DIR=%~dp0"

echo.
echo  ============================================
echo   VirtualGamepadControl - Kurulum ve Baslatma
echo  ============================================
echo.

:: --- Yonetici yetkisi kontrolu ---------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [HATA] Bu script yonetici olarak calistirilmali!
    echo.
    echo  setup.bat dosyasina sag tiklayin - "Yonetici olarak calistir"
    echo.
    pause
    exit /b 1
)
echo  [OK] Yonetici yetkileri dogrulandi
echo.

:: --- Node.js kontrolu -------------------------------------------------------
echo  [1/3] Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo  Node.js bulunamadi, indiriliyor...

    set "PS_FILE=%TEMP%\install_node.ps1"
    (
        echo $url = 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi'
        echo $out = Join-Path $env:TEMP 'nodejs.msi'
        echo Write-Host '  Indiriliyor: Node.js v20 LTS...'
        echo Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        echo Write-Host '  Kuruluyor...'
        echo Start-Process msiexec -ArgumentList '/i',$out,'/quiet','/norestart' -Wait
        echo Write-Host '  Node.js kuruldu!'
    ) > "!PS_FILE!"
    powershell -NoProfile -ExecutionPolicy Bypass -File "!PS_FILE!"
    del "!PS_FILE!" >nul 2>&1

    :: PATH'i yenile
    for /f "usebackq tokens=2*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul`) do (
        set "PATH=%%B;%PATH%"
    )
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"

    node --version >nul 2>&1
    if !errorLevel! neq 0 (
        echo  [HATA] Node.js kurulumu basarisiz!
        echo  Manuel kurulum: https://nodejs.org/
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% hazir
echo.

:: --- ViGEmBus kontrolu -----------------------------------------------------
echo  [2/3] ViGEmBus sanal gamepad surucu kontrol ediliyor...
set "VIGEM_FOUND=0"

:: 1) Farkli servis adlarini dene
for %%S in (ViGEmBus ViGEmBus10 ViGem) do (
    sc query %%S >nul 2>&1
    if !errorLevel! equ 0 set "VIGEM_FOUND=1"
)

:: 2) Registry kontrolu
if "!VIGEM_FOUND!"=="0" (
    reg query "HKLM\SYSTEM\CurrentControlSet\Services\ViGEmBus" >nul 2>&1
    if !errorLevel! equ 0 set "VIGEM_FOUND=1"
)
if "!VIGEM_FOUND!"=="0" (
    reg query "HKLM\SYSTEM\CurrentControlSet\Services\ViGEmBus10" >nul 2>&1
    if !errorLevel! equ 0 set "VIGEM_FOUND=1"
)
if "!VIGEM_FOUND!"=="0" (
    reg query "HKLM\SOFTWARE\Nefarius Software Solutions e.U.\ViGEmBus" >nul 2>&1
    if !errorLevel! equ 0 set "VIGEM_FOUND=1"
)

:: 3) PowerShell ile PnP / kurulu uygulama kontrolu
if "!VIGEM_FOUND!"=="0" (
    set "PS_FILE=%TEMP%\check_vigem.ps1"
    (
        echo $found = $false
        echo try {
        echo     $d = Get-PnpDevice -ErrorAction SilentlyContinue ^| Where-Object { $_.FriendlyName -match 'ViGEm' }
        echo     if ($d) { $found = $true }
        echo } catch {}
        echo try {
        echo     $paths = @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'^)
        echo     $a = Get-ItemProperty $paths -ErrorAction SilentlyContinue ^| Where-Object { $_.DisplayName -match 'ViGEm' }
        echo     if ($a) { $found = $true }
        echo } catch {}
        echo if ($found) { exit 0 } else { exit 1 }
    ) > "!PS_FILE!"
    powershell -NoProfile -ExecutionPolicy Bypass -File "!PS_FILE!" >nul 2>&1
    if !errorLevel! equ 0 set "VIGEM_FOUND=1"
    del "!PS_FILE!" >nul 2>&1
)

:: 4) Driver dosyasi kontrolu
if "!VIGEM_FOUND!"=="0" (
    if exist "%SystemRoot%\System32\drivers\ViGEmBus.sys"   set "VIGEM_FOUND=1"
    if exist "%SystemRoot%\System32\drivers\ViGEmBus10.sys" set "VIGEM_FOUND=1"
)

if "!VIGEM_FOUND!"=="1" (
    echo  [OK] ViGEmBus surucu tespit edildi
) else (
    echo  ViGEmBus bulunamadi, indiriliyor...
    echo.

    set "PS_FILE=%TEMP%\install_vigem.ps1"
    (
        echo try {
        echo     $api = 'https://api.github.com/repos/nefarius/ViGEmBus/releases/latest'
        echo     $headers = @{'User-Agent'='VirtualGamepadControl/1.0'}
        echo     $rel = Invoke-RestMethod -Uri $api -Headers $headers
        echo     $asset = $rel.assets ^| Where-Object { $_.name -match 'Setup.*x64^|x64.*Setup' } ^| Select-Object -First 1
        echo     if (-not $asset) { $asset = $rel.assets ^| Where-Object { $_.name -match '\.exe$' } ^| Select-Object -First 1 }
        echo     if (-not $asset) { throw 'Indirme linki bulunamadi' }
        echo     $out = Join-Path $env:TEMP 'ViGEmBus_Setup.exe'
        echo     Write-Host ('  Indiriliyor: ' + $asset.name + '...')
        echo     Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $out -UseBasicParsing
        echo     Write-Host '  Kuruluyor...'
        echo     Start-Process -FilePath $out -ArgumentList '/quiet','/norestart' -Wait
        echo     Write-Host '  ViGEmBus kuruldu!'
        echo } catch {
        echo     Write-Host ('  HATA: ' + $_.Exception.Message)
        echo     Write-Host '  Manuel kurulum: https://github.com/nefarius/ViGEmBus/releases'
        echo }
    ) > "!PS_FILE!"
    powershell -NoProfile -ExecutionPolicy Bypass -File "!PS_FILE!"
    del "!PS_FILE!" >nul 2>&1

    timeout /t 2 /nobreak >nul

    sc query ViGEmBus >nul 2>&1
    if !errorLevel! equ 0 (
        echo  [OK] ViGEmBus basariyla kuruldu
    ) else (
        echo  [UYARI] ViGEmBus dogrulanamadi - Demo modda calisacak
        echo  Gercek gamepad ciktisi icin: https://github.com/nefarius/ViGEmBus/releases
    )
)
echo.

:: --- npm install ------------------------------------------------------------
echo  [3/3] Node.js bagimliliklari kuruluyor...
cd /d "%SCRIPT_DIR%server"

if not exist "node_modules" (
    call npm install
    if !errorLevel! neq 0 (
        echo  [HATA] npm install basarisiz!
        cd /d "%SCRIPT_DIR%"
        pause
        exit /b 1
    )
) else (
    echo  [OK] Bagimliliklar zaten kurulu (node_modules mevcut)
)
cd /d "%SCRIPT_DIR%"
echo.

:: --- Baslatma ---------------------------------------------------------------
echo  ==========================================
echo   Sunucu baslatiliyor...
echo  ==========================================
echo.
node "%SCRIPT_DIR%server\index.js"

echo.
echo  Sunucu durdu.
pause
