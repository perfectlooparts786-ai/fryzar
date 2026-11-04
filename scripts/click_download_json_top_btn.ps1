Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Bring Chrome to front
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "Win32HelperTop" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 400
}

$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32MouseTop" -Namespace "Win32Functions" -PassThru

# Click the top "DOWNLOAD JSON" button (approx x=460, y=140)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(460, 140)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)

Start-Sleep -Seconds 4

# Check Downloads for client_secret
$downloaded = Get-ChildItem -Path "$env:USERPROFILE\Downloads\client_secret*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($downloaded) {
    Write-Output "SUCCESS_DOWNLOADED: $($downloaded.FullName)"
    Copy-Item $downloaded.FullName "C:\Users\Huzaifah\Links\client_secret.json" -Force
    Write-Output "SUCCESS_COPIED: C:\Users\Huzaifah\Links\client_secret.json"
} else {
    Write-Output "Not downloaded via top button."
}
