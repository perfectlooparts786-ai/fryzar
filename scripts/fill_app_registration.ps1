Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Bring Chrome to foreground
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "User32Helper5" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 400
}

$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32Mouse5" -Namespace "Win32Functions" -PassThru

# 2. Click App Name input box (approx x=285, y=365)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(285, 365)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait("InfiniteLoopUploader")
Start-Sleep -Milliseconds 400

# 3. Click User support email dropdown (approx x=285, y=440)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(285, 440)
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)
Start-Sleep -Milliseconds 500

# Press Down arrow and Enter to select the email
[System.Windows.Forms.SendKeys]::SendWait("{DOWN}")
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Milliseconds 400

# 4. Scroll down to Developer contact email
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(500, 500)
# Mouse scroll down
# MOUSEEVENTF_WHEEL = 0x0800
$sigWheel = @'
[DllImport("user32.dll")]
public static extern void mouse_event(uint dwFlags, uint dx, uint dy, int dwData, int dwExtraInfo);
'@
$wheel = Add-Type -MemberDefinition $sigWheel -Name "Win32Wheel" -Namespace "Win32Functions" -PassThru
$wheel::mouse_event(0x0800, 0, 0, -800, 0)
Start-Sleep -Milliseconds 600

# Capture screen after scrolling
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)

$outputPath = "C:\Users\Huzaifah\Links\app_registration_scrolled.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Filled top and scrolled: $outputPath"
