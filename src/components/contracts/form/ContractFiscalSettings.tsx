/**
 * Componente ContractFiscalSettings
 * 
 * AIDEV-NOTE: Seção de configurações fiscais no formulário de contrato
 * Permite configurar auto-emissão, momento de emissão, modo de parcelas, etc.
 * 
 * @module ContractFiscalSettings
 */

import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Receipt, Mail, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContractFormValues } from '../schema/ContractFormSchema';
import type { FiscalConfig } from '@/types/fiscal';

export function ContractFiscalSettings() {
  const form = useFormContext<ContractFormValues>();

  // AIDEV-NOTE: Valores padrão para fiscal_config
  const defaultFiscalConfig: FiscalConfig = {
    auto_emit_nfe: false,
    auto_emit_nfse: false,
    nfse_emit_moment: 'recebimento',
    nfse_valor_mode: 'proporcional',
    nfse_parcelas_mode: 'por_recebimento',
    auto_send_email: false
  };

  // AIDEV-NOTE: Obter fiscal_config do formulário ou usar padrão
  const fiscalConfig = form.watch('fiscal_config') as FiscalConfig | undefined || defaultFiscalConfig;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium flex items-center gap-2 mb-4">
          <Receipt className="h-4 w-4 text-primary" />
          Configurações Fiscais
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure como as notas fiscais serão emitidas para este contrato
        </p>
      </div>

      {/* NF-e (Produto) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nota Fiscal Eletrônica (NF-e)</CardTitle>
          <CardDescription>
            Configurações para emissão de NF-e de produtos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="fiscal_config.auto_emit_nfe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Emitir NF-e automaticamente
                  </FormLabel>
                  <FormDescription>
                    Emite a NF-e automaticamente ao faturar produtos
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? defaultFiscalConfig.auto_emit_nfe}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* NFS-e (Serviço) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nota Fiscal de Serviços Eletrônica (NFS-e)</CardTitle>
          <CardDescription>
            Configurações para emissão de NFS-e de serviços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="fiscal_config.auto_emit_nfse"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Emitir NFS-e automaticamente
                  </FormLabel>
                  <FormDescription>
                    Emite a NFS-e automaticamente conforme configuração abaixo
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? defaultFiscalConfig.auto_emit_nfse}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fiscal_config.nfse_emit_moment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quando emitir NFS-e
                </FormLabel>
                <Select
                  value={field.value ?? defaultFiscalConfig.nfse_emit_moment}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione quando emitir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="faturamento">No faturamento</SelectItem>
                    <SelectItem value="recebimento">No recebimento</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Escolha se a NFS-e será emitida no momento do faturamento ou quando o pagamento for confirmado
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {fiscalConfig.nfse_emit_moment === 'recebimento' && (
            <FormField
              control={form.control}
              name="fiscal_config.nfse_valor_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor da NFS-e</FormLabel>
                  <Select
                    value={field.value ?? defaultFiscalConfig.nfse_valor_mode}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modo de valor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="proporcional">Proporcional ao valor recebido</SelectItem>
                      <SelectItem value="total">Valor total do serviço</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Escolha se a NFS-e será emitida proporcionalmente ao valor recebido ou pelo valor total
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {fiscalConfig.nfse_emit_moment === 'recebimento' && (
            <FormField
              control={form.control}
              name="fiscal_config.nfse_parcelas_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Múltiplas Parcelas</FormLabel>
                  <Select
                    value={field.value ?? defaultFiscalConfig.nfse_parcelas_mode}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modo de parcelas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="por_recebimento">Emitir por recebimento</SelectItem>
                      <SelectItem value="acumulado">Aguardar acumular e emitir total</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Escolha se cada parcela recebida gera uma NFS-e ou se aguarda acumular todas as parcelas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </CardContent>
      </Card>

      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="fiscal_config.auto_send_email"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Enviar email automaticamente
                  </FormLabel>
                  <FormDescription>
                    Envia automaticamente o PDF/XML da nota fiscal por email após a emissão
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? defaultFiscalConfig.auto_send_email}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

