param([int]$VersionCode = ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
    # Windows/MSIX: keep Java's local socket files outside the redirected system TEMP.
    $socketTemp = Join-Path $projectRoot '.jtmp'
    New-Item -ItemType Directory -Force $socketTemp | Out-Null
    $env:JAVA_TOOL_OPTIONS = ($env:JAVA_TOOL_OPTIONS + ' -Djdk.net.unixdomain.tmpdir="' + $socketTemp + '"').Trim()
    if (Test-Path .toolchain/jdk) {
        $env:JAVA_HOME = (Get-ChildItem .toolchain/jdk -Directory | Select-Object -First 1).FullName
        $env:Path = "$env:JAVA_HOME\bin;$env:Path"
        $env:ANDROID_HOME = "$projectRoot\.toolchain\sdk"
        $env:ANDROID_USER_HOME = "$projectRoot\.toolchain\android-user"
        $env:GRADLE_USER_HOME = "$projectRoot\.toolchain\gradle-user"
    }
    node tools/prepare.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Installer les dépendances avec npm ci.' }
    $target = 'android/app/src/main/assets/www'
    New-Item -ItemType Directory -Force $target, artifacts | Out-Null
    Copy-Item -LiteralPath index.html,style.css,ui.css,hell.css,src,vendor,assets -Destination $target -Recurse -Force
    $gradleExe = if (Test-Path .toolchain/gradle/gradle-8.9/bin/gradle.bat) { "$projectRoot\.toolchain\gradle\gradle-8.9\bin\gradle.bat" } else { 'gradle' }
    & $gradleExe -p android assembleRelease "-PversionCode=$VersionCode" --no-daemon --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'La compilation Android a échoué.' }
    Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination artifacts/escape-from-hell.apk -Force
    Get-FileHash artifacts/escape-from-hell.apk -Algorithm SHA256
} finally { Pop-Location }
