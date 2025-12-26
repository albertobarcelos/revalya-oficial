/**
 * Aba: Dados Fiscais
 * 
 * AIDEV-NOTE: Campos básicos fiscais (NCM, CEST, Tipo, Origem, CFOP)
 * - Inputs puros sem chamadas ou validações automáticas
 * - Sem opção de busca
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductTypeReference } from '@/hooks/useProductTypeReference';
import { useNCMValidation } from '@/hooks/useNCMValidation';
import type { FiscalData, ValidCFOP } from '../../types/product-form.types';
import { useState, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const ORIGEM_OPTIONS = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira - Importação direta' },
  { value: '2', label: '2 - Estrangeira - Adquirida no mercado interno' },
  { value: '3', label: '3 - Nacional - Mais de 40% conteúdo estrangeiro' },
  { value: '4', label: '4 - Nacional - Produção em conformidade' },
  { value: '5', label: '5 - Nacional - Menos de 40% conteúdo estrangeiro' },
  { value: '6', label: '6 - Estrangeira - Importação direta sem similar' },
  { value: '7', label: '7 - Estrangeira - Mercado interno sem similar' },
  { value: '8', label: '8 - Nacional - Conteúdo de importação superior a 70%' },
];

interface FiscalDataTabProps {
  fiscalData: FiscalData;
  onFiscalDataChange: (data: Partial<FiscalData>) => void;
  enabled?: boolean;
  validCFOPs?: ValidCFOP[];
  isLoadingCFOPs?: boolean;
}

export function FiscalDataTab({ 
  fiscalData, 
  onFiscalDataChange, 
  enabled = true,
  validCFOPs: validCFOPsProp = [],
  isLoadingCFOPs: isLoadingCFOPsProp = false,
}: FiscalDataTabProps) {
  const [cfopSearch, setCfopSearch] = useState('');
  const cfopSearchInputRef = useRef<HTMLInputElement>(null);
  const [ncmError, setNcmError] = useState(false);
  const [ncmInputValue, setNcmInputValue] = useState(fiscalData.ncm || '');

  // AIDEV-NOTE: Buscar tipos de produto ativos (única chamada necessária)
  const { productTypes, isLoading: isLoadingTypes } = useProductTypeReference({ enabled });

  // AIDEV-NOTE: Sincronizar com fiscalData quando mudar externamente
  useEffect(() => {
    if (fiscalData.ncm !== ncmInputValue) {
      setNcmInputValue(fiscalData.ncm || '');
    }
  }, [fiscalData.ncm]);

  // AIDEV-NOTE: Função para formatar NCM (XXXX.XX.XX)
  const formatNCM = (value: string): string => {
    const rawValue = value.replace(/\D/g, '');
    if (!rawValue) return '';
    if (rawValue.length <= 4) {
      return rawValue;
    } else if (rawValue.length <= 6) {
      return `${rawValue.slice(0, 4)}.${rawValue.slice(4)}`;
    } else {
      return `${rawValue.slice(0, 4)}.${rawValue.slice(4, 6)}.${rawValue.slice(6, 8)}`;
    }
  };

  // AIDEV-NOTE: NCM formatado para validação (apenas quando tiver 8 dígitos)
  const ncmCode = ncmInputValue.replace(/\D/g, '');
  const formattedNCM = useMemo(() => {
    if (ncmCode.length === 8) {
      return formatNCM(ncmCode);
    }
    return '';
  }, [ncmCode]);

  // AIDEV-NOTE: Validar NCM via API FocusNFe quando tiver 8 dígitos
  const { data: ncmValidation, isLoading: isValidatingNCM } = useNCMValidation(
    formattedNCM,
    enabled && formattedNCM.length === 10
  );

  // AIDEV-NOTE: Atualizar estado de erro baseado na validação
  useEffect(() => {
    // AIDEV-NOTE: Não mostrar erro enquanto está validando
    if (isValidatingNCM) {
      setNcmError(false);
      return;
    }

    if (formattedNCM.length === 10) {
      if (ncmValidation && ncmValidation.isValid) {
        setNcmError(false);
        // AIDEV-NOTE: Atualizar NCM quando válido (sem ncm_id, pois vem da API)
        if (fiscalData.ncm !== ncmValidation.code) {
      onFiscalDataChange({
            ncm: ncmValidation.code,
      });
        }
      } else if (ncmValidation !== undefined) {
        // AIDEV-NOTE: Só mostrar erro se a validação foi concluída e não é válido
        setNcmError(true);
      }
    } else if (formattedNCM.length === 0) {
      setNcmError(false);
    } else if (formattedNCM.length < 10) {
      // AIDEV-NOTE: NCM incompleto - não mostrar erro ainda
      setNcmError(false);
    }
  }, [formattedNCM, ncmValidation, isValidatingNCM, fiscalData.ncm, onFiscalDataChange]);

  // AIDEV-NOTE: Usar CFOPs passados como props
  const validCFOPs = validCFOPsProp;
  const isLoadingCFOPs = isLoadingCFOPsProp;

  // AIDEV-NOTE: Filtrar CFOPs com base na pesquisa
  const filteredCFOPs = useMemo(() => {
    if (!cfopSearch) return validCFOPs;
    
    const searchLower = cfopSearch.toLowerCase();
    return validCFOPs.filter(cfop =>
      cfop.code.toLowerCase().includes(searchLower) ||
      cfop.description.toLowerCase().includes(searchLower)
    );
  }, [validCFOPs, cfopSearch]);


  return (
    <div className="space-y-6">
      {/* CFOP, NCM e CEST lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CFOP - Campo de pesquisa com scroll */}
      <div>
          <Label htmlFor="cfop" className="text-sm font-medium">
            CFOP <span className="text-destructive">*</span>
        </Label>
          <Select
            value={fiscalData.cfop_id || ''}
            onValueChange={(value) => {
              onFiscalDataChange({ cfop_id: value });
              setCfopSearch('');
            }}
            disabled={isLoadingCFOPs}
          >
            <SelectTrigger className="mt-1 overflow-hidden">
              <SelectValue 
                placeholder={isLoadingCFOPs ? "Carregando..." : "Selecione"}
                className="truncate"
              />
            </SelectTrigger>
            <SelectContent 
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div 
                className="p-2 border-b sticky top-0 bg-background z-10"
                style={{ pointerEvents: 'auto' }}
              >
            <Input
                  ref={cfopSearchInputRef}
                  placeholder="Pesquisar CFOP..."
                  value={cfopSearch}
                  onChange={(e) => {
                    setCfopSearch(e.target.value);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  className="h-8"
                  style={{ pointerEvents: 'auto' }}
                  autoFocus
            />
          </div>
              <div className="max-h-[300px] overflow-y-auto">
                {filteredCFOPs.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {cfopSearch ? 'Nenhum CFOP encontrado.' : 'Nenhum CFOP disponível.'}
                  </div>
                ) : (
                  filteredCFOPs.map((cfop) => (
                    <SelectItem 
                      key={cfop.id} 
                      value={cfop.id}
                      onSelect={() => {
                        setCfopSearch('');
                      }}
                    >
                  <div className="flex items-center gap-2">
                        <span className="font-mono">{cfop.code}</span>
                    <span className="text-muted-foreground">-</span>
                        <span className="truncate">{cfop.description}</span>
                        {cfop.is_default && (
                          <span className="ml-auto text-xs text-primary">(Padrão)</span>
                        )}
                  </div>
                </SelectItem>
                  ))
                )}
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* NCM - Input puro (menor) com validação e formatação */}
        <div>
          <Label htmlFor="ncm" className="text-sm font-medium">
            NCM <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ncm"
            value={ncmInputValue}
            onChange={(e) => {
              // AIDEV-NOTE: Permitir digitação livre (sem formatação automática)
              // Aceita colar com ou sem formatação
              const inputValue = e.target.value;
              // AIDEV-NOTE: Limitar a 8 dígitos numéricos (mas permitir pontos durante digitação)
              const rawValue = inputValue.replace(/\D/g, '');
              if (rawValue.length <= 8) {
                setNcmInputValue(inputValue);
                // AIDEV-NOTE: Limpar erro quando o usuário começar a digitar
                if (ncmError) {
                  setNcmError(false);
                }
              }
            }}
            onBlur={() => {
              // AIDEV-NOTE: Formatar apenas ao sair do campo
              const rawValue = ncmInputValue.replace(/\D/g, '');
              if (rawValue.length > 0) {
                const formatted = formatNCM(rawValue);
                setNcmInputValue(formatted);
                onFiscalDataChange({ ncm: formatted });
                
                // AIDEV-NOTE: Validar formato quando o usuário sair do campo
                if (rawValue.length < 8) {
                  setNcmError(true);
                }
              } else {
                onFiscalDataChange({ ncm: '' });
                setNcmError(false);
              }
            }}
            onPaste={(e) => {
              // AIDEV-NOTE: Permitir colar e processar o valor colado
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text');
              const rawValue = pastedText.replace(/\D/g, '');
              if (rawValue.length <= 8) {
                setNcmInputValue(pastedText);
                if (ncmError) {
                  setNcmError(false);
                }
              }
            }}
            placeholder="Ex: 2203.00.00"
            className={cn(
              "font-mono mt-1 truncate",
              ncmError && "border-destructive focus-visible:ring-destructive"
            )}
            maxLength={15}
            disabled={isValidatingNCM}
          />
          {isValidatingNCM && (
        <p className="text-xs text-muted-foreground mt-1">
              Validando NCM...
            </p>
          )}
          {ncmValidation && ncmValidation.isValid && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              {ncmValidation.description ? (
                <p className="text-xs font-medium text-green-800 mb-1">
                  {ncmValidation.description}
                </p>
              ) : (
                <p className="text-xs font-medium text-green-800 mb-1">
                  NCM válido
                </p>
              )}
              {ncmValidation.details && (
                <div className="text-xs text-green-700 space-y-0.5">
                  {ncmValidation.details.unidade && (
                    <p><span className="font-medium">Unidade:</span> {ncmValidation.details.unidade}</p>
                  )}
                  {ncmValidation.details.tipo && (
                    <p><span className="font-medium">Tipo:</span> {ncmValidation.details.tipo}</p>
                  )}
                  {ncmValidation.details.ex && (
                    <p><span className="font-medium">Exceção:</span> {ncmValidation.details.ex}</p>
                  )}
                </div>
              )}
            </div>
          )}
          {ncmValidation && !ncmValidation.isValid && !isValidatingNCM && formattedNCM.length === 10 && (
            <p className="text-xs text-destructive mt-1">
              NCM não encontrado na base da FocusNFe
            </p>
          )}
        </div>

        {/* CEST - Input puro */}
        <div>
          <Label htmlFor="cest" className="text-sm font-medium">
            CEST
          </Label>
          <Input
            id="cest"
            value={fiscalData.cest || ''}
            onChange={(e) => onFiscalDataChange({ cest: e.target.value })}
            placeholder="Ex: 0302101"
            className="font-mono mt-1"
          />
        </div>
      </div>

      {/* Tipo */}
      <div>
        <Label htmlFor="product_type" className="text-sm font-medium">
          Tipo <span className="text-destructive">*</span>
        </Label>
        <Select
          value={fiscalData.product_type_id || ''}
          onValueChange={(value) => onFiscalDataChange({ product_type_id: value })}
          disabled={isLoadingTypes}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={isLoadingTypes ? "Carregando..." : "Selecione o tipo"} />
          </SelectTrigger>
          <SelectContent>
            {productTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Origem */}
      <div>
        <Label htmlFor="origem" className="text-sm font-medium">
          Origem <span className="text-destructive">*</span>
        </Label>
        <Select
          value={fiscalData.origem || '0'}
          onValueChange={(value) => onFiscalDataChange({ origem: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORIGEM_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

