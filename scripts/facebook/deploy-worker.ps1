$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$workerDir = Join-Path $repoRoot "workers\facebook-poster"

Set-Location $workerDir

npm run check
npx wrangler deploy

Write-Host "Facebook poster Worker deployed successfully."
Write-Host "Expected Worker cron schedule: 0 9 * * * (daily at 09:00 UTC)."
