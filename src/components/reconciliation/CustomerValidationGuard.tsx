// =====================================================
// CUSTOMER VALIDATION GUARD
// Descrição: Componente para validação automática de clientes na conciliação
// Tecnologias: React + TypeScript + Supabase + Shadcn/UI
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

// Icons
import {
  User,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  Search,
  Plus,
  RefreshCw
} from 'lucide-react';

// Types
import { ImportedMovement } from '@/types/reconciliation';

// Hooks
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';

// =====================================================
// INTERFACES
// =====================================================

interface CustomerValidationResult {
  hasCustomer: boolean;
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  customerEmail?: string;
  matchType?: 'asaas_id' | 'document' | 'name' | 'none';
  confidence?: number;
}

interface CustomerValidationGuardProps {
  movement: ImportedMovement;
  onValidationComplete: (result: CustomerValidationResult) => void;
  onRegisterCustomer: () => void;
  className?: string;
}

// =====================================================
// HOOK PERSONALIZADO PARA VALIDAÇÃO
// =====================================================

const useCustomerValidation = (movement: ImportedMovement) => {
  const [validationResult, setValidationResult] = useState<CustomerValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Função principal de validação de cliente
  const validateCustomer = useCallback(async () => {
    if (!movement || !currentTenant) return;

    setIsValidating(true);
    try {
      // Configurar contexto do tenant
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: currentTenant.id
      });

      let result: CustomerValidationResult = {
        hasCustomer: false,
        matchType: 'none',
        confidence: 0
      };

      // AIDEV-NOTE: 1. Verificar por asaas_customer_id (prioridade máxima)
      if (movement.asaas_customer_id) {
        const { data: asaasCustomer, error: asaasError } = await supabase
          .from('customers')
          .select('id, name, document, email, customer_asaas_id')
          .eq('customer_asaas_id', movement.asaas_customer_id)
          .single();

        if (!asaasError && asaasCustomer) {
          result = {
            hasCustomer: true,
            customerId: asaasCustomer.id,
            customerName: asaasCustomer.name,
            customerDocument: asaasCustomer.document,
            customerEmail: asaasCustomer.email,
            matchType: 'asaas_id',
            confidence: 100
          };
          setValidationResult(result);
          setIsValidating(false);
          return result;
        }
      }

      // AIDEV-NOTE: 2. Verificar por documento (alta prioridade)
      if (movement.customerDocument) {
        const { data: docCustomer, error: docError } = await supabase
          .from('customers')
          .select('id, name, document, email, customer_asaas_id')
          .eq('document', movement.customerDocument)
          .single();

        if (!docError && docCustomer) {
          result = {
            hasCustomer: true,
            customerId: docCustomer.id,
            customerName: docCustomer.name,
            customerDocument: docCustomer.document,
            customerEmail: docCustomer.email,
            matchType: 'document',
            confidence: 95
          };
          setValidationResult(result);
          setIsValidating(false);
          return result;
        }
      }

      // AIDEV-NOTE: 3. Verificar por nome (média prioridade - busca aproximada)
      if (movement.customerName) {
        const { data: nameCustomers, error: nameError } = await supabase
          .from('customers')
          .select('id, name, document, email, customer_asaas_id')
          .ilike('name', `%${movement.customerName}%`)
          .limit(5);

        if (!nameError && nameCustomers && nameCustomers.length > 0) {
          // AIDEV-NOTE: Calcular confiança baseada na similaridade do nome
          const exactMatch = nameCustomers.find(c => 
            c.name.toLowerCase() === movement.customerName?.toLowerCase()
          );
          
          if (exactMatch) {
            result = {
              hasCustomer: true,
              customerId: exactMatch.id,
              customerName: exactMatch.name,
              customerDocument: exactMatch.document,
              customerEmail: exactMatch.email,
              matchType: 'name',
              confidence: 85
            };
          } else {
            // Pegar o primeiro resultado como sugestão
            const suggestion = nameCustomers[0];
            result = {
              hasCustomer: true,
              customerId: suggestion.id,
              customerName: suggestion.name,
              customerDocument: suggestion.document,
              customerEmail: suggestion.email,
              matchType: 'name',
              confidence: 60
            };
          }
        }
      }

      setValidationResult(result);
      return result;

    } catch (error) {
      console.error('Erro na validação de cliente:', error);
      const errorResult: CustomerValidationResult = {
        hasCustomer: false,
        matchType: 'none',
        confidence: 0
      };
      setValidationResult(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, [movement, currentTenant]);

  return {
    validationResult,
    isValidating,
    validateCustomer
  };
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const CustomerValidationGuard: React.FC<CustomerValidationGuardProps> = ({
  movement,
  onValidationComplete,
  onRegisterCustomer,
  className = ''
}) => {
  // =====================================================
  // HOOKS & STATE
  // =====================================================
  const { toast } = useToast();
  const { hasAccess } = useTenantAccessGuard();
  const { validationResult, isValidating, validateCustomer } = useCustomerValidation(movement);

  // =====================================================
  // EFFECTS
  // =====================================================

  // AIDEV-NOTE: Executar validação automaticamente quando o componente monta
  useEffect(() => {
    if (movement && hasAccess) {
      validateCustomer();
    }
  }, [movement, hasAccess, validateCustomer]);

  // AIDEV-NOTE: Notificar o componente pai quando a validação completa
  useEffect(() => {
    if (validationResult) {
      onValidationComplete(validationResult);
    }
  }, [validationResult, onValidationComplete]);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleRetryValidation = useCallback(async () => {
    const result = await validateCustomer();
    if (result?.hasCustomer) {
      toast({
        title: 'Cliente encontrado',
        description: `Cliente ${result.customerName} identificado com ${result.confidence}% de confiança`,
        variant: 'default'
      });
    } else {
      toast({
        title: 'Cliente não encontrado',
        description: 'Nenhum cliente correspondente foi encontrado no sistema',
        variant: 'destructive'
      });
    }
  }, [validateCustomer, toast]);

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const getValidationIcon = () => {
    if (isValidating) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!validationResult) return <Search className="h-4 w-4" />;
    if (validationResult.hasCustomer) return <UserCheck className="h-4 w-4 text-green-600" />;
    return <UserX className="h-4 w-4 text-red-600" />;
  };

  const getValidationStatus = () => {
    if (isValidating) return 'Validando...';
    if (!validationResult) return 'Aguardando validação';
    if (validationResult.hasCustomer) return 'Cliente encontrado';
    return 'Cliente não encontrado';
  };

  const getConfidenceBadge = () => {
    if (!validationResult?.hasCustomer || !validationResult.confidence) return null;

    const confidence = validationResult.confidence;
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
    let color = '';

    if (confidence >= 90) {
      variant = 'default';
      color = 'text-green-600';
    } else if (confidence >= 70) {
      variant = 'secondary';
      color = 'text-yellow-600';
    } else {
      variant = 'outline';
      color = 'text-orange-600';
    }

    return (
      <Badge variant={variant} className={color}>
        {confidence}% confiança
      </Badge>
    );
  };

  const getMatchTypeDescription = () => {
    if (!validationResult?.matchType) return '';

    switch (validationResult.matchType) {
      case 'asaas_id':
        return 'Correspondência por ID ASAAS';
      case 'document':
        return 'Correspondência por documento';
      case 'name':
        return 'Correspondência por nome';
      default:
        return '';
    }
  };

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================

  if (!hasAccess) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 ${className}`}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {getValidationIcon()}
            Validação de Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AIDEV-NOTE: Status da validação */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{getValidationStatus()}</span>
            {getConfidenceBadge()}
          </div>

          {/* AIDEV-NOTE: Informações do movimento */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Dados da Movimentação:
            </div>
            <div className="grid grid-cols-1 gap-1 text-sm">
              {movement.customerName && (
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="ml-2">{movement.customerName}</span>
                </div>
              )}
              {movement.customerDocument && (
                <div>
                  <span className="text-muted-foreground">Documento:</span>
                  <span className="ml-2">{movement.customerDocument}</span>
                </div>
              )}
              {movement.asaas_customer_id && (
                <div>
                  <span className="text-muted-foreground">ID ASAAS:</span>
                  <span className="ml-2">{movement.asaas_customer_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* AIDEV-NOTE: Resultado da validação */}
          {validationResult && (
            <>
              <Separator />
              {validationResult.hasCustomer ? (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cliente encontrado no sistema. {getMatchTypeDescription()}
                    </AlertDescription>
                  </Alert>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                    <div className="text-sm font-medium text-green-800">
                      Cliente Identificado:
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-sm text-green-700">
                      <div>
                        <span className="font-medium">Nome:</span>
                        <span className="ml-2">{validationResult.customerName}</span>
                      </div>
                      {validationResult.customerDocument && (
                        <div>
                          <span className="font-medium">Documento:</span>
                          <span className="ml-2">{validationResult.customerDocument}</span>
                        </div>
                      )}
                      {validationResult.customerEmail && (
                        <div>
                          <span className="font-medium">Email:</span>
                          <span className="ml-2">{validationResult.customerEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {validationResult.confidence && validationResult.confidence < 90 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Confiança da correspondência: {validationResult.confidence}%. 
                        Verifique se os dados estão corretos antes de prosseguir.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <UserX className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum cliente correspondente foi encontrado no sistema.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryValidation}
                      disabled={isValidating}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tentar Novamente
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onRegisterCustomer}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Cliente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CustomerValidationGuard;