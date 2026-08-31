# Validates the async video endpoints WITHOUT queuing a Higgsfield job (no credits spent).
# Checks: auth gating, status error shape, fetch "not ready" handling, oversize guard.
$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"
$jar = Join-Path $env:TEMP "studio-video-test-cookies.txt"
if (Test-Path $jar) { Remove-Item $jar -Force }

$pwLine = (Get-Content ".env.local" | Where-Object { $_ -match "^STUDIO_PASSWORD=" } | Select-Object -First 1)
$pw = ($pwLine -replace "^STUDIO_PASSWORD=", "").Trim().Trim('"')

function Show($label, $out) { Write-Output ("[{0}] {1}" -f $label, $out) }

# 0) unauthenticated status must be 401
$code = curl.exe -sS -o "$env:TEMP\v0.json" -w "%{http_code}" "$base/api/studio/generate-video/status?requestId=abc"
Show "unauth-status" "http=$code expected=401"

# 1) sign in
$loginJson = Join-Path $env:TEMP "studio-login.json"
[IO.File]::WriteAllText($loginJson, '{"password":"' + $pw + '"}')
$code = curl.exe -sS -c $jar -o "$env:TEMP\v1.json" -w "%{http_code}" -X POST "$base/api/studio/auth" -H "Content-Type: application/json" --data-binary "@$loginJson"
Show "login" "http=$code expected=200"

# 2) status with missing requestId -> 400
$code = curl.exe -sS -b $jar -o "$env:TEMP\v2.json" -w "%{http_code}" "$base/api/studio/generate-video/status"
Show "status-no-id" ("http=$code expected=400 body=" + (Get-Content -Raw "$env:TEMP\v2.json"))

# 3) status with a bogus requestId -> upstream 4xx surfaced as 502 JSON (no credits used)
$bogus = [guid]::NewGuid().ToString()
$code = curl.exe -sS -b $jar -o "$env:TEMP\v3.json" -w "%{http_code}" "$base/api/studio/generate-video/status?requestId=$bogus"
Show "status-bogus" ("http=$code body=" + ((Get-Content -Raw "$env:TEMP\v3.json") -replace "\s+", " ").Substring(0, [Math]::Min(220, ((Get-Content -Raw "$env:TEMP\v3.json") -replace "\s+", " ").Length)))

# 4) fetch on a bogus/unfinished job -> must be JSON, never a hang
$fetchJson = Join-Path $env:TEMP "studio-fetch.json"
[IO.File]::WriteAllText($fetchJson, '{"requestId":"' + $bogus + '"}')
$code = curl.exe -sS -b $jar -o "$env:TEMP\v4.json" -w "%{http_code}" -X POST "$base/api/studio/generate-video/fetch" -H "Content-Type: application/json" --data-binary "@$fetchJson"
Show "fetch-bogus" ("http=$code body=" + ((Get-Content -Raw "$env:TEMP\v4.json") -replace "\s+", " ").Substring(0, [Math]::Min(220, ((Get-Content -Raw "$env:TEMP\v4.json") -replace "\s+", " ").Length)))

# 5) fetch with no requestId -> 400
$code = curl.exe -sS -b $jar -o "$env:TEMP\v5.json" -w "%{http_code}" -X POST "$base/api/studio/generate-video/fetch" -H "Content-Type: application/json" --data-binary "{}"
Show "fetch-no-id" ("http=$code expected=400 body=" + (Get-Content -Raw "$env:TEMP\v5.json"))

# 6) oversize still must be rejected before Higgsfield is contacted
$big = Join-Path $env:TEMP "big-still.jpg"
$bytes = New-Object byte[] (5 * 1024 * 1024)
(New-Object Random).NextBytes($bytes)
[IO.File]::WriteAllBytes($big, $bytes)
$code = curl.exe -sS -b $jar -o "$env:TEMP\v6.json" -w "%{http_code}" -X POST "$base/api/studio/generate-video/submit" -F "categoryId=invisalign" -F "duration=5" -F "prompt=test" -F "image=@$big;type=image/jpeg"
Show "submit-oversize" ("http=$code expected=413 body=" + (Get-Content -Raw "$env:TEMP\v6.json"))
Remove-Item $big -Force

# 7) non-image still must be rejected before Higgsfield is contacted
$txt = Join-Path $env:TEMP "not-an-image.txt"
Set-Content -Path $txt -Value "hello"
$code = curl.exe -sS -b $jar -o "$env:TEMP\v7.json" -w "%{http_code}" -X POST "$base/api/studio/generate-video/submit" -F "categoryId=invisalign" -F "duration=5" -F "prompt=test" -F "image=@$txt;type=text/plain"
Show "submit-not-image" ("http=$code expected=400 body=" + (Get-Content -Raw "$env:TEMP\v7.json"))
Remove-Item $txt -Force

# 8) bad categoryId -> 400 before Higgsfield
$png = "public\icons\icon-512.png"
$code = curl.exe -sS -b $jar -o "$env:TEMP\v8.json" -w "%{http_code}" -X POST "$base/api/studio/generate-video/submit" -F "categoryId=not-real" -F "duration=5" -F "prompt=test" -F "image=@$png;type=image/png"
Show "submit-bad-category" ("http=$code expected=400 body=" + (Get-Content -Raw "$env:TEMP\v8.json"))

Write-Output "done"
