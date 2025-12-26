/**
 * Campo de código interno do produto
 * 
 * AIDEV-NOTE: Componente isolado para código interno com lógica de bloqueio e validação
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductCode } from '../hooks/useProductCode';

interface ProductCodeFieldProps {
  formData: any;
  isEditMode: boolean;
  isLoadingMaxCode: boolean;
  nextAvailableCode?: string | undefined;
  codeState: ReturnType<typeof useProductCode>;
}

export function ProductCodeField({
  formData,
  isEditMode,
  isLoadingMaxCode,
  nextAvailableCode,
  codeState,
}: ProductCodeFieldProps) {
  const {
    showCustomCode,
    internalCodeType,
    codeError,
    isValidatingCode,
    isCodeLocked,
    handleCodeTypeChange,
    handleCodeChange,
    handleCodeBlur,
    setIsCodeLocked,
  } = codeState;

  // AIDEV-NOTE: Se já existe código (produto criado), mostrar apenas input com lápis
  if (isEditMode && (formData as any).code) {
    return (
      <div>
        <Label htmlFor="code" className="text-sm font-medium">
          Código interno do produto
        </Label>
        <div className="mt-1 relative">
          <Input
            id="code"
            name="code"
            value={(formData as any).code || ''}
            onChange={(e) => handleCodeChange(e.target.value)}
            onBlur={(e) => handleCodeBlur(e.target.value)}
            placeholder="Código interno"
            className={cn(
              codeError && "border-destructive",
              isCodeLocked && "bg-muted pr-10"
            )}
            disabled={isValidatingCode || isCodeLocked}
            readOnly={isCodeLocked}
          />
          {isCodeLocked && (
            <button
              type="button"
              onClick={() => setIsCodeLocked(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted-foreground/10 rounded transition-colors"
              title="Editar código"
            >
              <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          {codeError && (
            <p className="mt-1 text-sm text-destructive font-medium">{codeError}</p>
          )}
          {isValidatingCode && (
            <p className="mt-1 text-sm text-muted-foreground">Validando código...</p>
          )}
        </div>
      </div>
    );
  }

  // AIDEV-NOTE: Dropdown apenas para criação (quando não há código)
  return (
    <div>
      <Label htmlFor="internal_code_type" className="text-sm font-medium">
        Código interno do produto
      </Label>
      <Select
        value={internalCodeType}
        onValueChange={handleCodeTypeChange}
        disabled={isLoadingMaxCode}
      >
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sequencia-normal">Sequência normal</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Exibir código gerado quando for sequência normal */}
      {internalCodeType === 'sequencia-normal' && !showCustomCode && (
        <div className="mt-2">
          <div className="text-sm text-muted-foreground">
            {isLoadingMaxCode ? (
              'Carregando código...'
            ) : (
              <>Código gerado: <span className="font-medium text-foreground">{(formData as any).code || nextAvailableCode || 'PRD001'}</span></>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              handleCodeTypeChange('custom');
            }}
            className="mt-1 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Desejo informar o código
          </button>
        </div>
      )}
      
      {/* Input para código personalizado */}
      {(showCustomCode || internalCodeType === 'custom') && (
        <div className="mt-2 relative">
          <Input
            id="code"
            name="code"
            value={(formData as any).code || ''}
            onChange={(e) => handleCodeChange(e.target.value)}
            onBlur={(e) => handleCodeBlur(e.target.value)}
            placeholder="Digite o código personalizado"
            className={cn(codeError && "border-destructive")}
            disabled={isValidatingCode}
          />
          {codeError && (
            <p className="mt-1 text-sm text-destructive font-medium">{codeError}</p>
          )}
          {isValidatingCode && (
            <p className="mt-1 text-sm text-muted-foreground">Validando código...</p>
          )}
        </div>
      )}
    </div>
  );
}

