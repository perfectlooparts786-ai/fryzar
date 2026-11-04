Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Bring Chrome to front
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "Win32HelperConfigure" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 400
}

# 2. Click the blue 'CONFIGURE CONSENT SCREEN' button (approx x=300, y=365)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(300, 365)

$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32MouseConfigure" -Namespace "Win32Functions" -PassThru

$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)

Start-Sleep -Seconds 7

# Capture screen after clicking Configure Consent Screen
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)

$outputPath = "C:\Users\Huzaifah\Links\consent_screen_opened.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Clicked Configure Consent Screen: $outputPath"
