@echo off
setlocal enabledelayedexpansion
title VirtualGamepadControl — Setup ^& Start
chcp 65001 > nul

echo.
echo   ╔══════════════════════════════════════════╗
echo   ║        🎮  VirtualGamepadControl         ║
echo   ║         Kurulum ve Başlatma              ║
echo   ╚══════════════════════════════════════════╝
echo.

:: ─── Yönetici yetkisi kontrolü ──────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo   [HATA] Bu script yönetici olarak çalıştırılmalı!
    echo.
    echo   setup.bat dosyasına sağ tıklayın → "Yönetici olarak çalıştır"
    echo.
    pause
    exit /b 1
)
echo   ✅  Yönetici yetkileri doğrulandı
echo.

:: ─── Node.js kontrolü ───────────────────────────────────────────────────────
echo   [1/3] Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo   ⬇️  Node.js bulunamadı, indiriliyor...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "try { " ^
        "  $url = 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi'; " ^
        "  $out = Join-Path $env:TEMP 'nodejs.msi'; " ^
        "  Write-Host '  İndiriliyor: Node.js v20 LTS...'; " ^
        "  Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing; " ^
        "  Write-Host '  Kuruluyor...'; " ^
        "  Start-Process msiexec -ArgumentList '/i',$out,'/quiet','/norestart' -Wait; " ^
        "  Write-Host '  Node.js kuruldu!'; " ^
        "} catch { Write-Host ('HATA: ' + $_.Exception.Message) }"

    :: PATH'i yenile
    for /f "usebackq tokens=2*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul`) do (
        set "PATH=%%B;%PATH%"
    )
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"

    node --version >nul 2>&1
    if !errorLevel! neq 0 (
        echo   [HATA] Node.js kurulumu başarısız!
        echo   Manuel kurulum: https://nodejs.org/
        pause & exit /b 1
    )
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo   ✅  Node.js %NODE_VER% hazır
echo.

:: ─── ViGEmBus kontrolü ──────────────────────────────────────────────────────
echo   [2/3] ViGEmBus sanal gamepad sürücüsü kontrol ediliyor...

sc query ViGEmBus >nul 2>&1
if %errorLevel% equ 0 (
    echo   ✅  ViGEmBus sürücüsü zaten kurulu
) else (
    :: Kayıt defteri ile de kontrol et
    reg query "HKLM\SYSTEM\CurrentControlSet\Services\ViGEmBus" >nul 2>&1
    if !errorLevel! equ 0 (
        echo   ✅  ViGEmBus kayıt defterinde mevcut
    ) else (
        echo   ⬇️  ViGEmBus bulunamadı, indiriliyor...
        echo.
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "try { " ^
            "  $api     = 'https://api.github.com/repos/nefarius/ViGEmBus/releases/latest'; " ^
            "  $headers = @{'User-Agent'='VirtualGamepadControl/1.0'}; " ^
            "  $rel     = Invoke-RestMethod -Uri $api -Headers $headers; " ^
            "  $asset   = $rel.assets | Where-Object { $_.name -match 'Setup.*x64|x64.*Setup' } | Select-Object -First 1; " ^
            "  if (-not $asset) { $asset = $rel.assets | Where-Object { $_.name -match '\.exe$' } | Select-Object -First 1 }; " ^
            "  if (-not $asset) { throw 'İndirme linki bulunamadı' }; " ^
            "  $url = $asset.browser_download_url; " ^
            "  $out = Join-Path $env:TEMP 'ViGEmBus_Setup.exe'; " ^
            "  Write-Host ('  İndiriliyor: ' + $asset.name + '...'); " ^
            "  Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing; " ^
            "  Write-Host '  Kuruluyor (sessiz mod)...'; " ^
            "  Start-Process -FilePath $out -ArgumentList '/quiet','/norestart' -Wait; " ^
            "  Write-Host '  ✅ ViGEmBus kuruldu!'; " ^
            "} catch { " ^
            "  Write-Host ('  ⚠️  HATA: ' + $_.Exception.Message) -ForegroundColor Yellow; " ^
            "  Write-Host '  Manuel kurulum: https://github.com/nefarius/ViGEmBus/releases' -ForegroundColor Cyan; " ^
            "}"

        timeout /t 2 /nobreak >nul

        sc query ViGEmBus >nul 2>&1
        if !errorLevel! equ 0 (
            echo   ✅  ViGEmBus başarıyla kuruldu
        ) else (
            echo   ⚠️  ViGEmBus doğrulanamadı — Demo modda çalışacak
            echo      Gerçek gamepad çıktısı için: https://github.com/nefarius/ViGEmBus/releases
        )
    )
)
echo.

:: ─── npm install ────────────────────────────────────────────────────────────
echo   [3/3] Node.js bağımlılıkları kuruluyor...
cd /d "%~dp0server"

if not exist "node_modules" (
    call npm install
    if !errorLevel! neq 0 (
        echo   [HATA] npm install başarısız!
        cd /d "%~dp0"
        pause & exit /b 1
    )
) else (
    echo   ✅  Bağımlılıklar zaten kurulu ^(node_modules mevcut^)
)
cd /d "%~dp0"
echo.

:: ─── Başlat ─────────────────────────────────────────────────────────────────
echo   ══════════════════════════════════════════
echo   🚀  Sunucu başlatılıyor...
echo   ══════════════════════════════════════════
echo.
node server\index.js

echo.
echo   Sunucu durdu.
pause
