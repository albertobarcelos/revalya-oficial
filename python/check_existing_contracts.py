#!/usr/bin/env python3
"""
Script para verificar quais contratos existem no banco de dados
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
TENANT_ID = os.getenv('TENANT_ID', 'c9ed4c60-0b15-4d21-9c99-1d55e5b3e5f0')

def main():
    """Função principal"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Erro: SUPABASE_URL e SUPABASE_KEY são obrigatórios")
        return
    
    # Inicializar Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Buscar contratos existentes
        response = supabase.table('contracts').select('contract_number, id').eq('tenant_id', TENANT_ID).order('contract_number', desc=False).limit(100).execute()
        
        if response.data:
            print("Contratos encontrados no banco:")
            print("-" * 50)
            for contract in response.data:
                print(f"Contract Number: {contract['contract_number']} -> ID: {contract['id']}")
            
            print(f"\nTotal de contratos no banco: {len(response.data)}")
            
            # Verificar números específicos que estavam na planilha
            print("\nVerificando números da planilha...")
            test_numbers = ['27868', '27869', '27870', '27871']
            for num in test_numbers:
                found = any(str(contract['contract_number']) == num for contract in response.data)
                print(f"Contrato {num}: {'ENCONTRADO' if found else 'NÃO ENCONTRADO'}")
        else:
            print("Nenhum contrato encontrado no banco de dados")
            
    except Exception as e:
        print(f"Erro ao buscar contratos: {e}")

if __name__ == "__main__":
    main()