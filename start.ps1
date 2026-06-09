$ErrorActionPreference = "Stop"
$port = 8010
$url = "http://127.0.0.1:$port"

Write-Host "Starting TRPG Minitest at $url"
Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "$port", "--bind", "127.0.0.1" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
Start-Sleep -Seconds 2
Start-Process $url
