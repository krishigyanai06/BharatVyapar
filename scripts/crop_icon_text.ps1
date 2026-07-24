Add-Type -AssemblyName System.Drawing

$srcPath = "d:\luminoidTechnology\BharatFpoVyapar\assets\app-icon-master.png"
$img = [System.Drawing.Bitmap]::FromFile($srcPath)

$w = $img.Width
$h = $img.Height

# Get background color from upper region (e.g. x=200, y=200)
$bgColor = $img.GetPixel(200, 200)
Write-Host "Sampled Background Color: R=$($bgColor.R), G=$($bgColor.G), B=$($bgColor.B)"

# We create a new bitmap of 1024x1024
$cleanBmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($cleanBmp)

$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Draw full original image first
$g.DrawImage($img, 0, 0, $w, $h)

# Cover the bottom text area (from Y=730 to Y=940) with the cream background brush
$brush = New-Object System.Drawing.SolidBrush($bgColor)
# Text region is approximately between Y=740 and Y=920
$g.FillRectangle($brush, 50, 740, $w - 100, 200)

$brush.Dispose()
$g.Dispose()
$img.Dispose()

# Save cleaned master asset
$cleanBmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)
$cleanBmp.Dispose()

Write-Host "Successfully removed bottom text from master icon and filled with seamless background!"
