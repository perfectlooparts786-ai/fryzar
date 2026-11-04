Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Click "Select a project" button (located around x=217, y=160)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(217, 160)

$signature = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $signature -Name "Win32Mouse" -Namespace "Win32Functions" -PassThru

# LEFTDOWN = 0x02, LEFTUP = 0x04
$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 100
$mouse::mouse_event(0x04, 0, 0, 0, 0)

Start-Sleep -Seconds 3

# Capture screen
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)

$outputPath = "C:\Users\Huzaifah\Links\project_dialog.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Clicked and captured to $outputPath"
