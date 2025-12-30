-- AIDEV-NOTE: Adicionar campo fiscal_config na tabela contracts
-- Armazena configurações fiscais por contrato (auto-emissão, momento de emissão, etc)

ALTER TABLE contracts 
ADD COLUMN fiscal_config jsonb DEFAULT '{
  "auto_emit_nfe": false,
  "auto_emit_nfse": false,
  "nfse_emit_moment": "recebimento",
  "nfse_valor_mode": "proporcional",
  "nfse_parcelas_mode": "por_recebimento",
  "auto_send_email": false
}'::jsonb;

COMMENT ON COLUMN contracts.fiscal_config IS 'Configurações fiscais do contrato. Estrutura: {
  "auto_emit_nfe": boolean - Emitir NF-e automaticamente ao faturar,
  "auto_emit_nfse": boolean - Emitir NFS-e automaticamente,
  "nfse_emit_moment": "faturamento" | "recebimento" - Quando emitir NFS-e,
  "nfse_valor_mode": "proporcional" | "total" - Valor da NFS-e,
  "nfse_parcelas_mode": "por_recebimento" | "acumulado" - Como tratar múltiplas parcelas,
  "auto_send_email": boolean - Enviar email automaticamente após emissão
}';

-- Criar índice GIN para buscas eficientes no JSONB
CREATE INDEX idx_contracts_fiscal_config ON contracts USING GIN (fiscal_config);

