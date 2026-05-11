# ═══════════════════════════════════════════════════════════════
#  IPTV TREX — Vollautomatischer APK Build
#  Schritt 1: Next.js statischer Export (out/)
#  Schritt 2: 404.html SPA-Fallback erzeugen
#  Schritt 3: Capacitor sync (Dateien in android/ kopieren)
#  Schritt 4: Gradle APK bauen (debug oder release)
#  Ausgabe:   android/app/build/outputs/apk/debug/app-debug.apk
# ═══════════════════════════════════════════════════════════════

param(
  [string]$Variant = "debug"    # debug oder release
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Set-Location $Root

# ── Java & Android SDK auto-detect ────────────────────────────
if (-not $env:JAVA_HOME) {
  $candidateJava = "C:\Program Files\Android\Android Studio\jbr"
  if (Test-Path $candidateJava) {
    $env:JAVA_HOME = $candidateJava
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    Write-Host "   → JAVA_HOME: $env:JAVA_HOME" -ForegroundColor DarkGray
  }
}
if (-not $env:ANDROID_HOME) {
  $candidateSdk = "$env:LOCALAPPDATA\Android\Sdk"
  if (Test-Path $candidateSdk) {
    $env:ANDROID_HOME = $candidateSdk
    Write-Host "   → ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor DarkGray
  }
}
# Write local.properties for Gradle (forward slashes, no BOM)
if ($env:ANDROID_HOME) {
  $localProps = "$Root\android\local.properties"
  $sdkForward = $env:ANDROID_HOME.Replace("\", "/")
  [System.IO.File]::WriteAllText($localProps, "sdk.dir=$sdkForward`n", [System.Text.Encoding]::UTF8)
}
Write-Host ""
Write-Host "╔══════════════════════════════════════╗"
Write-Host "║   IPTV TREX  —  APK Build Pipeline   ║"
Write-Host "╚══════════════════════════════════════╝"
Write-Host ""

# ── 1. Next.js statischer Export ─────────────────────────────
Write-Host "[1/4] Next.js Static Export..."
$env:NEXT_PUBLIC_APK_BUILD = "1"

# Prisma generieren (brauchen wir auch für apk build wegen imports)
npx prisma generate 2>&1 | Out-Null

# API-Routen temporär ausblenden (nicht kompatibel mit output:'export')
$apiDir      = "$Root\src\app\api"
$apiDirTmp   = "$Root\src\app\_api_tmp"
$adminDir    = "$Root\src\app\(admin)"
$adminDirTmp = "$Root\src\app\_admin_tmp"
$apiMoved    = $false
$adminMoved  = $false
if (Test-Path $apiDir) {
  Rename-Item $apiDir $apiDirTmp -Force
  $apiMoved = $true
  Write-Host "   → API-Routen temporär versteckt" -ForegroundColor DarkGray
}
if (Test-Path $adminDir) {
  Rename-Item $adminDir $adminDirTmp -Force
  $adminMoved = $true
  Write-Host "   → Admin-Seiten temporär versteckt" -ForegroundColor DarkGray
}

try {
  # Statischen Export (NEXT_PUBLIC_APK_BUILD=1 aktiviert output:'export' in next.config.ts)
  npx next build
  if ($LASTEXITCODE -ne 0) { throw "Next.js Build fehlgeschlagen!" }
} finally {
  # API-Routen und Admin-Seiten immer wiederherstellen
  if ($apiMoved -and (Test-Path $apiDirTmp)) {
    Rename-Item $apiDirTmp $apiDir -Force
    Write-Host "   → API-Routen wiederhergestellt" -ForegroundColor DarkGray
  }
  if ($adminMoved -and (Test-Path $adminDirTmp)) {
    Rename-Item $adminDirTmp $adminDir -Force
    Write-Host "   → Admin-Seiten wiederhergestellt" -ForegroundColor DarkGray
  }
}

Write-Host "   ✓ Static Export in out/" -ForegroundColor Green

# ── 2. Fix Hydration + SPA-Fallback ─────────────────────────
Write-Host "[2/5] Fix Hydration für Capacitor..."

# Replace pre-rendered DOM in body with empty div to avoid React #418 hydration errors.
# Keep all <script> tags intact — React will render client-side.
Get-ChildItem "out" -Recurse -Filter "index.html" | ForEach-Object {
  $content = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
  # Replace content between <body...> and first <script with just an empty div
  $patched = [regex]::Replace($content,
    '(<body[^>]*>).*?(<script\b)',
    '$1<div id="__next"></div>$2',
    'Singleline')
  if ($patched -ne $content) {
    [System.IO.File]::WriteAllText($_.FullName, $patched, (New-Object System.Text.UTF8Encoding $false))
  }
}
Write-Host "   ✓ Hydration-Fix angewendet" -ForegroundColor Green

Write-Host "[3/5] SPA Fallback erzeugen..."
if (Test-Path "out/index.html") {
  Copy-Item "out/index.html" "out/404.html" -Force
  Write-Host "   ✓ out/404.html erstellt" -ForegroundColor Green
} else {
  Write-Error "out/index.html nicht gefunden!"
  exit 1
}

# ── 4. Capacitor Sync ─────────────────────────────────────
Write-Host "[4/5] Capacitor Sync → Android..."
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Error "Capacitor Sync fehlgeschlagen!"; exit 1 }
Write-Host "   ✓ Android-Projekt aktualisiert" -ForegroundColor Green

# ── 5. Gradle APK Build ───────────────────────────────────
Write-Host "[5/5] Gradle APK Build ($Variant)..."
Set-Location "$Root\android"

if ($Variant -eq "release") {
  & .\gradlew.bat assembleRelease 2>&1
} else {
  & .\gradlew.bat assembleDebug 2>&1
}
if ($LASTEXITCODE -ne 0) { Set-Location $Root; Write-Error "Gradle Build fehlgeschlagen!"; exit 1 }

Set-Location $Root

# ── Ausgabe-APK ──────────────────────────────────────────
$apkPath = if ($Variant -eq "release") {
  "android\app\build\outputs\apk\release\app-release.apk"
} else {
  "android\app\build\outputs\apk\debug\app-debug.apk"
}

if (Test-Path $apkPath) {
  $size = (Get-Item $apkPath).Length / 1MB
  Write-Host ""
  Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
  Write-Host " APK fertig! ($([math]::Round($size,1)) MB)" -ForegroundColor Green
  Write-Host " $apkPath" -ForegroundColor Yellow
  Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
  Write-Host ""
  Write-Host " Auf Gerät installieren:"
  Write-Host "   adb install $apkPath"
  Write-Host ""
} else {
  Write-Error "APK nicht gefunden unter: $apkPath"
}
