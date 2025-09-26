import { NextApiRequest, NextApiResponse } from 'next';
import { importQueueService } from '@/services/importQueueService';

// AIDEV-NOTE: Endpoint para inicializar a fila automaticamente no startup
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // AIDEV-NOTE: Verificar se a fila já está rodando
    const stats = await importQueueService.getStats();
    
    if (stats.isRunning) {
      return res.status(200).json({
        success: true,
        message: 'Fila já está em execução',
        stats
      });
    }

    // AIDEV-NOTE: Iniciar a fila
    await importQueueService.start();
    
    // AIDEV-NOTE: Obter estatísticas atualizadas
    const updatedStats = await importQueueService.getStats();

    console.log('✅ Fila de importação inicializada automaticamente');

    return res.status(200).json({
      success: true,
      message: 'Fila inicializada com sucesso',
      stats: updatedStats
    });

  } catch (error) {
    console.error('❌ Erro ao inicializar fila:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    });
  }
}