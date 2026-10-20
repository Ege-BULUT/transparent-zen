# Registers the Transparent Zen native helper for the current Windows user.
# Usage: powershell -ExecutionPolicy Bypass -File native-host\install.ps1 [-Uninstall]
param([switch]$Uninstall)

$hostName = "transparent_zen"
$registryKey = "HKCU:\Software\Mozilla\NativeMessagingHosts\$hostName"
$manifestPath = Join-Path $PSScriptRoot "$hostName.json"

if ($Uninstall) {
    Remove-Item -Path $registryKey -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $manifestPath -Force -ErrorAction SilentlyContinue
    Write-Output "Native helper removed."
    return
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python 3 is required on PATH for the native helper."
    exit 1
}

$manifest = [ordered]@{
    name = $hostName
    description = "Transparent Zen Community Edition helper"
    path = (Join-Path $PSScriptRoot "transparent_zen_host.bat")
    type = "stdio"
    allowed_extensions = @("{74186d10-f6f2-4f73-b33a-83bb72e50654}")
}
$manifest | ConvertTo-Json | Set-Content -Path $manifestPath -Encoding ascii

New-Item -Path $registryKey -Force | Out-Null
Set-ItemProperty -Path $registryKey -Name "(default)" -Value $manifestPath
Write-Output "Native helper registered: $manifestPath"
