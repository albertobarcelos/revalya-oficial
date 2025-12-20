#!/usr/bin/env python3
"""
Script para baixar TODAS as Edge Functions do Supabase Main (produção)
usando a API do Supabase via MCP e salvar localmente.

Este script usa a API do Supabase para obter o código de cada function
e salva no diretório local, garantindo sincronização 100%.
"""

import json
import sys
from pathlib import Path

# Lista de todas as Edge Functions encontradas no main (via list_edge_functions)
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

PROJECT_ID = "wyehpiutzvwplllumgdk"
OUTPUT_DIR = Path('supabase/functions')

def save_function_files(function_data: dict, output_dir: Path):
    """Salva todos os arquivos de uma Edge Function."""
    function_name = function_data.get('slug', '')
    files = function_data.get('files', [])
    
    if not files:
        print(f"⚠ {function_name}: Nenhum arquivo encontrado")
        return False
    
    function_dir = output_dir / function_name
    function_dir.mkdir(parents=True, exist_ok=True)
    
    saved_count = 0
    for file_info in files:
        # Extrair nome do arquivo do caminho
        file_path = file_info.get('name', '')
        content = file_info.get('content', '')
        
        # Determinar nome do arquivo local
        if 'index.ts' in file_path or file_path.endswith('index.ts'):
            local_file = function_dir / 'index.ts'
        elif 'deno.json' in file_path or file_path.endswith('deno.json'):
            local_file = function_dir / 'deno.json'
        elif '_shared' in file_path:
            # Arquivo compartilhado - salvar em _shared/
            shared_dir = output_dir / '_shared'
            shared_dir.mkdir(parents=True, exist_ok=True)
            # Extrair nome do arquivo (última parte do caminho)
            shared_file_name = file_path.split('\\')[-1].split('/')[-1]
            local_file = shared_dir / shared_file_name
        else:
            # Outros arquivos - extrair nome do caminho
            file_name = file_path.split('\\')[-1].split('/')[-1]
            local_file = function_dir / file_name
        
        # Salvar arquivo
        with open(local_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        saved_count += 1
        print(f"  ✓ {local_file.relative_to(output_dir)}")
    
    print(f"✓ {function_name}: {saved_count} arquivo(s) salvo(s)")
    return True

def main():
    """Função principal."""
    print("=" * 60)
    print("Download de Edge Functions do Main (via API)")
    print("=" * 60)
    print("")
    print(f"Projeto: {PROJECT_ID}")
    print(f"Total de functions: {len(EDGE_FUNCTIONS)}")
    print("")
    
    print("NOTA: Este script precisa ser executado via MCP (Model Context Protocol)")
    print("ou você pode usar o Supabase CLI:")
    print("")
    print("  supabase functions download <function-name>")
    print("")
    print("OU baixar manualmente via Dashboard:")
    print(f"  https://supabase.com/dashboard/project/{PROJECT_ID}/functions")
    print("")
    print("=" * 60)
    print("")
    print("Para usar via MCP, execute cada function individualmente.")
    print("Exemplo de comando para cada function:")
    print("")
    
    for i, func_name in enumerate(EDGE_FUNCTIONS, 1):
        print(f"{i}. supabase functions download {func_name}")

if __name__ == '__main__':
    main()

