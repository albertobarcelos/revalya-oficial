#!/usr/bin/env python3
"""
Script para buscar contract_id pelo contract_number e preencher na planilha
"""

import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
TENANT_ID = '8d2888f1-64a5-445f-84f5-2614d5160251'  # Tenant correto baseado nos dados

def get_contract_id(contract_number, supabase_client):
    """Busca o contract_id pelo contract_number"""
    try:
        response = supabase_client.table('contracts').select('id').eq('contract_number', contract_number).eq('tenant_id', TENANT_ID).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]['id']
        return None
    except Exception as e:
        print(f"Erro ao buscar contract_id para {contract_number}: {e}")
        return None

def main():
    """Função principal"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Erro: SUPABASE_URL e SUPABASE_KEY são obrigatórios")
        return
    
    # Inicializar Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Caminho do arquivo
    file_path = "python/contratos_prontos.xlsx"
    
    try:
        # Carregar a planilha
        df = pd.read_excel(file_path)
        print(f"Planilha carregada com {len(df)} linhas")
        
        # Verificar se a coluna contract_id já existe, se não, criar
        if 'contract_id' not in df.columns:
            df['contract_id'] = ''
        
        # Processar cada linha
        found_count = 0
        not_found_count = 0
        
        for index, row in df.iterrows():
            contract_number = row['CodGE']
            
            # Pular linhas sem contract_number
            if pd.isna(contract_number) or contract_number == '':
                continue
            
            # Buscar o contract_id
            contract_id = get_contract_id(contract_number, supabase)
            
            if contract_id:
                df.at[index, 'contract_id'] = contract_id
                found_count += 1
                print(f"Linha {index + 1}: Contract {contract_number} -> ID: {contract_id}")
            else:
                not_found_count += 1
                print(f"Linha {index + 1}: Contract {contract_number} -> NÃO ENCONTRADO")
        
        # Salvar a planilha atualizada
        output_file = "python/contratos_prontos_with_ids.xlsx"
        df.to_excel(output_file, index=False)
        
        print(f"\nResumo:")
        print(f"- Contratos encontrados: {found_count}")
        print(f"- Contratos não encontrados: {not_found_count}")
        print(f"- Planilha salva em: {output_file}")
        
        # Criar relatório de não encontrados
        if not_found_count > 0:
            not_found_df = df[df['contract_id'] == ''][['CodGE', 'customer_id', 'loja']].dropna(subset=['CodGE'])
            not_found_file = "python/contract_numbers_not_found.csv"
            not_found_df.to_csv(not_found_file, index=False)
            print(f"- Relatório de não encontrados salvo em: {not_found_file}")
            
    except Exception as e:
        print(f"Erro ao processar planilha: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()