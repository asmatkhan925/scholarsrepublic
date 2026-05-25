$ErrorActionPreference = "Stop"

Write-Host "Clipboard must contain the final extended Facebook PAGE token from Meta Access Token Debugger."

$pageToken = (Get-Clipboard).Trim()
if ([string]::IsNullOrWhiteSpace($pageToken)) {
    throw "Clipboard is empty. Copy the final extended Facebook PAGE token first."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$workerDir = Join-Path $repoRoot "workers\facebook-poster"

Set-Location $workerDir

$pageToken | npx wrangler secret put FACEBOOK_PAGE_ACCESS_TOKEN
npx wrangler deploy

Write-Host "Facebook Page token was updated and the Worker was deployed."
