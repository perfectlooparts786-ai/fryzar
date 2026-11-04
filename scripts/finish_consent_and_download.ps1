Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Bring Chrome to foreground
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if ($chrome) {
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "User32Helper6" -Namespace "Win32" -PassThru
    $user32::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 400
}

# Use PageDown to scroll down
[System.Windows.Forms.SendKeys]::SendWait("{PGDN}")
Start-Sleep -Seconds 1

# Capture screen after PageDown
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)

$outputPath = "C:\Users\Huzaifah\Links\consent_pagedown.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Scrolled via PageDown: $outputPath"
