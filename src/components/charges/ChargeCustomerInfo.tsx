import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Cobranca } from '@/types';
import { formatCpfCnpj } from '@/lib/utils';

interface ChargeCustomerInfoProps {
  chargeDetails: Cobranca | null;
  onSendMessage: () => void;
}

function ChargeCustomerInfoComponent({ chargeDetails, onSendMessage }: ChargeCustomerInfoProps) {
  if (!chargeDetails) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Cliente</h4>
            <p className="text-lg font-semibold">{chargeDetails.customer?.name}</p>
          </div>
          {chargeDetails.status !== 'PAID' && chargeDetails.status !== 'CANCELLED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendMessage}
              disabled={!chargeDetails.customer?.phone}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Mensagem
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Empresa</h4>
            <p>{chargeDetails.customer?.company || 'Não informado'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">CPF/CNPJ</h4>
            <p>{formatCpfCnpj(chargeDetails.customer?.cpf_cnpj) || 'Não informado'}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Telefone</h4>
          <p>{chargeDetails.customer?.phone || 'Não informado'}</p>
        </div>
      </div>

      <Separator className="my-4" />
    </div>
  );
}

export const ChargeCustomerInfo = memo(ChargeCustomerInfoComponent);