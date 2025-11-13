#!/usr/bin/env python3
"""
Script para verificar a estrutura da tabela contract_services no Supabase
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
TENANT_ID = '8d2888f1-64a5-445f-84f5-2614d5160251'  # Tenant ID correto

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Erro: Variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY não encontradas")
        return
    
    # Criar cliente Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Verificar estrutura da tabela contract_services
        print("=== ESTRUTURA DA TABELA CONTRACT_SERVICES ===")
        
        # Buscar informações da tabela
        result = supabase.rpc('get_table_columns', {'table_name': 'contract_services'}).execute()
        
        if result.data:
            print("Colunas da tabela contract_services:")
            for column in result.data:
                print(f"  - {column['column_name']}: {column['data_type']}")
        else:
            print("Não foi possível obter a estrutura da tabela via RPC, tentando consulta direta...")
            
            # Tentar buscar alguns registros para ver a estrutura
            result = supabase.from('contract_services').select('*').limit(1).execute()
            
            if result.data and len(result.data) > 0:
                print("Estrutura baseada em registro existente:")
                for key, value in result.data[0].items():
                    print(f"  - {key}: {type(value).__name__}")
            else:
                print("Nenhum registro encontrado na tabela contract_services")
        
        # Verificar se há registros
        count_result = supabase.from('contract_services').select('*', count='exact').execute()
        print(f"\nTotal de registros na tabela contract_services: {count_result.count}")
        
        # Buscar serviços existentes
        print("\n=== SERVIÇOS EXISTENTES ===")
        services_result = supabase.from('services').select('*').limit(10).execute()
        
        if services_result.data:
            print("Serviços disponíveis:")
            for service in services_result.data:
                print(f"  - ID: {service.get('id', 'N/A')}, Nome: {service.get('name', 'N/A')}")
        else:
            print("Nenhum serviço encontrado")
        
        # Buscar tipos de serviços
        print("\n=== TIPOS DE SERVIÇOS ===")
        service_types_result = supabase.from('service_types').select('*').execute()
        
        if service_types_result.data:
            print("Tipos de serviços:")
            for st in service_types_result.data:
                print(f"  - ID: {st.get('id', 'N/A')}, Nome: {st.get('name', 'N/A')}")
        else:
            print("Nenhum tipo de serviço encontrado")
        
    except Exception as e:
        print(f"Erro ao acessar Supabase: {e}")

if __name__ == "__main__":
    main()