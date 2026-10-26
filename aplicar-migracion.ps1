# Script para aplicar migración en producción vía puente TLS
#
# Las conexiones salen del .env (que git ignora), nunca de este archivo:
#   DATABASE_URL       conexión real a producción (puerto 5432 con TLS verificado)
#   PRISMA_DATABASE_URL conexión al puente local (127.0.0.1:15433 en claro)
# Este script llama al CLI de Prisma directo, sin pasar por scripts/prisma-run.mjs,
# así que necesita las dos variables en el entorno del proceso hijo.

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "No existe $envFile. Copiá .env.example y completá DATABASE_URL y PRISMA_DATABASE_URL."
    exit 1
}

foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $name = $Matches[1]
        $value = $Matches[2].Trim()
        # El .env puede traer el valor entre comillas.
        if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        Set-Item -Path "Env:$name" -Value $value
    }
}

foreach ($required in @("DATABASE_URL", "PRISMA_DATABASE_URL")) {
    if (-not (Test-Path "Env:$required")) {
        Write-Error "Falta $required en el .env."
        exit 1
    }
}

# Antes de tocar una base real, se muestra el destino (con la contraseña
# enmascarada) y se pide confirmación: las coordenadas salen del .env, y un
# .env de desarrollo podría apuntar a otra base que la de producción.
$destino = $env:DATABASE_URL -replace '://[^:]+:[^@]+@', '://***:***@'
if ($env:DATABASE_URL -match '://[^@]+@([^:/]+):(\d+)/') {
    $destino = "$($Matches[1]):$($Matches[2])"
} else {
    Write-Error "No se pudo leer el host y puerto de DATABASE_URL."
    exit 1
}

Write-Host ""
Write-Host "Vas a aplicar migraciones en: $destino" -ForegroundColor Yellow
Write-Host "(las conexiones salen del .env; revisá que sea la base de producción)"
$confirmar = Read-Host "¿Continuar? [s/N]"
if ($confirmar -ne 's') {
    Write-Host "Cancelado. No se aplicó nada."
    exit 0
}

Write-Host "=== Paso 1: Matar procesos en puerto 15433 ==="
Get-NetTCPConnection -LocalPort 15433 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }

Write-Host ""
Write-Host "=== Paso 2: Levantar puente TLS (conecta a produccion:5432 con TLS, expone 127.0.0.1:15433 en claro) ==="
$bridge = Start-Process -FilePath "node" -ArgumentList "scripts/pg-tls-bridge.mjs" -WorkingDirectory "D:\proyectos\facturas" -NoNewWindow -PassThru
Write-Host "Puente iniciado (PID: $($bridge.Id))"

Write-Host ""
Write-Host "=== Paso 3: Esperar 5 segundos ==="
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "=== Paso 4: Marcar migración fallida como revertida ==="
node node_modules/prisma/build/index.js migrate resolve --rolled-back 20261024000000_saas_billing

Write-Host ""
Write-Host "=== Paso 5: Aplicar migración corregida ==="
node node_modules/prisma/build/index.js migrate deploy

Write-Host ""
Write-Host "=== Paso 6: Verificar estado ==="
node node_modules/prisma/build/index.js migrate status

Write-Host ""
Write-Host "=== Paso 7: Regenerar cliente de Prisma ==="
node node_modules/prisma/build/index.js generate

Write-Host ""
Write-Host "=== TODO COMPLETADO ==="

# Detener el puente al final
try { $bridge | Stop-Process -Force } catch {}
Write-Host "Puente detenido"