#!/usr/bin/env python3
"""
Script para baixar TODAS as Edge Functions do Supabase Main (produção)
e salvar localmente, garantindo sincronização 100%.

Usa a API do Supabase via MCP ou Supabase CLI.
"""

import json
import subprocess
import sys
from pathlib import Path

# Lista de todas as Edge Functions encontradas no main
EDGE_FUNCTIONS = [
    "send-invite-email",
    "invite-reseller-user",
    "validate-reseller-invite-token",
    "accept-reseller-invite",
    "jwt-custom-claims",
    "exchange-tenant-code",
    "refresh-tenant-token",
    "create-tenant-session-v2",
    "refresh-tenant-token-v2",
    "revoke-tenant-session",
    "create-tenant-session-v3",
    "refresh-tenant-token-v3",
    "asaas-proxy",
    "bulk-insert-helper",
    "fetch-asaas-customer",
    "asaas-webhook-charges",
    "send-bulk-messages",
    "recalc-billing-statuses",
    "daily-billing-status-update",
    "asaas-import-charges",
    "sync-charges-from-asaas-api",
    "asaas-import-all-charges",
    "assinafy-list-templates",
    "assinafy-delete-template",
    "assinafy-list-contacts",
    "assinafy-update-contact",
    "assinafy-delete-contact",
    "assinafy-list-signer-documents",
    "create-user-admin",
    "evolution-proxy"
]

OUTPUT_DIR = Path('supabase/functions')

def download_via_cli(function_name: str) -> bool:
    """Tenta baixar a function via Supabase CLI."""
    try:
        result = subprocess.run(
            ['supabase', 'functions', 'download', function_name],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✓ {function_name} baixada via CLI")
            return True
        else:
            print(f"✗ {function_name} falhou via CLI: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print(f"✗ {function_name} timeout")
        return False
    except FileNotFoundError:
        print("✗ Supabase CLI não encontrado")
        return False
    except Exception as e:
        print(f"✗ Erro ao baixar {function_name}: {e}")
        return False

def main():
    """Função principal."""
    print("===========================================")
    print("Download de Edge Functions do Main")
    print("===========================================")
    print("")
    
    # Verificar se Supabase CLI está instalado
    try:
        subprocess.run(['supabase', '--version'], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("ERRO: Supabase CLI não encontrado!")
        print("")
        print("Instale: https://supabase.com/docs/guides/cli/getting-started")
        print("")
        print("OU use o método manual via Dashboard:")
        print("https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions")
        return
    
    print(f"Total de functions a baixar: {len(EDGE_FUNCTIONS)}")
    print("")
    
    success_count = 0
    failed = []
    
    for i, func_name in enumerate(EDGE_FUNCTIONS, 1):
        print(f"[{i}/{len(EDGE_FUNCTIONS)}] Baixando: {func_name}...", end=" ")
        
        if download_via_cli(func_name):
            success_count += 1
        else:
            failed.append(func_name)
    
    print("")
    print("===========================================")
    print(f"Download concluído: {success_count}/{len(EDGE_FUNCTIONS)}")
    print("===========================================")
    
    if failed:
        print("")
        print("Functions que falharam:")
        for func in failed:
            print(f"  - {func}")
        print("")
        print("Baixe manualmente via Dashboard:")
        print("https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions")

if __name__ == '__main__':
    main()

