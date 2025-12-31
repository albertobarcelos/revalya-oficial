/**
 * Edge Function: Validação de Certificado Digital
 * 
 * AIDEV-NOTE: Valida certificados digitais PFX/P12 e extrai informações
 * 
 * Endpoint:
 * - POST /validate-certificate - Validar certificado digital
 * 
 * Body:
 * {
 *   "arquivo_certificado_base64": "string (base64)",
 *   "senha_certificado": "string"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "valid": true,
 *     "info": {
 *       "tipo": "e-PJ A1",
 *       "emitidoPara": "string",
 *       "emitidoPor": "string",
 *       "validoDe": "string",
 *       "validoAte": "string",
 *       "cnpj": "string",
 *       "cpf": "string"
 *     }
 *   }
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";

/**
 * Valida certificado PFX/P12 usando node-forge
 * AIDEV-NOTE: Valida a senha e extrai informações do certificado
 */
async function validatePFXCertificate(
  pfxBase64: string,
  password: string
): Promise<{
  valid: boolean;
  info?: {
    tipo: string;
    emitidoPara: string;
    emitidoPor: string;
    validoDe: string;
    validoAte: string;
    cnpj?: string;
    cpf?: string;
  };
  error?: string;
}> {
  try {
    // AIDEV-NOTE: Importar node-forge dinamicamente
    // Usando esm.sh para compatibilidade com Deno - acessar via .default
    const forgeModule = await import("https://esm.sh/node-forge@1.3.1");
    const forge = forgeModule.default || forgeModule;
    
    console.log('[validatePFXCertificate] pfxBase64 length:', pfxBase64?.length);
    
    // AIDEV-NOTE: Usar forge.util.decode64 para decodificar base64
    // Isso retorna uma string binária que o forge entende
    const pfxDer = forge.util.decode64(pfxBase64);
    
    console.log('[validatePFXCertificate] pfxDer length:', pfxDer?.length);
    
    if (!pfxDer || pfxDer.length === 0) {
      return {
        valid: false,
        error: 'Falha ao decodificar base64 do certificado'
      };
    }
    
    // AIDEV-NOTE: Tentar converter PKCS12 com a senha fornecida
    let p12: any;
    try {
      // AIDEV-NOTE: Converter DER para ASN1 e depois para PKCS12
      // forge.util.decode64 já retorna string binária pronta para fromDer
      const asn1 = forge.asn1.fromDer(pfxDer);
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    } catch (error: any) {
      // AIDEV-NOTE: Se falhar, provavelmente a senha está incorreta
      // O node-forge retorna diferentes erros dependendo do tipo de falha na descriptografia
      const errorMsg = error?.message || String(error);
      console.log('[validatePFXCertificate] Erro ao processar PKCS12:', errorMsg);
      
      // AIDEV-NOTE: Lista de padrões de erro que indicam senha incorreta
      // "Too few bytes to parse DER" ocorre quando a descriptografia falha
      const passwordErrorPatterns = [
        'password',
        'decrypt',
        'Invalid',
        'MAC',
        'Too few bytes',
        'parse DER',
        'PKCS#12',
        'pkcs12',
        'bad decrypt',
        'wrong tag',
        'length too short'
      ];
      
      const isPasswordError = passwordErrorPatterns.some(pattern => 
        errorMsg.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isPasswordError) {
        return {
          valid: false,
          error: 'Senha do certificado incorreta',
        };
      }
      throw error;
    }
    
    // AIDEV-NOTE: Extrair certificados do PKCS12
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag];
    
    if (!certBag || certBag.length === 0) {
      return {
        valid: false,
        error: 'Nenhum certificado encontrado no arquivo PFX',
      };
    }
    
    // AIDEV-NOTE: Pegar o primeiro certificado
    const cert = certBag[0].cert;
    if (!cert) {
      return {
        valid: false,
        error: 'Erro ao extrair certificado do arquivo PFX',
      };
    }
    
    // AIDEV-NOTE: Extrair informações do certificado
    const subject = cert.subject;
    const issuer = cert.issuer;
    
    // AIDEV-NOTE: Extrair CNPJ ou CPF do subject
    const getAttribute = (attrs: any, oid: string): string | undefined => {
      try {
        const attr = attrs.getAttribute(oid);
        return attr ? String(attr.value) : undefined;
      } catch {
        return undefined;
      }
    };
    
    // AIDEV-NOTE: Tentar diferentes OIDs para CNPJ/CPF
    const cnpj = getAttribute(subject, '2.5.4.5') || // serialNumber
                  getAttribute(subject, '2.16.76.1.3.1') || // CNPJ
                  getAttribute(subject, '2.16.76.1.3.3') || // CNPJ alternativo
                  undefined;
    
    const cpf = getAttribute(subject, '2.16.76.1.3.2') || // CPF
                undefined;
    
    // AIDEV-NOTE: Extrair Common Name (CN)
    let commonName = getAttribute(subject, '2.5.4.3'); // CN
    if (!commonName) {
      // AIDEV-NOTE: Tentar pegar do primeiro atributo disponível
      const attrs = subject.attributes || [];
      if (attrs.length > 0) {
        commonName = attrs[0].value || 'Não informado';
      } else {
        commonName = 'Não informado';
      }
    }
    
    // AIDEV-NOTE: Extrair nome do emissor
    let issuerName = getAttribute(issuer, '2.5.4.3'); // CN
    if (!issuerName) {
      const issuerAttrs = issuer.attributes || [];
      if (issuerAttrs.length > 0) {
        issuerName = issuerAttrs[0].value || 'Autoridade Certificadora';
      } else {
        issuerName = 'Autoridade Certificadora';
      }
    }
    
    // AIDEV-NOTE: Extrair datas de validade
    const validFrom = cert.validity.notBefore;
    const validTo = cert.validity.notAfter;
    
    // AIDEV-NOTE: Formatar datas para pt-BR
    const formatDate = (date: Date): string => {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };
    
    // AIDEV-NOTE: Verificar se o certificado está válido
    const now = new Date();
    if (validTo < now) {
      return {
        valid: false,
        error: `Certificado expirado em ${formatDate(validTo)}`,
      };
    }
    
    if (validFrom > now) {
      return {
        valid: false,
        error: `Certificado ainda não é válido. Válido a partir de ${formatDate(validFrom)}`,
      };
    }
    
    return {
      valid: true,
      info: {
        tipo: 'e-PJ A1',
        emitidoPara: commonName,
        emitidoPor: issuerName,
        validoDe: formatDate(validFrom),
        validoAte: formatDate(validTo),
        cnpj: cnpj,
        cpf: cpf,
      },
    };
    
  } catch (error: any) {
    console.error('[validatePFXCertificate] Erro ao validar certificado:', error);
    
    // AIDEV-NOTE: Tratar erros específicos
    if (error.message?.includes('password') || error.message?.includes('decrypt')) {
      return {
        valid: false,
        error: 'Senha do certificado incorreta',
      };
    }
    
    if (error.message?.includes('Invalid') || error.message?.includes('corrupt')) {
      return {
        valid: false,
        error: 'Arquivo de certificado inválido ou corrompido',
      };
    }
    
    return {
      valid: false,
      error: error.message || 'Erro ao validar certificado',
    };
  }
}

