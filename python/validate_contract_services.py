#!/usr/bin/env python3
"""
Script para validar as vinculações de serviços aos contratos criadas
"""

import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configurações do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
TENANT_ID = 'c9b0c8b6-1c3e-4b99-9b3c-9b3c9b3c9b3c'

def validate_contract_services():
    """Valida as vinculações criadas"""
    
    print("🔍 Iniciando validação das vinculações...")
    
    # Configura o cliente Supabase
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_KEY não configuradas!")
        return
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    try:
        # Busca todas as vinculações
        result = supabase.table('contract_services').select('*').eq('tenant_id', TENANT_ID).execute()
        
        if not result.data:
            print("⚠️  Nenhuma vinculação encontrada!")
            return
        
        vinculacoes = result.data
        total_vinculacoes = len(vinculacoes)
        
        print(f"📊 Total de vinculações encontradas: {total_vinculacoes}")
        
        # Estatísticas por serviço
        servico_stats = {}
        contratos_unicos = set()
        servicos_unicos = set()
        
        for vinculo in vinculacoes:
            contract_id = vinculo.get('contract_id')
            service_id = vinculo.get('service_id')
            quantity = vinculo.get('quantity', 0)
            unit_price = vinculo.get('unit_price', 0)
            total_amount = vinculo.get('total_amount', 0)
            
            contratos_unicos.add(contract_id)
            servicos_unicos.add(service_id)
            
            # Conta por serviço
            if service_id not in servico_stats:
                servico_stats[service_id] = {
                    'count': 0,
                    'total_quantity': 0,
                    'total_value': 0
                }
            
            servico_stats[service_id]['count'] += 1
            servico_stats[service_id]['total_quantity'] += quantity
            servico_stats[service_id]['total_value'] += total_amount
        
        print(f"📋 Contratos únicos com serviços: {len(contratos_unicos)}")
        print(f"🔧 Serviços únicos vinculados: {len(servicos_unicos)}")
        
        # Busca nomes dos serviços
        service_names = {}
        if servicos_unicos:
            service_result = supabase.table('services').select('id', 'name').in_('id', list(servicos_unicos)).execute()
            if service_result.data:
                service_names = {s['id']: s['name'] for s in service_result.data}
        
        # Busca nomes dos contratos
        contract_names = {}
        if contratos_unicos:
            contract_result = supabase.table('contracts').select('id', 'contract_number').in_('id', list(contratos_unicos)).execute()
            if contract_result.data:
                contract_names = {c['id']: c['contract_number'] for c in contract_result.data}
        
        print("\n📈 Estatísticas por Serviço:")
        print("-" * 60)
        for service_id, stats in servico_stats.items():
            service_name = service_names.get(service_id, f'Serviço {service_id}')
            print(f"  {service_name}:")
            print(f"    Quantidade de vinculações: {stats['count']}")
            print(f"    Quantidade total: {stats['total_quantity']}")
            print(f"    Valor total: R$ {stats['total_value']:,.2f}")
            print()
        
        # Validações específicas
        print("🔍 Validações de integridade:")
        print("-" * 60)
        
        # Verifica vinculações com quantidade zero
        zero_quantity = [v for v in vinculacoes if v.get('quantity', 0) == 0]
        if zero_quantity:
            print(f"⚠️  {len(zero_quantity)} vinculações com quantidade zero")
        else:
            print("✅ Nenhuma vinculação com quantidade zero")
        
        # Verifica vinculações com preço unitário negativo
        negative_price = [v for v in vinculacoes if v.get('unit_price', 0) < 0]
        if negative_price:
            print(f"⚠️  {len(negative_price)} vinculações com preço unitário negativo")
        else:
            print("✅ Nenhuma vinculação com preço unitário negativo")
        
        # Verifica vinculações sem tenant_id
        no_tenant = [v for v in vinculacoes if not v.get('tenant_id')]
        if no_tenant:
            print(f"❌ {len(no_tenant)} vinculações sem tenant_id")
        else:
            print("✅ Todas as vinculações têm tenant_id")
        
        # Verifica vinculações inativas
        inactive = [v for v in vinculacoes if not v.get('is_active', True)]
        if inactive:
            print(f"ℹ️  {len(inactive)} vinculações inativas")
        else:
            print("✅ Todas as vinculações estão ativas")
        
        # Verifica vinculações com no_charge
        no_charge = [v for v in vinculacoes if v.get('no_charge', False)]
        if no_charge:
            print(f"ℹ️  {len(no_charge)} vinculações sem cobrança (no_charge)")
        else:
            print("✅ Nenhuma vinculação sem cobrança")
        
        # Amostra de vinculações para verificação manual
        print(f"\n📝 Amostra de vinculações (primeiras 5):")
        print("-" * 60)
        for i, vinculo in enumerate(vinculacoes[:5]):
            contract_num = contract_names.get(vinculo.get('contract_id'), 'Desconhecido')
            service_name = service_names.get(vinculo.get('service_id'), 'Desconhecido')
            print(f"  {i+1}. Contrato: {contract_num} | Serviço: {service_name}")
            print(f"     Quantidade: {vinculo.get('quantity')} | Preço: R$ {vinculo.get('unit_price', 0):,.2f}")
            print(f"     Total: R$ {vinculo.get('total_amount', 0):,.2f}")
            print()
        
        print("✅ Validação concluída com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro durante a validação: {str(e)}")
        return

def main():
    """Função principal"""
    try:
        validate_contract_services()
    except KeyboardInterrupt:
        print("\n⚠️  Validação interrompida pelo usuário")
    except Exception as e:
        print(f"❌ Erro fatal: {str(e)}")

if __name__ == "__main__":
    main()