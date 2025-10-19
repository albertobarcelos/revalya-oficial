import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IMaskInput } from 'react-imask';
import { useEffect, useState } from 'react';
import { formatCpfCnpj as formatCpfCnpjUtil } from '@/lib/utils';
import { useCNPJLookup } from '@/hooks/useCNPJLookup';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

// AIDEV-NOTE: Interface específica para o formulário de edição de cliente
// Mapeia os campos do CustomerFormData para o formato esperado pelo PersonalInfoFields
interface EditPersonalInfoFieldsProps {
  formData: {
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    company?: string;
    [key: string]: any;
  };
  onChange: (field: string, value: string) => void;
  onBulkChange?: (data: any) => void;
}

// AIDEV-NOTE: Componente específico para edição de informações pessoais
// Resolve incompatibilidades de tipos entre CustomerFormData e CreateCustomerDTO
export function EditPersonalInfoFields({ formData, onChange, onBulkChange }: EditPersonalInfoFieldsProps) {
  // Estado local para o campo CPF/CNPJ
  const [cpfCnpjValue, setCpfCnpjValue] = useState(() => {
    console.log('EditPersonalInfoFields - Inicializando cpfCnpjValue com:', formData.cpfCnpj);
    console.log('EditPersonalInfoFields - Tipo do formData.cpfCnpj:', typeof formData.cpfCnpj);
    return formData.cpfCnpj || '';
  });
  const { isLoading, consultarEPreencherDados } = useCNPJLookup();
  
  // AIDEV-NOTE: Sincronização do CPF/CNPJ com o formData
  // Otimizado para evitar logs excessivos - só loga em casos críticos
  useEffect(() => {
    if (formData.cpfCnpj !== cpfCnpjValue) {
      // AIDEV-NOTE: Log removido para evitar spam - só em desenvolvimento e casos críticos
      if (process.env.NODE_ENV === 'development' && !formData.cpfCnpj && cpfCnpjValue) {
        console.log('EditPersonalInfoFields - CPF/CNPJ sendo limpo:', { from: cpfCnpjValue, to: formData.cpfCnpj });
      }
      setCpfCnpjValue(formData.cpfCnpj || '');
    }
  }, [formData.cpfCnpj, cpfCnpjValue]);

  // AIDEV-NOTE: Função para consultar CNPJ automaticamente
  const handleCNPJLookup = async () => {
    if (cpfCnpjValue && onBulkChange) {
      await consultarEPreencherDados(cpfCnpjValue, (data) => {
        onBulkChange(data);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Grid responsivo para campos principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome*</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Nome completo"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            value={formData.company || ''}
            onChange={(e) => onChange('company', e.target.value)}
            placeholder="Nome da empresa"
            className="w-full"
          />
        </div>
      </div>

      {/* Grid responsivo para CPF/CNPJ e Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpfCnpj">CPF/CNPJ*</Label>
          <div className="flex gap-2">
            <Input
              id="cpfCnpj"
              value={formatCpfCnpjUtil(cpfCnpjValue)}
              onChange={(e) => {
                // Remove caracteres não numéricos
                const value = e.target.value.replace(/\D/g, '');
                console.log('EditPersonalInfoFields - Alterando CPF/CNPJ para:', value);
                setCpfCnpjValue(value);
                onChange('cpfCnpj', value);
              }}
              placeholder="CPF ou CNPJ"
              required
              className="flex-1"
            />
            {cpfCnpjValue.length === 14 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCNPJLookup}
                disabled={isLoading}
                className="px-3"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          {cpfCnpjValue.length === 14 && (
            <p className="text-xs text-muted-foreground">
              Clique no botão de busca para consultar dados da empresa automaticamente
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="email@exemplo.com"
            className="w-full"
          />
        </div>
      </div>

      {/* Campo de telefone em largura total */}
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <IMaskInput
          id="phone"
          mask={[
            { mask: '(00) 0000-0000' },
            { mask: '(00) 00000-0000' }
          ]}
          unmask={false}
          value={formData.phone || ''}
          onAccept={(value) => onChange('phone', value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="(00) 00000-0000"
        />
      </div>
    </div>
  );
  }