/**
 * Handler principal da Edge Function
 */
Deno.serve(async (req: Request) => {
  // AIDEV-NOTE: CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // AIDEV-NOTE: Validar requisição (autenticação e tenant obrigatórios)
    const validation = await validateRequest(req, {
      allowedMethods: ['POST'],
      requireAuth: true,
      requireTenant: true,
      maxBodySize: 10 * 1024 * 1024, // 10MB máximo para certificado
    });
    
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
        }),
        {
          status: validation.status || 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // AIDEV-NOTE: Extrair dados do body
    const body = await req.json();
    const { arquivo_certificado_base64, senha_certificado } = body;
    
    if (!arquivo_certificado_base64 || !senha_certificado) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Arquivo e senha do certificado são obrigatórios',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // AIDEV-NOTE: Validar tamanho do arquivo (máximo 5MB)
    const fileSize = (arquivo_certificado_base64.length * 3) / 4; // Aproximação base64
    if (fileSize > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Arquivo de certificado muito grande. Máximo: 5MB',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // AIDEV-NOTE: Validar certificado
    console.log('[validate-certificate] Iniciando validação de certificado:', {
      tenant_id: validation.tenantId,
      tamanho_arquivo: fileSize,
      senha_preenchida: !!senha_certificado,
    });
    
    const result = await validatePFXCertificate(
      arquivo_certificado_base64,
      senha_certificado
    );
    
    if (!result.valid) {
      console.error('[validate-certificate] Certificado inválido:', result.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Certificado inválido',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    console.log('[validate-certificate] Certificado validado com sucesso:', {
      tenant_id: validation.tenantId,
      tipo: result.info?.tipo,
      emitidoPara: result.info?.emitidoPara,
      validoAte: result.info?.validoAte,
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          valid: true,
          info: result.info,
          message: 'Certificado validado com sucesso',
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
    
  } catch (error: any) {
    console.error('[validate-certificate] Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
