import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Calculator, Info, Percent, DollarSign, FileText, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { ContractFormValues } from "../schema/ContractFormSchema";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface ContractTaxesProps {
  className?: string;
}

export function ContractTaxes({ className }: ContractTaxesProps) {
  const form = useFormContext<ContractFormValues>();
  const [activeTab, setActiveTab] = useState("impostos");
  
  // Valores calculados baseados nos serviços do contrato
  const services = form.watch('services') || [];
  const totalServicesValue = services.reduce((sum, service) => {
    return sum + (service.total_amount || 0);
  }, 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Impostos e Retenções do Item</h3>
        </div>
        <Badge variant="outline" className="text-xs w-fit">
          Base de Cálculo: {formatCurrency(totalServicesValue)}
        </Badge>
      </div>

      {/* Abas de Impostos */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
          <TabsTrigger value="impostos" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Impostos e Retenções
          </TabsTrigger>
          <TabsTrigger value="transparencia" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Lei da Transparência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impostos" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Coluna Esquerda - Impostos Principais */}
            <div className="space-y-4">
              {/* Código NBS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Código NBS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <FormField
                    control={form.control}
                    name="tax_data.nbs_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Código NBS</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 01.01"
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* ISS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    ISS (Imposto Sobre Serviços)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="tax_data.iss_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Alíquota (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0,00"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tax_data.iss_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Valor (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="tax_data.iss_withheld"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              ISS Retido na Fonte
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tax_data.inform_iss_value"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              Informar valor do ISS
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tax_data.deduct_iss_from_calculation_base"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              Deduzir ISS da base de cálculo
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* IR */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4 text-destructive" />
                    IR (Imposto de Renda)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="tax_data.ir_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Alíquota (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0,00"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tax_data.ir_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Valor (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="tax_data.ir_withheld"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              IR Retido na Fonte
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tax_data.inform_ir_value"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              Informar valor do IR
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Outras Retenções */}
            <div className="space-y-4">
              {/* CSLL */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4 text-emerald-500" />
                    CSLL (Contribuição Social sobre Lucro Líquido)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="tax_data.csll_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Alíquota (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0,00"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tax_data.csll_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Valor (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="tax_data.csll_withheld"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              CSLL Retido na Fonte
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tax_data.inform_csll_value"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              Informar valor do CSLL
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* INSS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4 text-orange-500" />
                    INSS (Instituto Nacional do Seguro Social)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="tax_data.inss_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Alíquota (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0,00"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tax_data.inss_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Valor (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="tax_data.inss_withheld"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              INSS Retido na Fonte
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tax_data.inform_inss_value"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-normal">
                              Informar valor do INSS
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* PIS/COFINS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4 text-purple-500" />
                    PIS/COFINS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* PIS */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PIS</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="tax_data.pis_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Alíquota (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0,00"
                                className="h-9"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_data.pis_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Valor (R$)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0,00"
                                className="h-9"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="tax_data.pis_withheld"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-xs font-normal">
                                PIS Retido na Fonte
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="tax_data.inform_pis_value"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-xs font-normal">
                                Informar valor do PIS
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* COFINS */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">COFINS</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="tax_data.cofins_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Alíquota (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0,00"
                                className="h-9"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_data.cofins_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Valor (R$)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0,00"
                                className="h-9"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="tax_data.cofins_withheld"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-xs font-normal">
                                COFINS Retido na Fonte
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="tax_data.inform_cofins_value"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-xs font-normal">
                                Informar valor do COFINS
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resumo dos Impostos */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Resumo dos Impostos e Retenções
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Base de Cálculo</p>
                  <p className="font-medium">{formatCurrency(totalServicesValue)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total ISS</p>
                  <p className="font-medium text-primary">
                    {formatCurrency(form.watch('tax_data.iss_value') || 0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total IR</p>
                  <p className="font-medium text-destructive">
                    {formatCurrency(form.watch('tax_data.ir_value') || 0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Retenções</p>
                  <p className="font-medium text-orange-600">
                    {formatCurrency(
                      (form.watch('tax_data.csll_value') || 0) +
                      (form.watch('tax_data.inss_value') || 0) +
                      (form.watch('tax_data.pis_value') || 0) +
                      (form.watch('tax_data.cofins_value') || 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transparencia" className="mt-6">
          <div className="space-y-6">
            {/* Informações da Lei da Transparência */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-500" />
                  Lei da Transparência dos Impostos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-primary mb-2">Informação ao Consumidor</h4>
                  <p className="text-xs text-primary/80 leading-relaxed">
                    De acordo com a Lei 12.741/2012, o valor aproximado dos tributos incidentes sobre este serviço é de:
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tributos Federais</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1 border-b border-border/30">
                        <span className="text-xs text-muted-foreground">IR (Imposto de Renda)</span>
                        <span className="text-xs font-medium">{formatCurrency(form.watch('tax_data.ir_value') || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/30">
                        <span className="text-xs text-muted-foreground">CSLL</span>
                        <span className="text-xs font-medium">{formatCurrency(form.watch('tax_data.csll_value') || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/30">
                        <span className="text-xs text-muted-foreground">INSS</span>
                        <span className="text-xs font-medium">{formatCurrency(form.watch('tax_data.inss_value') || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/30">
                        <span className="text-xs text-muted-foreground">PIS</span>
                        <span className="text-xs font-medium">{formatCurrency(form.watch('tax_data.pis_value') || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/30">
                        <span className="text-xs text-muted-foreground">COFINS</span>
                        <span className="text-xs font-medium">{formatCurrency(form.watch('tax_data.cofins_value') || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tributos Municipais</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1 border-b border-border/30">
                        <span className="text-xs text-muted-foreground">ISS (Imposto Sobre Serviços)</span>
                        <span className="text-xs font-medium">{formatCurrency(form.watch('tax_data.iss_value') || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium text-emerald-800">Total Aproximado de Tributos</h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        Valor total dos tributos incidentes sobre este serviço
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-800">
                        {formatCurrency(
                          (form.watch('tax_data.iss_value') || 0) +
                          (form.watch('tax_data.ir_value') || 0) +
                          (form.watch('tax_data.csll_value') || 0) +
                          (form.watch('tax_data.inss_value') || 0) +
                          (form.watch('tax_data.pis_value') || 0) +
                          (form.watch('tax_data.cofins_value') || 0)
                        )}
                      </p>
                      <p className="text-xs text-emerald-600">
                        {totalServicesValue > 0 ? 
                          `${(((form.watch('tax_data.iss_value') || 0) +
                            (form.watch('tax_data.ir_value') || 0) +
                            (form.watch('tax_data.csll_value') || 0) +
                            (form.watch('tax_data.inss_value') || 0) +
                            (form.watch('tax_data.pis_value') || 0) +
                            (form.watch('tax_data.cofins_value') || 0)) / totalServicesValue * 100).toFixed(2)}% do valor total`
                          : '0% do valor total'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                  <p className="mb-1"><strong>Fonte:</strong> Lei Federal 12.741/2012</p>
                  <p>
                    Os valores apresentados são aproximados e podem variar conforme a legislação tributária vigente. 
                    Esta informação tem caráter educativo e visa dar transparência sobre a carga tributária incidente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
