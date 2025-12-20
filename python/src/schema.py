from typing import List, Dict, Any


def contrato_columns() -> List[Dict[str, Any]]:
    """
    Define o dicionário de colunas do template de contratos.
    Ajuste conforme sua necessidade.
    """
    return [
        {
            "name": "id_contrato",
            "title": "ID Contrato",
            "type": "text",
            "required": True,
            "width": 18,
            "description": "Identificador único do contrato (pode ser código interno)",
        },
        {
            "name": "cliente_nome",
            "title": "Cliente - Nome",
            "type": "text",
            "required": True,
            "width": 30,
            "description": "Nome/Razão Social do cliente",
        },
        {
            "name": "cliente_cpf_cnpj",
            "title": "Cliente - CPF/CNPJ",
            "type": "text",
            "required": True,
            "width": 18,
            "description": "Documento do cliente (somente números ou com máscara)",
        },
        {
            "name": "data_inicio",
            "title": "Data Início",
            "type": "date",
            "required": True,
            "width": 14,
            "number_format": "dd/mm/yyyy",
            "description": "Data de início do contrato",
        },
        {
            "name": "data_fim",
            "title": "Data Fim",
            "type": "date",
            "required": False,
            "width": 14,
            "number_format": "dd/mm/yyyy",
            "description": "Data de fim do contrato (se houver)",
        },
        {
            "name": "valor_total",
            "title": "Valor Total",
            "type": "number",
            "required": True,
            "width": 16,
            "number_format": "R$ #,##0.00",
            "description": "Valor total do contrato (BRL)",
        },
        {
            "name": "status",
            "title": "Status",
            "type": "list",
            "required": True,
            "width": 12,
            "list_values": ["ativo", "inativo", "suspenso"],
            "description": "Situação do contrato",
        },
        {
            "name": "observacoes",
            "title": "Observações",
            "type": "text",
            "required": False,
            "width": 40,
            "description": "Notas adicionais",
        },
    ]