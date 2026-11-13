# 없는 것만 설치한다. 이미 있으면 건너뛴다.
# PowerShell에서 실행한다. Git Bash라면 scripts/setup.sh 를 쓴다.
# ffmpeg·yt-dlp·node 는 winget, 없으면 Chocolatey.
#Requires -Version 5.1
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = "SilentlyContinue"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Fail = $false

function Say([string]$Message) { Write-Host $Message }

function Add-PathFront([string]$Dir) {
  if (-not $Dir -or -not (Test-Path $Dir)) { return }
  $items = $env:Path -split ";"
  if ($items -contains $Dir) { return }
  $env:Path = "$Dir;$env:Path"
}

function Refresh-SessionPath {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  foreach ($entry in @($user, $machine)) {
    if (-not $entry) { continue }
    foreach ($dir in $entry.Split(";")) { Add-PathFront $dir }
  }
  $local = $env:LOCALAPPDATA
  if (-not $local) { $local = Join-Path $env:USERPROFILE "AppData\Local" }
  Add-PathFront (Join-Path $env:ProgramFiles "nodejs")
  Add-PathFront (Join-Path $local "Microsoft\WinGet\Links")
  Add-PathFront (Join-Path $env:USERPROFILE ".local\bin")
  $pkg = Join-Path $local "Microsoft\WinGet\Packages"
  if (Test-Path $pkg) {
    Get-ChildItem -Path $pkg -Directory -Filter "Gyan.FFmpeg*" -ErrorAction SilentlyContinue | ForEach-Object {
      Get-ChildItem -Path $_.FullName -Directory -Filter "ffmpeg-*" -ErrorAction SilentlyContinue | ForEach-Object {
        Add-PathFront (Join-Path $_.FullName "bin")
      }
    }
  }
}

function Have([string]$Name) {
  foreach ($dir in ($env:Path -split ";")) {
    if (-not $dir) { continue }
    foreach ($ext in @(".exe", ".cmd", ".bat")) {
      $candidate = Join-Path $dir "$Name$ext"
      if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $true }
    }
  }
  return $false
}

function Install-Winget([string]$Id) {
  if (-not (Have "winget")) {
    Say "  없음  winget — Microsoft Store에서 '앱 설치 관리자(App Installer)'를 설치한 뒤 다시 실행해요"
    return $false
  }
  Say "  설치  winget install $Id (관리자 확인 창이 뜨면 '예')"
  & winget install -e --id $Id --silent --accept-source-agreements --accept-package-agreements *>&1 | Out-Host
  Refresh-SessionPath
  return ($LASTEXITCODE -eq 0)
}

function Install-Choco([string]$Package) {
  if (-not (Have "choco")) { return $false }
  Say "  설치  choco install $Package -y"
  & choco install $Package -y *>&1 | Out-Host
  Refresh-SessionPath
  return ($LASTEXITCODE -eq 0)
}

function Install-Tool([string]$Bin, [string]$WingetId, [string]$ChocoId, [string]$Why) {
  if (Have $Bin) {
    $line = (& $Bin --version 2>&1 | Select-Object -First 1)
    Say "  있음  $Bin — $line"
    return
  }
  if ($WingetId -and (Install-Winget $WingetId) -and (Have $Bin)) {
    Say "  됨    $Bin"
    return
  }
  if ($ChocoId -and (Install-Choco $ChocoId) -and (Have $Bin)) {
    Say "  됨    $Bin"
    return
  }
  Say "  없음  $Bin — $Why"
  $script:Fail = $true
}

Refresh-SessionPath
Say "카드뉴스 준비 (Windows PowerShell)"
Say "폴더: $Root"
Say ""

if (Have "node") {
  $ver = (& node -p "process.versions.node")
  $major = [int]($ver.Split(".")[0])
  if ($major -ge 20) { Say "  있음  node $ver" }
  else {
    Say "  오래됨  node $ver — 20 이상이 필요해요"
    $Fail = $true
  }
} else {
  Install-Tool "node" "OpenJS.NodeJS.LTS" "nodejs-lts" "https://nodejs.org 에서 LTS를 설치한 뒤 PowerShell을 다시 열어요"
}

Install-Tool "ffmpeg" "Gyan.FFmpeg" "ffmpeg" "winget install Gyan.FFmpeg  또는  choco install ffmpeg"
Install-Tool "ffprobe" "Gyan.FFmpeg" "ffmpeg" "ffprobe는 ffmpeg와 같이 와요"

if (-not (Have "yt-dlp")) {
  if (-not ((Install-Winget "yt-dlp.yt-dlp") -and (Have "yt-dlp"))) {
    Install-Choco "yt-dlp" | Out-Null
  }
}
if (Have "yt-dlp") {
  $line = (& yt-dlp --version 2>&1 | Select-Object -First 1)
  Say "  있음  yt-dlp — $line"
} else {
  $destDir = Join-Path $env:USERPROFILE ".local\bin"
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  $dest = Join-Path $destDir "yt-dlp.exe"
  Say "  설치  yt-dlp → $dest"
  try {
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $dest
    Refresh-SessionPath
    $line = (& yt-dlp --version 2>&1 | Select-Object -First 1)
    Say "  됨    yt-dlp — $line"
  } catch {
    Say "  없음  yt-dlp — winget install yt-dlp.yt-dlp"
    $Fail = $true
  }
}

if (Have "node") {
  & node (Join-Path $Root "scripts\fetch-fonts.mjs") | Out-Host
  if ($LASTEXITCODE -ne 0) { $Fail = $true }
}

if (Test-Path (Join-Path $Root "node_modules\playwright")) {
  Say "  있음  playwright 패키지"
} elseif (Have "npm") {
  Say "  설치  npm install (playwright)"
  & npm install *>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { $Fail = $true }
} else {
  Say "  없음  npm"
  $Fail = $true
}

# 릴스는 HyperFrames가 굽는다. node 22 이상에서만 돈다. 없으면 카드만 이어 붙인 릴스가 나온다.
if ((Test-Path (Join-Path $Root "node_modules\hyperframes")) -and (Test-Path (Join-Path $Root "node_modules\gsap"))) {
  Say "  있음  hyperframes, gsap"
} else {
  Say "  설치  npm install (hyperframes, gsap)"
  & npm install *>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { $Fail = $true }
}
if (Have "node") {
  $nodeMajor = [int]((& node -p "process.versions.node.split('.')[0]"))
  if ($nodeMajor -lt 22) { Say "  안내  node $nodeMajor — 릴스 모션은 node 22 이상에서 돌아요. 카드와 클립은 그대로 만들어져요." }
}

if ((Test-Path (Join-Path $Root "node_modules\playwright")) -and (Have "node")) {
  & node --input-type=module -e "import { chromium } from 'playwright'; const b = await chromium.launch(); await b.close();" *>&1 | Out-Host
  if ($LASTEXITCODE -eq 0) {
    Say "  있음  헤드리스 Chromium"
  } else {
    Say "  설치  npx playwright install chromium"
    & npx playwright install chromium *>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) { Say "  됨    헤드리스 Chromium" } else { Say "  실패  Chromium"; $Fail = $true }
  }
}

Say ""
if ($Fail) {
  Say "아직 비어 있는 항목이 있어요. 위 안내를 처리한 뒤 이 스크립트를 다시 실행해요."
  exit 1
}
Say "준비됐어요. 한 번 더 실행해도 이미 있는 것은 건너뛰어요."
exit 0
