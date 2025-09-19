# Script para atualizar importações do tenant

# Importações de @/lib/tenant-simple para @/features/tenant
Get-ChildItem -Path "F:\NEXFINAN\revalya-newversion\src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) | 
    ForEach-Object { $_ -replace "@/lib/tenant-simple'", "@/features/tenant'" } |
    Set-Content $_.FullName
}

Get-ChildItem -Path "F:\NEXFINAN\revalya-newversion\src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) | 
    ForEach-Object { $_ -replace "@/lib/tenant-simple/", "@/features/tenant/store/" } |
    Set-Content $_.FullName
}

# Importações de @/hooks/useTenant para @/features/tenant/hooks
Get-ChildItem -Path "F:\NEXFINAN\revalya-newversion\src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) | 
    ForEach-Object { $_ -replace "@/hooks/useTenant", "@/features/tenant/hooks/useTenant" } |
    Set-Content $_.FullName
}

# Importações de @/utils/tenant para @/features/tenant/utils ou @/features/tenant/storage
Get-ChildItem -Path "F:\NEXFINAN\revalya-newversion\src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) | 
    ForEach-Object { $_ -replace "@/utils/tenantKeyMigration", "@/features/tenant/utils/tenantKeyMigration" } |
    Set-Content $_.FullName
}

Get-ChildItem -Path "F:\NEXFINAN\revalya-newversion\src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) | 
    ForEach-Object { $_ -replace "@/utils/tenantStorage", "@/features/tenant/storage/tenantStorage" } |
    Set-Content $_.FullName
}

Get-ChildItem -Path "F:\NEXFINAN\revalya-newversion\src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) | 
    ForEach-Object { $_ -replace "@/utils/tenantNavigation", "@/features/tenant/utils/tenantNavigation" } |
    Set-Content $_.FullName
}

Write-Host "Todas as importações foram atualizadas!" -ForegroundColor Green
