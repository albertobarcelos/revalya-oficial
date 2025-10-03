// =====================================================
// SECURITY UTILITIES
// Descrição: Funções de segurança para a aplicação
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// =====================================================

// AIDEV-NOTE: Gera um token seguro com o tamanho especificado usando Web Crypto API
export function generateSecureToken(length: number): string {
  const array = new Uint8Array(Math.ceil(length / 2))
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// AIDEV-NOTE: Compara dois tokens de forma segura (timing-safe)
export function compareTokens(token1: string, token2: string): boolean {
  if (token1.length !== token2.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < token1.length; i++) {
    result |= token1.charCodeAt(i) ^ token2.charCodeAt(i)
  }
  return result === 0
}

// AIDEV-NOTE: Valida um token HMAC usando Web Crypto API
export async function validateHmacToken(
  payload: string,
  token: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(payload)
    const keyData = encoder.encode(secret)
    
    // AIDEV-NOTE: Importa a chave para uso com HMAC-SHA256
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    // AIDEV-NOTE: Gera a assinatura HMAC
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      data
    )
    
    // AIDEV-NOTE: Converte o buffer para string hexadecimal
    const calculatedToken = Array.from(new Uint8Array(signatureBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
    
    // AIDEV-NOTE: Compara os tokens de forma segura
    return compareTokens(calculatedToken, token)
  } catch (error) {
    console.error('Erro na validação HMAC:', error)
    return false
  }
}
