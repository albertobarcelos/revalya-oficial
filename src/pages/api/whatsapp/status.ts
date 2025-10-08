import { NextApiRequest, NextApiResponse } from 'next';
import { whatsappService } from '../../../services/whatsappService';

/**
 * API endpoint para verificar status da instância WhatsApp
 * AIDEV-NOTE: Endpoint seguro para verificação de status em tempo real
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // AIDEV-NOTE: Apenas métodos POST são permitidos
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      message: 'Apenas POST é aceito' 
    });
  }

  try {
    const { tenantSlug, instanceName } = req.body;

    // AIDEV-NOTE: Validação de parâmetros obrigatórios
    if (!tenantSlug || !instanceName) {
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        message: 'tenantSlug e instanceName são obrigatórios'
      });
    }

    // AIDEV-NOTE: Verificar status da instância via serviço WhatsApp
    const status = await whatsappService.getInstanceStatus(tenantSlug, instanceName);

    return res.status(200).json({
      success: true,
      status: status.status,
      data: status
    });

  } catch (error) {
    console.error('[API WhatsApp Status] Erro:', error);
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}