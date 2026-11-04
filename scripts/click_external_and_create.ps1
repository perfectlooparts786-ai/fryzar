Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Bring Chrome to foreground
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "User32Helper4" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 500
}

# 2. Click the 'External' radio button (approx x=235, y=348)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(235, 348)

$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32Mouse4" -Namespace "Win32Functions" -PassThru

$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Milliseconds 300

# 3. Click the blue 'CREATE' button (approx x=262, y=425)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(262, 425)
Start-Sleep -Milliseconds 200
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)

Start-Sleep -Seconds 6

# Capture screen
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)

$outputPath = "C:\Users\Huzaifah\Links\app_registration_step.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Clicked External and Create: $outputPath"
