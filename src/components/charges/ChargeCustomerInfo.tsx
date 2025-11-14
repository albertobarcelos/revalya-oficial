import { memo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Cobranca } from '@/types';
import { formatCpfCnpj, formatPhoneNumber } from '@/lib/utils';

interface ChargeCustomerInfoProps {
  chargeDetails: Cobranca | null;
  onSendMessage: () => void;
}

function ChargeCustomerInfoComponent({ chargeDetails, onSendMessage }: ChargeCustomerInfoProps) {
  if (!chargeDetails) return null;
  const { slug } = useParams<{ slug: string }>();

  /**
   * Abre o contrato em uma nova aba seguindo o padrão
   * /{slug}/contratos?id={contractId}&mode=edit
   */
  const handleOpenContract = () => {
    const contractId = chargeDetails.contract?.id;
    if (!contractId || !slug) return;
    const url = `/${slug}/contratos?id=${contractId}&mode=edit`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
            <div className="mt-2">
              <h4 className="text-sm font-medium text-muted-foreground">Telefone</h4>
              <p>{formatPhoneNumber(chargeDetails.customer?.phone || '') || 'Não informado'}</p>
              <div className="mt-2">
                <h4 className="text-sm font-medium text-muted-foreground">Celular</h4>
                <p>{formatPhoneNumber(chargeDetails.customer?.celular_whatsapp) || 'Não informado'}</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">CPF/CNPJ</h4>
            <p>{formatCpfCnpj(chargeDetails.customer?.cpf_cnpj) || 'Não informado'}</p>
            <div className="mt-2">
              <h4 className="text-sm font-medium text-muted-foreground">Contrato</h4>
              {chargeDetails.contract?.contract_number ? (
                <button
                  type="button"
                  onClick={handleOpenContract}
                  className="text-primary hover:underline cursor-pointer"
                >
                  {chargeDetails.contract.contract_number}
                </button>
              ) : (
                <p>Não informado</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-4" />
    </div>
  );
}

export const ChargeCustomerInfo = memo(ChargeCustomerInfoComponent);
