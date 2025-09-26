// AIDEV-NOTE: Utilitário para inicialização automática da fila de importação

let isInitialized = false;

// AIDEV-NOTE: Função para inicializar a fila automaticamente
export async function initializeImportQueue() {
  if (isInitialized) {
    console.log('🔄 Fila de importação já foi inicializada');
    return;
  }

  try {
    console.log('🚀 Inicializando fila de importação...');
    
    // AIDEV-NOTE: Fazer chamada para o endpoint de inicialização
    const response = await fetch('/api/import/init-queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Fila de importação inicializada:', result.message);
      console.log('📊 Estatísticas:', result.stats);
      isInitialized = true;
    } else {
      throw new Error(result.error || 'Erro desconhecido');
    }

  } catch (error) {
    console.error('❌ Erro ao inicializar fila de importação:', error);
    
    // AIDEV-NOTE: Tentar novamente após 30 segundos
    setTimeout(() => {
      console.log('🔄 Tentando inicializar fila novamente...');
      initializeImportQueue();
    }, 30000);
  }
}

// AIDEV-NOTE: Função para verificar se a fila está inicializada
export function isQueueInitialized(): boolean {
  return isInitialized;
}

// AIDEV-NOTE: Função para resetar o estado de inicialização (útil para testes)
export function resetInitializationState(): void {
  isInitialized = false;
}