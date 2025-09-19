// AIDEV-NOTE: Utilitários para identificação e formatação de tipos de parcela
// Centraliza a lógica para determinar se uma cobrança é parcelada, recorrente ou única

/**
 * Extrai informações de parcela da descrição da cobrança
 * @param description - Descrição da cobrança
 * @returns Objeto com informações de parcela ou null se não for parcelado
 */
export const extractInstallmentInfo = (description: string | null): { current: number; total: number } | null => {
  if (!description) return null;
  
  // Regex para capturar "Parcela X/Y" na descrição
  const match = description.match(/Parcela (\d+)\/(\d+)/);
  if (match) {
    return {
      current: parseInt(match[1], 10),
      total: parseInt(match[2], 10)
    };
  }
  
  return null;
};

/**
 * Determina o tipo de parcela baseado na descrição e outras informações
 * @param description - Descrição da cobrança
 * @param contractId - ID do contrato (opcional, para futuras consultas)
 * @returns Tipo da parcela: 'parcelado', 'recorrente' ou 'único'
 */
export const getInstallmentType = (description: string | null, contractId?: string): 'parcelado' | 'recorrente' | 'único' => {
  if (!description) return 'único';
  
  // Verifica se é parcelado (contém "Parcela X/Y")
  const installmentInfo = extractInstallmentInfo(description);
  if (installmentInfo) {
    return 'parcelado';
  }
  
  // Verifica se é recorrente (contém indicadores de recorrência)
  const recurrentIndicators = [
    /recorrente/i,
    /mensal/i,
    /trimestral/i,
    /semestral/i,
    /anual/i,
    /\d{2}\/\d{4}/, // Padrão MM/YYYY
  ];
  
  const isRecurrent = recurrentIndicators.some(pattern => pattern.test(description));
  if (isRecurrent) {
    return 'recorrente';
  }
  
  // Se não é parcelado nem recorrente, é único
  return 'único';
};

/**
 * Formata o texto de exibição para a coluna de parcelas
 * @param description - Descrição da cobrança
 * @param contractId - ID do contrato (opcional)
 * @returns String formatada para exibição
 */
export const formatInstallmentDisplay = (description: string | null, contractId?: string): string => {
  const installmentInfo = extractInstallmentInfo(description);
  
  if (installmentInfo) {
    return `${installmentInfo.current}/${installmentInfo.total}`;
  }
  
  const type = getInstallmentType(description, contractId);
  
  switch (type) {
    case 'recorrente':
      return 'Recorrente';
    case 'único':
    default:
      return 'Único';
  }
};

/**
 * Determina a cor do badge baseado no tipo de parcela
 * @param description - Descrição da cobrança
 * @param contractId - ID do contrato (opcional)
 * @returns Variant do badge para aplicar cor
 */
export const getInstallmentBadgeVariant = (description: string | null, contractId?: string): 'default' | 'secondary' | 'outline' => {
  const type = getInstallmentType(description, contractId);
  
  switch (type) {
    case 'parcelado':
      return 'default'; // Azul
    case 'recorrente':
      return 'secondary'; // Cinza
    case 'único':
    default:
      return 'outline'; // Borda
  }
};
