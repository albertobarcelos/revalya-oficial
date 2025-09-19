import { toast } from '@/components/ui/use-toast';

// AIDEV-NOTE: Serviço para consulta de dados de CNPJ via API pública
// Utiliza a API BrasilAPI para buscar informações completas da empresa
export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  email?: string;
  telefone?: string; // AIDEV-NOTE: Campo legado, mantido para compatibilidade
  ddd_telefone_1?: string; // AIDEV-NOTE: Campo principal de telefone da BrasilAPI
  ddd_telefone_2?: string; // AIDEV-NOTE: Campo secundário de telefone da BrasilAPI
  ddd_fax?: string; // AIDEV-NOTE: Campo de fax da BrasilAPI
  atividade_principal: {
    code: string;
    text: string;
  }[];
  situacao: string;
}

// AIDEV-NOTE: Função principal para consultar CNPJ na BrasilAPI
export async function consultarCNPJ(cnpj: string): Promise<CNPJData | null> {
  try {
    // Remove caracteres não numéricos do CNPJ
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    // Valida se o CNPJ tem 14 dígitos
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve ter 14 dígitos');
    }

    // Consulta na BrasilAPI
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('CNPJ não encontrado');
      }
      throw new Error('Erro ao consultar CNPJ');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro na consulta do CNPJ:', error);
    
    if (error instanceof Error) {
      toast({
        title: 'Erro na consulta',
        description: error.message,
        variant: 'destructive',
      });
    }
    
    return null;
  }
}

// AIDEV-NOTE: Função para mapear dados do CNPJ para o formato do cliente
// Prioriza campos de telefone com DDD da BrasilAPI para melhor qualidade dos dados
export function mapearCNPJParaCliente(cnpjData: CNPJData) {
  // AIDEV-NOTE: Formata telefone priorizando ddd_telefone_1, depois ddd_telefone_2, depois telefone legado
  const formatarTelefone = () => {
    if (cnpjData.ddd_telefone_1) {
      // Formata telefone com DDD: (11) 1234-5678 ou (11) 91234-5678
      const telefone = cnpjData.ddd_telefone_1;
      if (telefone.length === 10) {
        return `(${telefone.substring(0, 2)}) ${telefone.substring(2, 6)}-${telefone.substring(6)}`;
      } else if (telefone.length === 11) {
        return `(${telefone.substring(0, 2)}) ${telefone.substring(2, 7)}-${telefone.substring(7)}`;
      }
      return telefone;
    }
    if (cnpjData.ddd_telefone_2) {
      const telefone = cnpjData.ddd_telefone_2;
      if (telefone.length === 10) {
        return `(${telefone.substring(0, 2)}) ${telefone.substring(2, 6)}-${telefone.substring(6)}`;
      } else if (telefone.length === 11) {
        return `(${telefone.substring(0, 2)}) ${telefone.substring(2, 7)}-${telefone.substring(7)}`;
      }
      return telefone;
    }
    return cnpjData.telefone || '';
  };

  return {
    name: cnpjData.nome_fantasia || cnpjData.razao_social,
    company: cnpjData.razao_social,
    cpfCnpj: cnpjData.cnpj,
    email: cnpjData.email || '',
    phone: formatarTelefone(),
    address: cnpjData.logradouro,
    addressNumber: cnpjData.numero,
    complement: cnpjData.complemento || '',
    neighborhood: cnpjData.bairro,
    city: cnpjData.municipio,
    state: cnpjData.uf,
    postal_code: cnpjData.cep, // AIDEV-NOTE: Campo correto conforme schema da tabela customers
    country: 'Brasil'
  };
}

// AIDEV-NOTE: Função para validar CNPJ (algoritmo oficial)
export function validarCNPJ(cnpj: string): boolean {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) return false;
  
  // Elimina CNPJs inválidos conhecidos
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;
  
  // Valida DVs
  let tamanho = cnpjLimpo.length - 2;
  let numeros = cnpjLimpo.substring(0, tamanho);
  let digitos = cnpjLimpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpjLimpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

// AIDEV-NOTE: Função para validar CPF (algoritmo oficial)
export function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) return false;
  
  // Elimina CPFs inválidos conhecidos
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  // Valida 1º dígito
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
  
  // Valida 2º dígito
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpfLimpo.charAt(10));
}

// AIDEV-NOTE: Função para determinar se o documento é CPF ou CNPJ
export function isCNPJ(documento: string): boolean {
  const documentoLimpo = documento.replace(/\D/g, '');
  return documentoLimpo.length === 14;
}

export function isCPF(documento: string): boolean {
  const documentoLimpo = documento.replace(/\D/g, '');
  return documentoLimpo.length === 11;
}
