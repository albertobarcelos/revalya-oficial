#!/usr/bin/env python3
"""
Script para baixar todas as Edge Functions do Supabase via API
e sincronizar com o ambiente local.

Requer:
- Access Token do Supabase (Dashboard > Account > Access Tokens)
- Project Reference ID
"""

import os
import json
import requests
from pathlib import Path
from typing import List, Dict

# CONFIGURAÇÃO
SUPABASE_ACCESS_TOKEN = os.getenv('SUPABASE_ACCESS_TOKEN', '')
PROJECT_REF = os.getenv('SUPABASE_PROJECT_REF', '')
OUTPUT_DIR = Path('supabase/functions')

def get_edge_functions(access_token: str, project_ref: str) -> List[Dict]:
    """Lista todas as Edge Functions do projeto."""
    url = f"https://api.supabase.com/v1/projects/{project_ref}/functions"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def get_edge_function_code(access_token: str, project_ref: str, function_name: str) -> str:
    """Obtém o código de uma Edge Function específica."""
    # Nota: A API do Supabase pode não ter endpoint direto para código
    # Pode ser necessário usar o Supabase Management API ou Dashboard
    url = f"https://api.supabase.com/v1/projects/{project_ref}/functions/{function_name}"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"ERRO ao obter código da function {function_name}: {e}")
        return None

def save_function_code(function_name: str, code: str, output_dir: Path):
    """Salva o código da function no diretório local."""
    function_dir = output_dir / function_name
    function_dir.mkdir(parents=True, exist_ok=True)
    
    index_file = function_dir / 'index.ts'
    with open(index_file, 'w', encoding='utf-8') as f:
        f.write(code)
    
    print(f"✓ {function_name} salva em {index_file}")

def main():
    """Função principal."""
    if not SUPABASE_ACCESS_TOKEN:
        print("ERRO: SUPABASE_ACCESS_TOKEN não configurado!")
        print("Configure: export SUPABASE_ACCESS_TOKEN='seu-token'")
        return
    
    if not PROJECT_REF:
        print("ERRO: SUPABASE_PROJECT_REF não configurado!")
        print("Configure: export SUPABASE_PROJECT_REF='seu-project-ref'")
        return
    
    print("===========================================")
    print("Download de Edge Functions do Supabase")
    print("===========================================")
    print("")
    
    try:
        # Listar functions
        print("Listando Edge Functions...")
        functions = get_edge_functions(SUPABASE_ACCESS_TOKEN, PROJECT_REF)
        
        print(f"Encontradas {len(functions)} functions")
        print("")
        
        # Baixar cada function
        for func in functions:
            func_name = func.get('name', '')
            print(f"Baixando: {func_name}...")
            
            code = get_edge_function_code(SUPABASE_ACCESS_TOKEN, PROJECT_REF, func_name)
            if code:
                # Ajustar conforme estrutura da resposta da API
                function_code = code.get('code', code.get('body', ''))
                if function_code:
                    save_function_code(func_name, function_code, OUTPUT_DIR)
                else:
                    print(f"⚠ Código não encontrado para {func_name}")
            else:
                print(f"✗ Falha ao baixar {func_name}")
        
        print("")
        print("===========================================")
        print("Download concluído!")
        print("===========================================")
        
    except requests.exceptions.RequestException as e:
        print(f"ERRO na requisição: {e}")
        print("")
        print("NOTA: A API do Supabase pode não ter endpoint direto para código de Edge Functions.")
        print("Use o método manual via Dashboard ou Supabase CLI.")
    except Exception as e:
        print(f"ERRO: {e}")

if __name__ == '__main__':
    main()

