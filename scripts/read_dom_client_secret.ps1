# Let's use PowerShell to read the exact text using Chrome developer or UIAutomation if possible,
# or simply select the input text box and copy it.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "Win32HelperText" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 400
}

$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32MouseText" -Namespace "Win32Functions" -PassThru

# 1. Double/triple click inside the Client ID text box (approx x=500, y=300)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(500, 300)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait("^a")
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait("^c")
Start-Sleep -Milliseconds 300
$clientId = [System.Windows.Forms.Clipboard]::GetText()

# 2. Double/triple click inside the Client secret text box (approx x=500, y=365)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(500, 365)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait("^a")
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait("^c")
Start-Sleep -Milliseconds 300
$clientSecret = [System.Windows.Forms.Clipboard]::GetText()

Write-Output "ACCURATE_CLIENT_ID: $clientId"
Write-Output "ACCURATE_CLIENT_SECRET: $clientSecret"

if ($clientId -like "*apps.googleusercontent.com*" -and $clientSecret.Length -gt 10) {
    $jsonObj = @{
        installed = @{
            client_id = $clientId.Trim()
            project_id = "rich-sprite-513619-b7"
            auth_uri = "https://accounts.google.com/o/oauth2/auth"
            token_uri = "https://oauth2.googleapis.com/token"
            auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
            client_secret = $clientSecret.Trim()
            redirect_uris = @("http://localhost")
        }
    }
    $jsonText = $jsonObj | ConvertTo-Json -Depth 4
    Set-Content -Path "C:\Users\Huzaifah\Links\client_secret.json" -Value $jsonText -Encoding UTF8
    Write-Output "SUCCESS: Correct client_secret.json created!"
} else {
    Write-Output "Clipboard values did not match expected pattern."
}
