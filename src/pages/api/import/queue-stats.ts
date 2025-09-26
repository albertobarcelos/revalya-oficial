import { NextApiRequest, NextApiResponse } from 'next';

// AIDEV-NOTE: Endpoint para obter estatísticas da fila de importação
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // AIDEV-NOTE: Importar serviço de fila
    const { importQueueService } = await import('@/services/importQueueService');
    
    // AIDEV-NOTE: Obter estatísticas
    const stats = await importQueueService.getStats();

    return res.status(200).json({
      success: true,
      stats: {
        ...stats,
        isRunning: importQueueService.isRunning()
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}