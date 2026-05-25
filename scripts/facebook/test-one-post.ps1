$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$workerDir = Join-Path $repoRoot "workers\facebook-poster"
$payloadPath = Join-Path $workerDir "test-run-due-posts.json"

Set-Location $workerDir

'{"limit":1}' | Set-Content -Path $payloadPath -Encoding ascii -NoNewline

$token = $env:GPT_FACEBOOK_POST_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    $secureToken = Read-Host "Paste X-GPT-Facebook-Token" -AsSecureString
    $credential = New-Object System.Management.Automation.PSCredential("token", $secureToken)
    $token = $credential.GetNetworkCredential().Password
}

if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Missing GPT Facebook post token."
}

$response = curl.exe -sS -X POST "https://facebook-poster.scholarsrepublic.org/run-due-posts" `
    -H "Content-Type: application/json" `
    -H "X-GPT-Facebook-Token: $token" `
    --data "@$payloadPath"

Write-Host $response
