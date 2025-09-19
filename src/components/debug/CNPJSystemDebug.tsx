'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Play, Trash2, Bug } from 'lucide-react';
import { 
  verificarConsultasPendentes, 
  verificarConsultasPorStatus,
  forcarProcessamento,
  gerarRelatorioSistema,
  limparConsultasAntigas,
  debugSistemaCNPJ,
  CNPJLookupStatus
} from '@/utils/testCNPJSystem';
import { useCNPJBackground } from '@/providers/CNPJBackgroundProvider';
import { toast } from '@/hooks/use-toast';

// AIDEV-NOTE: Componente de debug para o sistema de CNPJ automático
// Permite monitorar e testar o funcionamento do sistema

interface RelatorioSistema {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  consultas: CNPJLookupStatus[];
}

export function CNPJSystemDebug() {
  const [relatorio, setRelatorio] = useState<RelatorioSistema | null>(null);
  const [loading, setLoading] = useState(false);
  const [consultasSelecionadas, setConsultasSelecionadas] = useState<string>('all');
  const cnpjBackground = useCNPJBackground();

  // AIDEV-NOTE: Carrega o relatório inicial
  useEffect(() => {
    carregarRelatorio();
  }, []);

  // AIDEV-NOTE: Função para carregar o relatório do sistema
  const carregarRelatorio = async () => {
    setLoading(true);
    try {
      const novoRelatorio = await gerarRelatorioSistema();
      setRelatorio(novoRelatorio);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar relatório do sistema CNPJ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // AIDEV-NOTE: Força o processamento de consultas pendentes
  const handleForcarProcessamento = async () => {
    setLoading(true);
    try {
      await forcarProcessamento();
      toast({
        title: "Sucesso",
        description: "Processamento forçado executado"
      });
      // Recarrega o relatório após 2 segundos
      setTimeout(carregarRelatorio, 2000);
    } catch (error) {
      console.error('Erro ao forçar processamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao forçar processamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // AIDEV-NOTE: Executa debug completo no console
  const handleDebugCompleto = async () => {
    setLoading(true);
    try {
      await debugSistemaCNPJ();
      toast({
        title: "Debug Executado",
        description: "Verifique o console para informações detalhadas"
      });
    } catch (error) {
      console.error('Erro no debug:', error);
      toast({
        title: "Erro",
        description: "Erro ao executar debug",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // AIDEV-NOTE: Limpa consultas antigas
  const handleLimparAntigas = async () => {
    setLoading(true);
    try {
      const quantidade = await limparConsultasAntigas();
      toast({
        title: "Limpeza Concluída",
        description: `${quantidade} consultas antigas removidas`
      });
      carregarRelatorio();
    } catch (error) {
      console.error('Erro ao limpar consultas:', error);
      toast({
        title: "Erro",
        description: "Erro ao limpar consultas antigas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // AIDEV-NOTE: Filtra consultas por status
  const consultasFiltradas = relatorio?.consultas.filter(consulta => {
    if (consultasSelecionadas === 'all') return true;
    return consulta.status === consultasSelecionadas;
  }) || [];

  // AIDEV-NOTE: Função para obter cor do badge baseado no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug do Sistema CNPJ
          </CardTitle>
          <CardDescription>
            Monitore e teste o funcionamento do sistema de consulta automática de CNPJ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status do Processamento */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Status do Processamento Automático</p>
              <p className="text-xs text-muted-foreground">
                {cnpjBackground.isProcessing ? 'Ativo' : 'Inativo'}
              </p>
            </div>
            <Badge variant={cnpjBackground.isProcessing ? 'default' : 'secondary'}>
              {cnpjBackground.isProcessing ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={carregarRelatorio} 
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Button 
              onClick={handleForcarProcessamento} 
              disabled={loading}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Forçar Processamento
            </Button>
            
            <Button 
              onClick={handleDebugCompleto} 
              disabled={loading}
              size="sm"
              variant="secondary"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug Console
            </Button>
            
            <Button 
              onClick={handleLimparAntigas} 
              disabled={loading}
              size="sm"
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Antigas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {relatorio && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{relatorio.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{relatorio.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{relatorio.processing}</p>
                <p className="text-xs text-muted-foreground">Processando</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{relatorio.completed}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{relatorio.failed}</p>
                <p className="text-xs text-muted-foreground">Falhadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Consultas */}
      {relatorio && (
        <Card>
          <CardHeader>
            <CardTitle>Consultas CNPJ</CardTitle>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={consultasSelecionadas === 'all' ? 'default' : 'outline'}
                onClick={() => setConsultasSelecionadas('all')}
              >
                Todas ({relatorio.total})
              </Button>
              <Button 
                size="sm" 
                variant={consultasSelecionadas === 'pending' ? 'default' : 'outline'}
                onClick={() => setConsultasSelecionadas('pending')}
              >
                Pendentes ({relatorio.pending})
              </Button>
              <Button 
                size="sm" 
                variant={consultasSelecionadas === 'failed' ? 'default' : 'outline'}
                onClick={() => setConsultasSelecionadas('failed')}
              >
                Falhadas ({relatorio.failed})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {consultasFiltradas.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma consulta encontrada
                </p>
              ) : (
                consultasFiltradas.map((consulta) => (
                  <div key={consulta.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(consulta.status)}>
                          {consulta.status}
                        </Badge>
                        <span className="font-mono text-sm">{consulta.cnpj}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cliente: {consulta.customer_id} | Tentativas: {consulta.attempts}
                      </p>
                      {consulta.error_message && (
                        <p className="text-xs text-red-600 mt-1">
                          Erro: {consulta.error_message}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{new Date(consulta.created_at).toLocaleString()}</p>
                      {consulta.processed_at && (
                        <p>Processado: {new Date(consulta.processed_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
