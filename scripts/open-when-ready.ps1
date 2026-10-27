param([string]$Url,[int]$Port)
for($attempt=0;$attempt -lt 30;$attempt++){
  try {$ready=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$Port+'/api/library') -TimeoutSec 1;if($ready.app -eq 'hgame-library'){Start-Process $Url;exit 0}} catch {}
  Start-Sleep -Milliseconds 500
}
