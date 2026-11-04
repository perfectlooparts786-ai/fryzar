Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "Win32HelperDirectD" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 400
}

# In Chrome, pressing Tab several times from top can focus DOWNLOAD JSON
# Let's see: URL bar is focused or page body
# Let's click at x=440, y=140
$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32MouseDirectD" -Namespace "Win32Functions" -PassThru

[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(440, 140)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 100
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Seconds 3

# Check downloads
$recent = Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Filter "*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($recent) {
    Write-Output "Found: $($recent.FullName) ($($recent.LastWriteTime))"
    Copy-Item $recent.FullName "C:\Users\Huzaifah\Links\client_secret.json" -Force
} else {
    Write-Output "Downloads folder has no JSON files."
}
