# Script to create the uploads folder for drawing files
# Run this script in PowerShell

Write-Host "Creating uploads folder..." -ForegroundColor Cyan

$uploadsPath = "C:\uploads"

# Check if folder already exists
if (Test-Path $uploadsPath) {
    Write-Host "Folder already exists: $uploadsPath" -ForegroundColor Yellow
} else {
    # Create the folder
    New-Item -ItemType Directory -Force -Path $uploadsPath | Out-Null
    Write-Host "Created folder: $uploadsPath" -ForegroundColor Green
}

# Create subfolders
$subfolders = @("drawings")
foreach ($subfolder in $subfolders) {
    $fullPath = Join-Path $uploadsPath $subfolder
    if (Test-Path $fullPath) {
        Write-Host "Subfolder already exists: $fullPath" -ForegroundColor Yellow
    } else {
        New-Item -ItemType Directory -Force -Path $fullPath | Out-Null
        Write-Host "Created subfolder: $fullPath" -ForegroundColor Green
    }
}

Write-Host "Setup completed!" -ForegroundColor Green