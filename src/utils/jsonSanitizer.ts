/**
 * Utilitário para sanitizar objetos com referências circulares
 * AIDEV-NOTE: Resolve o erro "Converting circular structure to JSON"
 * que estava ocorrendo nos logs de segurança
 */

/**
 * Remove referências circulares de um objeto para permitir serialização JSON segura
 * @param obj - Objeto a ser sanitizado
 * @param maxDepth - Profundidade máxima para evitar loops infinitos
 * @returns Objeto sanitizado sem referências circulares
 */
export function sanitizeForJSON(obj: any, maxDepth: number = 10): any {
  const seen = new WeakSet();
  
  function sanitize(value: any, depth: number): any {
    // Limite de profundidade para evitar loops infinitos
    if (depth > maxDepth) {
      return '[Max Depth Reached]';
    }
    
    // Valores primitivos podem ser retornados diretamente
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    // Se já vimos este objeto, temos uma referência circular
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    
    // Marcar este objeto como visto
    seen.add(value);
    
    try {
      // Tratar arrays
      if (Array.isArray(value)) {
        return value.map(item => sanitize(item, depth + 1));
      }
      
      // Tratar objetos Date
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // Tratar objetos Error
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      
      // Tratar objetos DOM (que podem ter referências circulares)
      if (typeof window !== 'undefined' && value instanceof Node) {
        return '[DOM Node]';
      }
      
      // Tratar funções
      if (typeof value === 'function') {
        return '[Function]';
      }
      
      // Tratar objetos regulares
      const sanitized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          try {
            sanitized[key] = sanitize(value[key], depth + 1);
          } catch (error) {
            // Se houver erro ao acessar a propriedade, marcar como inacessível
            sanitized[key] = '[Inaccessible Property]';
          }
        }
      }
      
      return sanitized;
    } finally {
      // Remover da lista de objetos vistos ao sair da recursão
      seen.delete(value);
    }
  }
  
  return sanitize(obj, 0);
}

/**
 * Versão segura do JSON.stringify que lida com referências circulares
 * @param obj - Objeto a ser serializado
 * @param space - Espaçamento para formatação (opcional)
 * @returns String JSON ou mensagem de erro
 */
export function safeJSONStringify(obj: any, space?: string | number): string {
  try {
    const sanitized = sanitizeForJSON(obj);
    return JSON.stringify(sanitized, null, space);
  } catch (error) {
    return JSON.stringify({
      error: 'Failed to serialize object',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: typeof obj
    }, null, space);
  }
}

/**
 * Sanitiza especificamente objetos de metadata para logs de segurança
 * AIDEV-NOTE: Remove propriedades conhecidas que podem causar referências circulares
 * @param metadata - Objeto de metadata a ser sanitizado
 * @returns Metadata sanitizada
 */
export function sanitizeSecurityMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
  if (!metadata) return undefined;
  
  const sanitized = sanitizeForJSON(metadata);
  
  // Remover propriedades específicas que sabemos que podem causar problemas
  const problematicKeys = [
    'target', 'currentTarget', 'nativeEvent', // Eventos DOM
    'ref', 'refs', '_owner', '_store', // React internals
    'dispatch', 'getState', // Redux/Context
    'queryClient', 'cache', // React Query
    'supabase', 'client' // Clientes de API
  ];
  
  function removeProblematicKeys(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(removeProblematicKeys);
    }
    
    const cleaned: any = {};
    for (const key in obj) {
      if (!problematicKeys.includes(key) && obj.hasOwnProperty(key)) {
        cleaned[key] = removeProblematicKeys(obj[key]);
      }
    }
    
    return cleaned;
  }
  
  return removeProblematicKeys(sanitized);
}