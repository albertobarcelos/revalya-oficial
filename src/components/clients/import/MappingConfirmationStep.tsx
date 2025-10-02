/**
 * Componente de Confirmação do Mapeamento
 * 
 * @module MappingConfirmationStep
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  AlertTriangle,
  Eye,
  FileText,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { FieldMapping } from '@/types/import';

// AIDEV-NOTE: Campos do sistema Revalya para referência
// AIDEV-NOTE: Campo 'active' removido - todos clientes importados entram como ativos por padrão
const REVALYA_CUSTOMER_FIELDS = [
  { key: 'name', label: 'Nome', required: true, type: 'text' },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ', required: true, type: 'cpf_cnpj' },
  { key: 'email', label: 'Email', required: false, type: 'email' },
  { key: 'celular_whatsapp', label: 'Celular e WhatsApp', required: false, type: 'phone' }, // AIDEV-NOTE: Campo celular/WhatsApp movido acima do telefone
  { key: 'phone', label: 'Telefone', required: false, type: 'phone' },
  { key: 'company', label: 'Empresa', required: false, type: 'text' },
  { key: 'address', label: 'Endereço', required: false, type: 'text' },
  { key: 'address_number', label: 'Número do Endereço', required: false, type: 'text' },
  { key: 'neighborhood', label: 'Bairro', required: false, type: 'text' },
  { key: 'city', label: 'cidade', required: false, type: 'text' },
  { key: 'state', label: 'Estado', required: false, type: 'text' },
  { key: 'country', label: 'País', required: false, type: 'text' },
  { key: 'postal_code', label: 'CEP', required: false, type: 'text' },
  { key: 'complement', label: 'Complemento', required: false, type: 'text' },
  { key: 'additional_info', label: 'Informações Adicionais', required: false, type: 'text' },
  { key: 'customer_asaas_id', label: 'ID_Cliente', required: false, type: 'text' },
];

interface MappingConfirmationStepProps {
  fieldMappings: FieldMapping[];
  totalRecords: number;
  onConfirm: () => void;
  onBack: () => void;
  isProcessing?: boolean;
}

export function MappingConfirmationStep({
  fieldMappings,
  totalRecords,
  onConfirm,
  onBack,
  isProcessing = false
}: MappingConfirmationStepProps) {
  // AIDEV-NOTE: Calcular estatísticas do mapeamento
  const mappedFields = fieldMappings.filter(m => m.targetField !== null);
  const requiredFields = REVALYA_CUSTOMER_FIELDS.filter(f => f.required);
  const mappedRequiredFields = requiredFields.filter(rf => 
    mappedFields.some(mf => mf.targetField === rf.key)
  );
  const unmappedRequiredFields = requiredFields.filter(rf => 
    !mappedFields.some(mf => mf.targetField === rf.key)
  );

  const canProceed = unmappedRequiredFields.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold">Confirmar Mapeamento</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Revise o mapeamento dos campos antes de processar todos os registros
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{totalRecords}</p>
                <p className="text-xs text-muted-foreground">Registros para importar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{mappedFields.length}</p>
                <p className="text-xs text-muted-foreground">Campos mapeados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                canProceed 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : 'bg-red-100 dark:bg-red-900/20'
              }`}>
                {canProceed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  canProceed ? 'text-green-600' : 'text-red-600'
                }`}>
                  {mappedRequiredFields.length}/{requiredFields.length}
                </p>
                <p className="text-xs text-muted-foreground">Campos obrigatórios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo do Mapeamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Resumo do Mapeamento
          </CardTitle>
          <CardDescription>
            Campos que serão importados com seus respectivos mapeamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campos Obrigatórios */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Campos Obrigatórios
            </h4>
            <div className="space-y-2">
              {requiredFields.map(field => {
                const mapping = mappedFields.find(m => m.targetField === field.key);
                const isMapped = !!mapping;
                
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isMapped 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' 
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isMapped ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">{field.label}</span>
                    </div>
                    <div className="text-right">
                      {isMapped ? (
                        <Badge variant="secondary" className="text-xs">
                          {mapping.sourceField}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Não mapeado
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Campos Opcionais Mapeados */}
          {mappedFields.filter(m => !requiredFields.some(rf => rf.key === m.targetField)).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                Campos Opcionais Mapeados
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {mappedFields
                  .filter(m => !requiredFields.some(rf => rf.key === m.targetField))
                  .map(mapping => {
                    const field = REVALYA_CUSTOMER_FIELDS.find(f => f.key === mapping.targetField);
                    return (
                      <motion.div
                        key={mapping.targetField}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-2 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20"
                      >
                        <span className="text-sm font-medium">{field?.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {mapping.sourceField}
                        </Badge>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas */}
      {!canProceed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">
                Campos obrigatórios não mapeados
              </h4>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                Você precisa mapear todos os campos obrigatórios antes de continuar.
                Volte para a etapa anterior e complete o mapeamento.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Mapeamento
        </Button>

        <Button
          onClick={onConfirm}
          disabled={!canProceed || isProcessing}
          className="flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processando...
            </>
          ) : (
            <>
              Confirmar e Processar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}