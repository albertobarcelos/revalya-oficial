import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Componente para testar e visualizar a nova paleta de cores
 * Este componente pode ser usado para verificar se a implementação está correta
 */
export function ColorPalette() {
  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          🎨 Nova Paleta Revalya
        </h1>
        <p className="text-muted-foreground">
          Paleta de cores profissional para SaaS financeiro
        </p>
      </div>

      {/* Cores Primárias */}
      <Card>
        <CardHeader>
          <CardTitle>🔵 Cores Primárias</CardTitle>
          <CardDescription>Azul corporativo para navegação e elementos principais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="h-20 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-medium">#0066FF</span>
              </div>
              <p className="text-sm text-center">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-primary-light rounded-lg flex items-center justify-center">
                <span className="text-primary font-medium">#CCE5FF</span>
              </div>
              <p className="text-sm text-center">Primary Light</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-primary-dark rounded-lg flex items-center justify-center">
                <span className="text-white font-medium">#0052CC</span>
              </div>
              <p className="text-sm text-center">Primary Dark</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cores Funcionais */}
      <Card>
        <CardHeader>
          <CardTitle>🟢 Cores Funcionais</CardTitle>
          <CardDescription>Cores semânticas para status financeiros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Success */}
            <div className="space-y-2">
              <div className="h-20 bg-success rounded-lg flex items-center justify-center">
                <span className="text-success-foreground font-medium">#16A34A</span>
              </div>
              <p className="text-sm text-center font-medium">Success</p>
              <p className="text-xs text-muted-foreground text-center">Valores recebidos, lucro</p>
            </div>

            {/* Danger */}
            <div className="space-y-2">
              <div className="h-20 bg-danger rounded-lg flex items-center justify-center">
                <span className="text-danger-foreground font-medium">#EF4444</span>
              </div>
              <p className="text-sm text-center font-medium">Danger</p>
              <p className="text-xs text-muted-foreground text-center">Cobranças vencidas, erros</p>
            </div>

            {/* Warning */}
            <div className="space-y-2">
              <div className="h-20 bg-warning rounded-lg flex items-center justify-center">
                <span className="text-warning-foreground font-medium">#F59E0B</span>
              </div>
              <p className="text-sm text-center font-medium">Warning</p>
              <p className="text-xs text-muted-foreground text-center">Pendências, avisos</p>
            </div>

            {/* Accent */}
            <div className="space-y-2">
              <div className="h-20 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-medium">#6366F1</span>
              </div>
              <p className="text-sm text-center font-medium">Accent</p>
              <p className="text-xs text-muted-foreground text-center">IA, métricas especiais</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status de Cobrança */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Status de Cobrança</CardTitle>
          <CardDescription>Aplicação prática das cores em badges de status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Badge className="status-received">Recebido</Badge>
            <Badge className="status-pending">Pendente</Badge>
            <Badge className="status-overdue">Vencido</Badge>
            <Badge className="status-confirmed">Confirmado</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Financeiras */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Métricas Financeiras</CardTitle>
          <CardDescription>Cores para valores positivos, negativos e neutros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold metric-positive">+ R$ 45.230,50</p>
              <p className="text-sm text-muted-foreground">Receita Positiva</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold metric-negative">- R$ 8.450,00</p>
              <p className="text-sm text-muted-foreground">Perda/Vencido</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold metric-neutral">R$ 23.780,00</p>
              <p className="text-sm text-muted-foreground">Valor Neutro</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões e Interações */}
      <Card>
        <CardHeader>
          <CardTitle>🔘 Botões e Interações</CardTitle>
          <CardDescription>Diferentes variações de botões com a nova paleta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </CardContent>
      </Card>

      {/* Sistema de Neutros */}
      <Card>
        <CardHeader>
          <CardTitle>⚪ Sistema de Neutros</CardTitle>
          <CardDescription>Escala de cinzas balanceada para backgrounds e textos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
            {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
              <div key={shade} className="space-y-1">
                <div 
                  className={`h-12 w-full rounded bg-neutral-${shade} border`}
                  style={{ backgroundColor: `var(--neutral-${shade})` }}
                />
                <p className="text-xs text-center">{shade}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informações Técnicas */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Informações Técnicas</CardTitle>
          <CardDescription>Detalhes da implementação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">CSS Variables Principais:</h4>
              <code className="text-sm bg-muted p-2 rounded block">
                --primary: 220 100% 45%;<br/>
                --success: 142 76% 36%;<br/>
                --danger: 0 84% 60%;<br/>
                --warning: 43 96% 56%;<br/>
                --accent: 250 95% 63%;
              </code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Classes Utilitárias:</h4>
              <code className="text-sm bg-muted p-2 rounded block">
                .status-received, .status-pending, .status-overdue, .status-confirmed<br/>
                .metric-positive, .metric-negative, .metric-neutral<br/>
                .header-primary, .nav-active
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
