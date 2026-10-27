param([string]$Game='')
$ErrorActionPreference='Stop'
$libraryRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
try {
  $node=(Get-Command node -ErrorAction Stop).Source
  $nodeMajor=[int]((& $node --version).TrimStart('v').Split('.')[0])
  if($nodeMajor -lt 22){throw '需要 Node.js 22 或更新版本。'}
  $libraryPort=43170
  if($env:PORT){$libraryPort=[int]$env:PORT}
  if($libraryPort -lt 1 -or $libraryPort -gt 65535){throw 'PORT 应为 1–65535。'}
  if($Game -and $Game -notmatch '^[a-z0-9-]+$'){throw '游戏标识无效。'}
  $libraryUrl='http://127.0.0.1:'+$libraryPort+'/'
  if($Game){$libraryUrl+='games/'+$Game+'/'}
  $running=$false
  try {$probe=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$libraryPort+'/api/library') -TimeoutSec 2; $running=$probe.app -eq 'hgame-library'} catch {}
  if($running){Start-Process $libraryUrl;Write-Host '游戏库已运行，复用现有服务。';exit 0}
  $openHelper=Join-Path $PSScriptRoot 'open-when-ready.ps1'
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "{0}" -Url "{1}" -Port {2}' -f $openHelper,$libraryUrl,$libraryPort)
  Push-Location -LiteralPath $libraryRoot
  try {& $node (Join-Path $libraryRoot 'server.mjs') --port $libraryPort; $result=$LASTEXITCODE} finally {Pop-Location}
  exit $result
} catch {Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}
