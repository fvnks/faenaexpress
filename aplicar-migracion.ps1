# Script para aplicar migración en producción vía puente TLS
# DATABASE_URL: conexión real a producción (puerto 5432 con TLS verificado)
# PRISMA_DATABASE_URL: conexión al puente local (127.0.0.1:15433 en claro)

$env:DATABASE_URL = "postgres://postgres:UtdiejuIDIJh08O47DIRhQwGUC5p76ov9OV6m42zjSRZacktCc7bNxF0Wy6HFY11@148.113.196.87:5432/postgres?sslmode=verify-full&sslrootcert=./certs/coolify-ca.crt"
$env:PRISMA_DATABASE_URL = "postgres://postgres:UtdiejuIDIJh08O47DIRhQwGUC5p76ov9OV6m42zjSRZacktCc7bNxF0Wy6HFY11@127.0.0.1:15433/postgres?sslmode=disable"

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