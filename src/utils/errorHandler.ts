// AIDEV-NOTE: Utilitário para capturar e tratar erros relacionados a extensões do navegador
// Previne que erros de message channels afetem a aplicação

/**
 * Configura handlers globais para capturar erros relacionados a extensões do navegador
 * Especialmente útil para prevenir erros de "message channel closed" do DevTools
 */
export function setupGlobalErrorHandlers() {
  // Captura erros não tratados relacionados a message channels
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || '';
    
    // Lista de erros conhecidos relacionados a extensões que devem ser ignorados
    const extensionErrors = [
      'A listener indicated an asynchronous response by returning true',
      'message channel closed before a response was received',
      'Extension context invalidated',
      'Could not establish connection',
      'The message port closed before a response was received',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://'
    ];
    
    // Se o erro é relacionado a extensões, previne que seja propagado
    if (extensionErrors.some(pattern => errorMessage.includes(pattern))) {
      console.warn('🔧 Erro de extensão do navegador capturado e ignorado:', errorMessage);
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });
  
  // Captura erros de promises rejeitadas relacionadas a extensões
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    
    const extensionErrors = [
      'A listener indicated an asynchronous response by returning true',
      'message channel closed before a response was received',
      'Extension context invalidated',
      'Could not establish connection',
      'The message port closed before a response was received'
    ];
    
    if (extensionErrors.some(pattern => reason.includes(pattern))) {
      console.warn('🔧 Promise rejeitada por extensão capturada e ignorada:', reason);
      event.preventDefault();
      return false;
    }
  });
}

/**
 * Wrapper para console.error que filtra erros de extensões
 */
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  const extensionErrors = [
    'A listener indicated an asynchronous response by returning true',
    'message channel closed before a response was received',
    'Extension context invalidated'
  ];
  
  // Se não é um erro de extensão, mostra normalmente
  if (!extensionErrors.some(pattern => message.includes(pattern))) {
    originalConsoleError.apply(console, args);
  }
};

/**
 * Configura proteções específicas para React Query DevTools
 */
export function setupDevToolsProtection() {
  // Previne que o DevTools tente se comunicar com extensões problemáticas
  if (typeof window !== 'undefined') {
    // Desabilita comunicação com extensões React DevTools se estiver causando problemas
    Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      get() {
        return {
          isDisabled: false,
          supportsFiber: true,
          inject: () => {},
          onCommitFiberRoot: () => {},
          onCommitFiberUnmount: () => {},
          checkDCE: () => {}
        };
      },
      configurable: true
    });
  }
}

/**
 * Inicializa todas as proteções contra erros de extensões
 */
export function initializeErrorProtection() {
  if (typeof window !== 'undefined') {
    setupGlobalErrorHandlers();
    setupDevToolsProtection();
    
    console.log('🛡️ Proteções contra erros de extensões inicializadas');
  }
}
