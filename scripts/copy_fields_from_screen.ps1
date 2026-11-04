Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Bring Chrome to front
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "Win32HelperCopyF" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 400
}

$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32MouseCopyF" -Namespace "Win32Functions" -PassThru

# Click the copy icon next to Client ID (approx x=1330, y=300)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(1330, 300)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Milliseconds 500
$clientId = [System.Windows.Forms.Clipboard]::GetText()

# Click the copy icon next to Client secret (approx x=1330, y=365)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(1330, 365)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Milliseconds 500
$clientSecret = [System.Windows.Forms.Clipboard]::GetText()

Write-Output "CLIENT_ID_COPIED: $clientId"
Write-Output "CLIENT_SECRET_COPIED: $clientSecret"

# Write client_secret.json structure directly
$jsonObj = @{
    installed = @{
        client_id = $clientId
        project_id = "rich-sprite-513619-b7"
        auth_uri = "https://accounts.google.com/o/oauth2/auth"
        token_uri = "https://oauth2.googleapis.com/token"
        auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
        client_secret = $clientSecret
        redirect_uris = @("http://localhost")
    }
}

$jsonText = $jsonObj | ConvertTo-Json -Depth 4
Set-Content -Path "C:\Users\Huzaifah\Links\client_secret.json" -Value $jsonText -Encoding UTF8
Write-Output "Successfully wrote C:\Users\Huzaifah\Links\client_secret.json!"
