$content = [IO.File]::ReadAllText('C:\Users\Usuario\Desktop\Veloire-12-2026\agenda-app-copia\agenda-app\frontend-vite\src\features\website-studio\lib\templateEngine.ts', [System.Text.Encoding]::UTF8)
[IO.File]::WriteAllText('C:\Users\Usuario\Desktop\Veloire-12-2026\agenda-app-copia\agenda-app\frontend-vite\src\features\website-studio\lib\templateEngine.ts', $content, [System.Text.Encoding]::UTF8)
Write-Host 'Done'
