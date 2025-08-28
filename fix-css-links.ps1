$screenPath = "C:\Users\disha\OneDrive\Desktop\CityNav2\prototype1\screens"
$files = Get-ChildItem -Path $screenPath -Filter "*.html"

foreach ($file in $files) {
        Write-Host "Processing $($file.Name)..." -ForegroundColor Yellow
    
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
    
        # Fix design-tokens.css link - remove malformed links and add proper ones
        $content = $content -replace '<link rel="\.\./styles/design-tokens\.css" />', ''
        $content = $content -replace '<link rel="stylesheet" href="\.\./styles/design-tokens\.css" />', ''
    
        # Fix base.css link - remove any existing ones
        $content = $content -replace '<link rel="stylesheet" href="\.\./styles/base\.css" />', ''
    
        # Fix components.css link - ensure it exists and is correct
        $content = $content -replace '<link rel="stylesheet" href="\.\./styles/components\.css" />', ''
    
        # Now add all three CSS files in the correct order after the viewport meta tag
        $cssLinks = @"
    <link rel="stylesheet" href="../styles/design-tokens.css" />
    <link rel="stylesheet" href="../styles/base.css" />
    <link rel="stylesheet" href="../styles/components.css" />
"@
    
        $content = $content -replace '(<meta name="viewport"[^>]*>)', "`$1`n$cssLinks"
    
        # Only write if content changed
        if ($content -ne $originalContent) {
                Set-Content -Path $file.FullName -Value $content -NoNewline
                Write-Host "  Updated $($file.Name)" -ForegroundColor Green
        }
        else {
                Write-Host "  $($file.Name) was already correct" -ForegroundColor Gray
        }
}

Write-Host "`nAll files processed!" -ForegroundColor Cyan
