# Projeto: Importação de Contratos para Supabase

Este projetinho em Python ajuda a:
- Gerar uma planilha Excel (xlsx) já configurada para cadastro de contratos.
- Ler uma planilha preenchida e importar os registros para uma tabela no Supabase.

## Requisitos
- Python 3.10+
- Supabase (URL e chave de API do seu projeto)

## Configuração rápida
1. Crie e ative um ambiente virtual (Windows PowerShell):
   - `python -m venv .venv`
   - `./.venv/Scripts/Activate.ps1`
2. Instale as dependências:
   - `pip install -r requirements.txt`
3. Configure variáveis de ambiente:
   - Copie `.env.example` para `.env` e preencha `SUPABASE_URL` e `SUPABASE_KEY`.

## Estrutura
- `main.py`: ponto de entrada da CLI.
- `src/schema.py`: definição das colunas e validações da planilha.
- `src/excel_template.py`: geração do template Excel.
- `src/config.py`: carregamento de variáveis e criação do cliente Supabase.
- `src/import_supabase.py`: leitura/validação da planilha e importação para Supabase.
- `contratos_template.xlsx`: arquivo gerado com o template (após executar o comando).

## Uso da CLI
Ative o venv e execute:

### Gerar template
```
python main.py gerar-template --output contratos_template.xlsx
```

### Importar planilha para o Supabase
```
python main.py importar --xlsx contratos.xlsx --tabela contratos
```

Opções úteis:
- `--dry-run`: só valida e mostra um resumo, sem enviar para o Supabase.

## Observações
- O projeto espera que exista uma tabela `contratos` no Supabase com colunas equivalentes ao template. Se ainda não existe, posso te ajudar a criar via SQL/migração.
- Campos de datas são gravados em formato ISO (YYYY-MM-DD).
- O valor total é tratado como decimal (float) e formatado em Excel como moeda BRL.

## Próximos passos
- Ajustar o esquema (colunas) conforme sua necessidade real de contratos.
- Implementar opção de upsert (evitar duplicidade por `id_contrato`).
- Adicionar testes automatizados.