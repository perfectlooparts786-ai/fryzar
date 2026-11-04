Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Bring Chrome to front
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "Win32HelperClickE" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 400
}

$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32MouseClickE" -Namespace "Win32Functions" -PassThru

# Click the blue "DOWNLOAD JSON" button (exact coordinates: x=805, y=560)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(805, 560)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 100
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Seconds 1

# If a Windows Save As dialog pops up, press Enter to save
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Seconds 3

# Also click OK to close modal (x=900, y=560)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(900, 560)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Seconds 1

# Check where the file went (Downloads, Desktop, Links)
$recent = Get-ChildItem -Path "$env:USERPROFILE" -Filter "*.json" -Recurse -Depth 2 -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) }
if ($recent) {
    Write-Output "Found recent JSON file: $($recent[0].FullName)"
    Copy-Item $recent[0].FullName "C:\Users\Huzaifah\Links\client_secret.json" -Force
    Write-Output "SUCCESS: Copied to C:\Users\Huzaifah\Links\client_secret.json"
} else {
    Write-Output "Not yet detected in user folders."
}
