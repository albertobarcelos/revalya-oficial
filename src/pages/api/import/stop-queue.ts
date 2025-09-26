import { NextApiRequest, NextApiResponse } from 'next';

// AIDEV-NOTE: Endpoint para parar o processamento da fila de importação
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // AIDEV-NOTE: Importar e parar o serviço de fila
    const { importQueueService } = await import('@/services/importQueueService');
    
    // AIDEV-NOTE: Verificar se está rodando
    if (!importQueueService.isRunning()) {
      return res.status(200).json({ 
        message: 'Fila de processamento já está parada',
        running: false 
      });
    }

    // AIDEV-NOTE: Parar processamento
    await importQueueService.stop();

    return res.status(200).json({ 
      message: 'Fila de processamento parada com sucesso',
      running: false 
    });

  } catch (error) {
    console.error('❌ Erro ao parar fila:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}