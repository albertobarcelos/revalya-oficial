#!/usr/bin/env python3
"""
Script para debugar contratos no banco de dados
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')

def main():
    """Função principal"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Erro: SUPABASE_URL e SUPABASE_KEY são obrigatórios")
        return
    
    # Inicializar Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Primeiro, verificar todos os tenants
        print("=== VERIFICANDO TENANTS ===")
        tenants_response = supabase.table('tenants').select('id, name, slug').execute()
        if tenants_response.data:
            print("Tenants encontrados:")
            for tenant in tenants_response.data:
                print(f"ID: {tenant['id']}, Nome: {tenant['name']}, Slug: {tenant['slug']}")
        
        # Verificar contratos sem filtro de tenant
        print("\n=== VERIFICANDO CONTRATOS (SEM FILTRO DE TENANT) ===")
        contracts_response = supabase.table('contracts').select('id, contract_number, tenant_id, created_at').limit(10).execute()
        if contracts_response.data:
            print("Contratos encontrados (primeiros 10):")
            for contract in contracts_response.data:
                print(f"ID: {contract['id']}, Número: {contract['contract_number']}, Tenant: {contract['tenant_id']}, Criado: {contract['created_at']}")
        else:
            print("Nenhum contrato encontrado")
            
        # Verificar total de contratos por tenant
        print("\n=== TOTAL DE CONTRATOS POR TENANT ===")
        for tenant in tenants_response.data:
            count_response = supabase.table('contracts').select('id', count='exact').eq('tenant_id', tenant['id']).execute()
            print(f"Tenant {tenant['name']} ({tenant['id']}): {count_response.count} contratos")
            
        # Verificar se há contratos com números específicos da planilha
        print("\n=== VERIFICANDO CONTRATOS ESPECÍFICOS ===")
        test_numbers = ['27868', '27869', '27870', '27871', '27872']
        for num in test_numbers:
            response = supabase.table('contracts').select('id, contract_number, tenant_id').eq('contract_number', num).execute()
            if response.data:
                for contract in response.data:
                    print(f"Contrato {num}: ENCONTRADO - ID: {contract['id']}, Tenant: {contract['tenant_id']}")
            else:
                print(f"Contrato {num}: NÃO ENCONTRADO")
                
    except Exception as e:
        print(f"Erro ao buscar dados: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()