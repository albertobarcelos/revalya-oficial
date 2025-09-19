import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ServicesManager } from "@/components/contracts/ServicesManager";
import { StagesManager } from "@/components/contracts/StagesManager";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * Página de configurações de contratos com layout responsivo
 * Permite gerenciar serviços e estágios de workflow dos contratos
 */
export default function ContractSettings() {
  const [activeTab, setActiveTab] = useState("services");

  return (
    <Layout>
      <div className="h-full overflow-auto">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl">
          {/* Header responsivo */}
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
              Configurações de Contratos
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
              Gerencie serviços, estágios de workflow e outras configurações do módulo de contratos
            </p>
          </div>
          
          {/* Tabs com layout responsivo */}
          <Tabs defaultValue="services" onValueChange={setActiveTab} value={activeTab} className="w-full">
            <div className="w-full overflow-x-auto">
              <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-none lg:inline-flex">
                <TabsTrigger value="services" className="text-sm md:text-base">
                  Serviços
                </TabsTrigger>
                <TabsTrigger value="stages" className="text-sm md:text-base">
                  Estágios de Workflow
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="mt-6">
              <TabsContent value="services" className="space-y-0">
                <ServicesManager />
              </TabsContent>
              
              <TabsContent value="stages" className="space-y-0">
                <StagesManager />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
