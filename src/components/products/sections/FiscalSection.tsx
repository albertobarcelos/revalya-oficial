/**
 * Seção: Tributos e Dados Fiscais
 * 
 * AIDEV-NOTE: Componente principal com abas internas para diferentes tributos
 * Abas: Dados Fiscais, Reforma Tributária, ICMS, IPI, PIS/COFINS
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FiscalSectionProps } from '../types/product-form.types';
import { FiscalDataTab } from './fiscal/FiscalDataTab';
import { TaxReformTab } from './fiscal/TaxReformTab';
import { ICMSTab } from './fiscal/ICMSTab';
import { IPITab } from './fiscal/IPITab';
import { PISCOFINSTab } from './fiscal/PISCOFINSTab';

export function FiscalSection({
  fiscalData,
  onFiscalDataChange,
  validCFOPs,
  isLoadingCFOPs,
}: FiscalSectionProps) {
  const [activeTab, setActiveTab] = useState<string>('dados-fiscais');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dados-fiscais">Dados fiscais</TabsTrigger>
          <TabsTrigger value="reforma-tributaria">Reforma Tributária</TabsTrigger>
          <TabsTrigger value="icms">ICMS</TabsTrigger>
          <TabsTrigger value="ipi">IPI</TabsTrigger>
          <TabsTrigger value="pis-cofins">PIS/COFINS</TabsTrigger>
          <TabsTrigger value="derivados-petroleo" disabled>Derivados de petróleo</TabsTrigger>
        </TabsList>

        {/* AIDEV-NOTE: Renderizar apenas quando a aba estiver ativa para evitar requisições desnecessárias */}
        {activeTab === 'dados-fiscais' && (
          <TabsContent value="dados-fiscais" className="mt-6">
            <FiscalDataTab
              fiscalData={fiscalData}
              onFiscalDataChange={onFiscalDataChange}
              enabled={true}
              validCFOPs={validCFOPs}
              isLoadingCFOPs={isLoadingCFOPs}
            />
          </TabsContent>
        )}

        {activeTab === 'reforma-tributaria' && (
          <TabsContent value="reforma-tributaria" className="mt-6">
            <TaxReformTab
              fiscalData={fiscalData}
              onFiscalDataChange={onFiscalDataChange}
              enabled={true}
            />
          </TabsContent>
        )}

        {activeTab === 'icms' && (
          <TabsContent value="icms" className="mt-6">
            <ICMSTab
              fiscalData={fiscalData}
              onFiscalDataChange={onFiscalDataChange}
              enabled={true}
            />
          </TabsContent>
        )}

        {activeTab === 'ipi' && (
          <TabsContent value="ipi" className="mt-6">
            <IPITab
              fiscalData={fiscalData}
              onFiscalDataChange={onFiscalDataChange}
              enabled={true}
            />
          </TabsContent>
        )}

        {activeTab === 'pis-cofins' && (
          <TabsContent value="pis-cofins" className="mt-6">
            <PISCOFINSTab
              fiscalData={fiscalData}
              onFiscalDataChange={onFiscalDataChange}
              enabled={true}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
