// AIDEV-NOTE: Componente modular para dialog de QR Code do WhatsApp
// Responsabilidade única: exibição e gerenciamento do QR Code

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Smartphone, Wifi, AlertCircle } from 'lucide-react';
import { ConnectionStatus } from '../types';
import { STATUS_LABELS } from '../constants';
import { logService } from '@/services/logService';

interface QRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string | null;
  isLoading: boolean;
  connectionStatus: ConnectionStatus;
  onConnect: () => void;
}

export function QRDialog({
  isOpen,
  onClose,
  qrCode,
  isLoading,
  connectionStatus,
  onConnect
}: QRDialogProps) {
  // AIDEV-NOTE: Debug do QR Code para identificar problemas de renderização
  useEffect(() => {
    if (qrCode) {
      logService.info('QRDialog', `QR Code recebido - Tamanho: ${qrCode.length}, Início: ${qrCode.substring(0, 100)}...`);
      
      // Verificar formato e tamanho
      if (qrCode.startsWith('data:image/')) {
        logService.info('QRDialog', 'QR Code está no formato data URL válido');
        
        // Verificar se o tamanho é adequado para renderização
        if (qrCode.length > 10000) {
          logService.warn('QRDialog', `QR Code muito grande (${qrCode.length} caracteres) - pode afetar performance`);
        }
      } else if (qrCode.startsWith('http')) {
        logService.info('QRDialog', 'QR Code é uma URL HTTP');
      } else {
        logService.warn('QRDialog', 'QR Code pode estar em formato inválido para renderização');
      }
    }
  }, [qrCode]);

  // AIDEV-NOTE: Validar se o QR Code está em formato válido para renderização
  const isValidQRCode = (qr: string | null): boolean => {
    if (!qr) return false;
    
    // Verificar se é data URL (qualquer formato de imagem) ou URL HTTP válida
    const isValidFormat = qr.startsWith('data:image/') || 
                         qr.startsWith('http://') || 
                         qr.startsWith('https://');
    
    // AIDEV-NOTE: Verificar se o QR code não é excessivamente grande (limite do navegador)
    if (isValidFormat && qr.length > 50000) {
      logService.warn('QRDialog', `QR Code extremamente grande (${qr.length} caracteres) - pode causar problemas no navegador`);
      return false;
    }
    
    return isValidFormat;
  };

  // AIDEV-NOTE: Determinar se deve mostrar o botão de conectar
  const shouldShowConnectButton = () => {
    return connectionStatus === 'disconnected' || (!qrCode && !isLoading);
  };

  // AIDEV-NOTE: Determinar mensagem de status baseada no estado atual
  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Aguardando leitura do QR Code...';
      case 'connected':
        return 'WhatsApp conectado com sucesso!';
      case 'disconnected':
      default:
        return 'Escaneie o QR Code com seu WhatsApp';
    }
  };

  // AIDEV-NOTE: Determinar ícone de status
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-500" />;
      case 'disconnected':
      default:
        return <Smartphone className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg- rounded-lg border-2 border-gray-200 shadow-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Use seu celular para escanear o QR Code e conectar sua conta do WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* AIDEV-NOTE: Área do QR Code com melhor tratamento de erros */}
          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-gray-600">Gerando QR Code...</p>
                  </div>
                </div>
              </div>
            ) : qrCode && isValidQRCode(qrCode) ? (
              <div className="flex flex-col items-center space-y-3">
                <div 
                  className="qr-code-container p-2 rounded-lg border border-gray-200 shadow-sm bg-transparent"
                  style={{
                    // AIDEV-NOTE: Prevenir interferências de pseudo-elementos e camadas sobrepostas
                    isolation: 'isolate',
                    zIndex: 10000,
                    position: 'relative'
                  }}
                >
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    className="w-56 h-56 object-contain rounded relative"
                    style={{
                      // AIDEV-NOTE: Otimizações para QR codes grandes - removido fundo branco e prevenção de camadas
                      imageRendering: 'crisp-edges',
                      maxWidth: '100%',
                      height: 'auto',
                      backgroundColor: 'transparent',
                      position: 'relative',
                      zIndex: 10001,
                      isolation: 'isolate'
                    }}
                    loading="eager"
                    decoding="sync"
                    onError={(e) => {
                      logService.error('QRDialog', 'Erro ao carregar imagem do QR Code');
                      console.error('QR Code image error:', e);
                    }}
                    onLoad={() => {
                      logService.info('QRDialog', 'QR Code carregado com sucesso');
                    }}
                  />
                </div>
                
                {/* AIDEV-NOTE: Status da conexão */}
                <div className="flex items-center space-x-2 text-sm">
                  {getStatusIcon()}
                  <span className={`font-medium ${
                    connectionStatus === 'connected' ? 'text-green-600' :
                    connectionStatus === 'connecting' ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {getStatusMessage()}
                  </span>
                </div>
              </div>
            ) : qrCode && !isValidQRCode(qrCode) ? (
              // AIDEV-NOTE: Caso o QR Code esteja em formato inválido ou muito grande
              <div className="w-64 h-64 border-2 border-dashed border-red-300 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm text-red-600">
                    {qrCode.length > 50000 ? 'QR Code muito grande' : 'QR Code em formato inválido'}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    {qrCode.length > 50000 
                      ? `Tamanho: ${qrCode.length} caracteres (limite: 50.000)`
                      : 'Tente gerar um novo QR Code'
                    }
                  </p>
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700 max-w-xs break-all">
                    Debug: {qrCode.substring(0, 50)}...
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Smartphone className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">QR Code não disponível</p>
                  <p className="text-xs text-gray-500 mt-1">Clique em "Gerar QR Code" para começar</p>
                </div>
              </div>
            )}
          </div>

          {/* AIDEV-NOTE: Instruções para o usuário */}
          {qrCode && isValidQRCode(qrCode) && connectionStatus !== 'connected' && (
            <div className="text-center space-y-2 max-w-sm">
              <p className="text-sm text-gray-600">
                <strong>Como conectar:</strong>
              </p>
              <ol className="text-xs text-gray-500 text-left space-y-1">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Toque em "Mais opções" (⋮) e depois em "Aparelhos conectados"</li>
                <li>3. Toque em "Conectar um aparelho"</li>
                <li>4. Aponte a câmera para este QR Code</li>
              </ol>
            </div>
          )}
        </div>

        {/* AIDEV-NOTE: Botões de ação */}
        <div className="flex justify-between space-x-2">
          {shouldShowConnectButton() && (
            <Button
              variant="outline"
              onClick={onConnect}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {qrCode ? 'Gerar Novo QR' : 'Gerar QR Code'}
            </Button>
          )}
          
          <Button
            variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
            onClick={onClose}
            className="flex-1"
          >
            {connectionStatus === 'connected' ? 'Concluir' : 'Fechar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}