$ErrorActionPreference = "Stop"

$clientDir = Join-Path $PSScriptRoot "..\\node_modules\\.prisma\\client"
$enginePath = Join-Path $clientDir "query_engine-windows.dll.node"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $clientDir ("query_engine-windows.dll.node.bak-" + $timestamp)

Get-ChildItem -Path $clientDir -Filter "query_engine-windows.dll.node.bak-*" -ErrorAction SilentlyContinue |
  Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $clientDir -Filter "query_engine-windows.dll.node.tmp*" -ErrorAction SilentlyContinue |
  Remove-Item -Force -ErrorAction SilentlyContinue

if (Test-Path $enginePath) {
  Move-Item -Path $enginePath -Destination $backupPath -Force
}

& node "node_modules/prisma/build/index.js" generate
exit $LASTEXITCODE
