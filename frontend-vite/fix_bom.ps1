$files = @(
    'C:\Users\Usuario\Desktop\Veloire-12-2026\agenda-app-copia\agenda-app\frontend-vite\src\features\website-studio\lib\templateEngine.ts',
    'C:\Users\Usuario\Desktop\Veloire-12-2026\agenda-app-copia\agenda-app\frontend-vite\src\features\website-studio\WebsiteRenderer.tsx',
    'C:\Users\Usuario\Desktop\Veloire-12-2026\agenda-app-copia\agenda-app\frontend-vite\vite.config.ts'
)
foreach ($file in $files) {
    $content = [IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    [IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    Write-Host \"Fixed: \\\"
}
Write-Host 'All done'
