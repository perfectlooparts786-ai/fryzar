Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Click "OAuth client ID" from the dropdown (approx x=235, y=210)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(235, 210)

$sigMouse = @'
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
'@
$mouse = Add-Type -MemberDefinition $sigMouse -Name "Win32MouseClick2" -Namespace "Win32Functions" -PassThru

$mouse::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
$mouse::mouse_event(0x04, 0, 0, 0, 0)

Start-Sleep -Seconds 6

# Capture screen after selecting OAuth client ID
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)

$outputPath = "C:\Users\Huzaifah\Links\oauth_client_form.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Selected OAuth client ID: $outputPath"
