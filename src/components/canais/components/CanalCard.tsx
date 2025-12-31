// AIDEV-NOTE: Componente modular para exibir cards de canais
// Responsabilidade única: renderização visual de um canal específico

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, Mail, Phone, MessageSquare } from 'lucide-react';
import { CanalType, ConnectionStatus } from '../types';
import { CANAL_LABELS, STATUS_LABELS } from '../constants';

interface CanalCardProps {
  canal: CanalType;
  isActive: boolean;
  isLoading: boolean;
  connectionStatus?: ConnectionStatus;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  comingSoon?: boolean; // AIDEV-NOTE: Flag para indicar funcionalidade "Em breve"
}

export function CanalCard({
  canal,
  isActive,
  isLoading,
  connectionStatus,
  onToggle,
  disabled = false,
  className = '',
  comingSoon = false // AIDEV-NOTE: Default false para manter compatibilidade
}: CanalCardProps) {
  // AIDEV-NOTE: Função para obter o ícone correto para cada canal
  const getCanalIcon = () => {
    switch (canal) {
      case 'whatsapp':
        return (
          <img 
            src="/images/Integrações/WhatsApp.svg" 
            alt="WhatsApp" 
            className="w-16 h-16 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://placehold.co/64x64/25D366/white?text=WA';
            }}
          />
        );
      case 'sms':
        return <MessageSquare className="h-8 w-8 text-blue-600" />;
      case 'email':
        return <Mail className="h-8 w-8 text-red-600" />;
      case 'twilio':
        return <Phone className="h-8 w-8 text-purple-600" />;
      default:
        return <MessageCircle className="h-8 w-8 text-gray-600" />;
    }
  };

  // AIDEV-NOTE: Determinar cor do badge baseado no status
  const getBadgeVariant = () => {
    if (comingSoon) return 'outline'; // AIDEV-NOTE: Badge neutro para "Em breve"
    if (!isActive) return 'secondary';
    
    switch (connectionStatus) {
      case 'connected':
        return 'default'; // Verde
      case 'connecting':
        return 'outline'; // Amarelo/neutro
      case 'disconnected':
      default:
        return 'destructive'; // Vermelho
    }
  };

  // AIDEV-NOTE: Determinar texto do status para exibição
  const getStatusText = () => {
    if (comingSoon) return 'Em breve'; // AIDEV-NOTE: Status especial para funcionalidades futuras
    if (!isActive) return STATUS_LABELS.INACTIVE || 'Inativo';
    
    return connectionStatus ? STATUS_LABELS[connectionStatus.toLowerCase() as keyof typeof STATUS_LABELS] || STATUS_LABELS.disconnected : STATUS_LABELS.DISCONNECTED || STATUS_LABELS.disconnected;
  };

  // AIDEV-NOTE: Determinar texto do botão baseado no estado atual
  const getButtonText = () => {
    if (comingSoon) return 'Em breve'; // AIDEV-NOTE: Botão desabilitado para funcionalidades futuras
    if (isLoading) return 'Processando...';
    
    if (canal === 'whatsapp') {
      if (!isActive) return 'Ativar Whatsapp - QRCode';
      if (connectionStatus === 'connected') return 'Desativar';
      return 'Conectar QRCode';
    }
    
    return isActive ? 'Desativar' : 'Ativar';
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${className}`}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* AIDEV-NOTE: Ícone redondo do canal */}
          <div className={`flex items-center justify-center w-16 h-16 rounded-full ${
            canal === 'whatsapp' 
              ? 'bg-[#25D366] border-2 border-[#25D366]' 
              : 'bg-gray-50 border-2 border-gray-200'
          }`}>
            {getCanalIcon()}
          </div>

          {/* AIDEV-NOTE: Informações do canal */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {CANAL_LABELS[canal]}
            </h3>
            
            {/* AIDEV-NOTE: Badge de status de conexão */}
            <Badge variant={getBadgeVariant()} className="text-xs">
              {getStatusText()}
            </Badge>
          </div>

          {/* AIDEV-NOTE: Botão de ação */}
          <Button
            onClick={onToggle}
            disabled={disabled || isLoading || comingSoon} // AIDEV-NOTE: Desabilitar botão para funcionalidades "Em breve"
            variant={isActive && connectionStatus === 'connected' ? 'destructive' : 'default'}
            className="w-full transition-all duration-200"
          >
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {getButtonText()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}