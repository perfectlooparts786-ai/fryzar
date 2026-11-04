# 1. Open the YouTube Data API v3 library page
Start-Process "chrome.exe" "https://console.cloud.google.com/apis/library/youtube.googleapis.com"
Start-Sleep -Seconds 7

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 2. Capture screen to locate the ENABLE button
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)

$outputPath = "C:\Users\Huzaifah\Links\youtube_api_page.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Loaded YouTube API page: $outputPath"
