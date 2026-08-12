#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$ListenAddress = "192.168.219.105"
$WslAddress = (wsl.exe hostname -I).Trim().Split(" ")[0]

if ([string]::IsNullOrWhiteSpace($WslAddress)) {
    throw "WSL IP not found"
}

Set-Service iphlpsvc -StartupType Automatic
Start-Service iphlpsvc

foreach ($Port in @(80, 443)) {
    $RuleName = "Veloo TCP $Port"

    if (-not (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $RuleName -Direction Inbound `
            -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
    }

    netsh interface portproxy delete v4tov4 `
        listenaddress=$ListenAddress listenport=$Port | Out-Null

    netsh interface portproxy add v4tov4 `
        listenaddress=$ListenAddress listenport=$Port `
        connectaddress=$WslAddress connectport=$Port
}

Write-Host "WSL IP: $WslAddress"
netsh interface portproxy show all
Write-Host "Windows network setup complete"