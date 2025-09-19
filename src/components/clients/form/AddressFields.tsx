import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateCustomerDTO } from '@/types/asaas';

interface AddressFieldsProps {
  formData: CreateCustomerDTO;
  onChange: (field: keyof CreateCustomerDTO, value: string) => void;
}

export function AddressFields({ formData, onChange }: AddressFieldsProps) {
  const handlePostalCodeChange = async (value: string) => {
    onChange('postal_code', value); // AIDEV-NOTE: Campo correto conforme schema da tabela customers
    
    if (value.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        if (!response.ok) throw new Error('CEP não encontrado');
        
        const data = await response.json();
        if (data && !data.erro) {
          onChange('address', data.logradouro || '');
          onChange('complement', data.complemento || '');
          onChange('neighborhood', data.bairro || ''); // AIDEV-NOTE: Campo correto conforme schema da tabela customers
          onChange('city', data.localidade || '');
          onChange('state', data.uf || '');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* CEP em linha separada */}
      <div className="space-y-2">
        <Label htmlFor="postal_code">CEP</Label>
        <Input
          id="postal_code"
          value={formData.postal_code || ''}
          onChange={(e) => handlePostalCodeChange(e.target.value.replace(/\D/g, ''))}
          maxLength={8}
          placeholder="00000000"
          className="w-full max-w-xs"
        />
      </div>

      {/* Endereço e número em grid responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Endereço</Label>
          <Input
            id="address"
            value={formData.address || ''}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="Rua, Avenida, etc."
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="addressNumber">Número</Label>
          <Input
            id="addressNumber"
            value={formData.addressNumber || ''}
            onChange={(e) => onChange('addressNumber', e.target.value)}
            placeholder="123"
            className="w-full"
          />
        </div>
      </div>

      {/* Complemento e bairro em grid responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            value={formData.complement || ''}
            onChange={(e) => onChange('complement', e.target.value)}
            placeholder="Apto, Bloco, etc."
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
        <Input
          id="neighborhood"
          value={formData.neighborhood || ''}
          onChange={(e) => onChange('neighborhood', e.target.value)} // AIDEV-NOTE: Campo correto conforme schema da tabela customers
            placeholder="Nome do bairro"
            className="w-full"
          />
        </div>
      </div>

      {/* Cidade e estado em grid responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={formData.city || ''}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="Nome da cidade"
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input
            id="state"
            value={formData.state || ''}
            onChange={(e) => onChange('state', e.target.value)}
            placeholder="UF"
            maxLength={2}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
