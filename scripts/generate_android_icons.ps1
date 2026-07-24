Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\ragha\.gemini\antigravity-ide\brain\ed9fb15e-c378-40f5-956b-b3f5b7ac095b\media__1784832627713.jpg"
$destBase = "d:\luminoidTechnology\BharatFpoVyapar\android\app\src\main\res"

$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found at $srcPath"
    exit 1
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

foreach ($key in $sizes.Keys) {
    $targetSize = $sizes[$key]
    $dirPath = Join-Path $destBase $key
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
    }

    # Generate high quality resized PNG
    $destBmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
    $graph = [System.Drawing.Graphics]::FromImage($destBmp)
    $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graph.DrawImage($srcImage, 0, 0, $targetSize, $targetSize)
    $graph.Dispose()

    $launcherPath = Join-Path $dirPath "ic_launcher.png"
    $roundPath    = Join-Path $dirPath "ic_launcher_round.png"

    $destBmp.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $destBmp.Dispose()
    Write-Host "Generated $key at ${targetSize}x${targetSize} px"
}

$srcImage.Dispose()
Write-Host "All Android icon resolutions generated successfully!"
