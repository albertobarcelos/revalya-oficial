// AIDEV-NOTE: Componente modular para dialog de QR Code do WhatsApp
// Responsabilidade única: exibição e gerenciamento do QR Code

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Smartphone, Wifi } from 'lucide-react';
import { ConnectionStatus } from '../types';
import { STATUS_LABELS } from '../constants';

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
      <DialogContent className="sm:max-w-md">
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
          {/* AIDEV-NOTE: Área do QR Code */}
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
            ) : qrCode ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    className="w-56 h-56 object-contain"
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
          {qrCode && connectionStatus !== 'connected' && (
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