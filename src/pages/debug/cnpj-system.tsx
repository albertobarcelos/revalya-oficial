'use client';

import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { CNPJSystemDebug } from '@/components/debug/CNPJSystemDebug';

// AIDEV-NOTE: Página de debug para o sistema de CNPJ automático
// Acessível em /debug/cnpj-system para desenvolvedores

export default function CNPJSystemDebugPage() {
  return (
    <Layout title="Debug - Sistema CNPJ">
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Debug do Sistema CNPJ</h1>
          <p className="text-muted-foreground">
            Ferramenta de debug para monitorar e testar o sistema de consulta automática de CNPJ.
          </p>
        </div>
        
        <CNPJSystemDebug />
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Como usar:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>Atualizar:</strong> Recarrega as estatísticas do sistema</li>
            <li>• <strong>Forçar Processamento:</strong> Executa manualmente o processamento de consultas pendentes</li>
            <li>• <strong>Debug Console:</strong> Exibe informações detalhadas no console do navegador</li>
            <li>• <strong>Limpar Antigas:</strong> Remove consultas com mais de 7 dias</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
