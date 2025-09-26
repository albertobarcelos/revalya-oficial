import { NextApiRequest, NextApiResponse } from 'next';

// AIDEV-NOTE: Endpoint para iniciar o processamento da fila de importação
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // AIDEV-NOTE: Importar e iniciar o serviço de fila
    const { importQueueService } = await import('@/services/importQueueService');
    
    // AIDEV-NOTE: Verificar se já está rodando
    if (importQueueService.isRunning()) {
      return res.status(200).json({ 
        message: 'Fila de processamento já está ativa',
        running: true 
      });
    }

    // AIDEV-NOTE: Iniciar processamento
    await importQueueService.start();

    return res.status(200).json({ 
      message: 'Fila de processamento iniciada com sucesso',
      running: true 
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar fila:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}