import React, { useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { format, parse, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RevenueTrendChartProps {
  data: {
    month: string;
    revenue: number;
  }[];
  dueData?: {
    month: string;
    revenue: number;
  }[];
  growth: number;
}

export function RevenueTrendChart({ data, dueData, growth }: RevenueTrendChartProps) {
  // Log para debug
  useEffect(() => {
    console.log("RevenueTrendChart - dados recebidos (pagamentos):", data);
    console.log("RevenueTrendChart - dados esperados (vencimentos):", dueData);
    
    // Verificar especificamente os dados de março
    const marchData = data?.find(item => item.month.toLowerCase().includes('mar/'));
    const marchDueData = dueData?.find(item => item.month.toLowerCase().includes('mar/'));
    
    console.log("RevenueTrendChart - Dados de março (pagamentos):", marchData);
    console.log("RevenueTrendChart - Dados de março (vencimentos):", marchDueData);
  }, [data, dueData]);

  // Formatar os meses para uma exibição mais limpa
  const chartData = useMemo(() => {
    // Garantir que temos dados para mostrar
    if (!data || data.length === 0) {
      console.warn("RevenueTrendChart - Nenhum dado de pagamento disponível");
      // Retornar dados simulados para os últimos 6 meses para exibição vazia
      const lastSixMonths = [];
      const today = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(today.getMonth() - i);
        const monthName = format(date, 'MMM/yyyy', { locale: ptBR });
        const [monthText, year] = monthName.split('/');
        const shortMonth = `${monthText.charAt(0).toUpperCase() + monthText.slice(1, 3)}/${year.slice(2)}`;
        
        lastSixMonths.push({
          month: shortMonth,
          monthFull: monthName,
          pagamentos: 0,
          vencimentos: 0,
          diferenca: 0
        });
      }
      
      return lastSixMonths;
    }

    // Montar faixa contínua dos últimos 6 meses a partir da data atual
    const monthsRange: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      monthsRange.push(format(d, 'MMM/yyyy', { locale: ptBR }));
    }
    
    // Mapear os dados para cada mês da faixa contínua
    return monthsRange.map((month, index) => {
      const paymentItem = data.find(item => item.month === month);
      const dueItem = dueData?.find(item => item.month === month);
      const [monthName, year] = month.split('/');
      const displayMonth = `${monthName.charAt(0).toUpperCase() + monthName.slice(1, 3)}/${year.slice(2)}`;
      const resultado = {
        month: displayMonth,
        monthFull: month,
        pagamentos: paymentItem?.revenue || 0,
        vencimentos: dueItem?.revenue || 0,
        diferenca: (dueItem?.revenue || 0) - (paymentItem?.revenue || 0)
      };
      console.log(`RevenueTrendChart - Item ${index} (${displayMonth}):`, resultado);
      return resultado;
    });
  }, [data, dueData]);

  // Calcular máximo para o eixo Y para garantir espaço adequado
  const maxValue = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return 1000; // Valor padrão caso não haja dados
    }
    
    const values = [
      ...chartData.map(item => item.pagamentos || 0),
      ...chartData.map(item => item.vencimentos || 0)
    ];
    
    // Log para verificar os valores encontrados
    console.log('RevenueTrendChart - Valores para calcular escala:', values);
    
    const max = Math.max(...values.filter(v => !isNaN(v) && isFinite(v)));
    console.log('RevenueTrendChart - Valor máximo encontrado:', max);
    
    // Garante um espaço de 30% acima do valor máximo, mas com um valor mínimo de 1000
    // Se o valor for muito pequeno, usa 60000 (60 mil) como referência para exibir melhor os valores esperados
    if (max < 1000) {
      return 60000;
    }
    
    return Math.max(max * 1.3, 60000); // Aumentamos o mínimo para 60k para comportar valores esperados
  }, [chartData]);

  // Totais para o cartão de resumo - agora apenas para o mês atual
  const currentMonthData = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      console.warn("RevenueTrendChart - Sem dados para determinar o mês atual");
      return { pagamentos: 0, vencimentos: 0, month: '', monthFull: 'N/D' };
    }
    
    // Obtém a data atual para identificar o mês corrente
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Nome do mês atual no formato usado no chartData
    const currentMonthName = format(now, 'MMM/yyyy', { locale: ptBR });
    
    console.log("RevenueTrendChart - Buscando dados do mês atual:", currentMonthName);
    
    // Tenta encontrar o mês atual nos dados do gráfico
    // Primeiro tentamos encontrar uma correspondência exata
    let currentMonthItem = chartData.find(item => item.monthFull === currentMonthName);
    
    // Se não encontrar, procuramos pelo nome do mês, independente do ano
    if (!currentMonthItem) {
      const [monthNameOnly] = currentMonthName.split('/');
      currentMonthItem = chartData.find(item => {
        const [itemMonthName] = item.monthFull.split('/');
        return itemMonthName.toLowerCase() === monthNameOnly.toLowerCase();
      });
    }
    
    // Se ainda não encontrou, usamos o último mês disponível (mais recente)
    if (currentMonthItem) {
      console.log("RevenueTrendChart - Mês atual encontrado nos dados:", currentMonthItem);
      return currentMonthItem;
    } else {
      // O último item é o mês mais recente
      const lastItem = chartData[chartData.length - 1];
      console.log("RevenueTrendChart - Mês atual não encontrado, usando o mais recente:", lastItem);
      return lastItem || { pagamentos: 0, vencimentos: 0, month: '', monthFull: 'N/D' };
    }
  }, [chartData]);
  
  // Para compatibilidade, mantemos também os totais acumulados
  const totalRecebido = useMemo(() => 
    chartData.reduce((acc, curr) => acc + (curr.pagamentos || 0), 0), 
  [chartData]);
  
  const totalEsperado = useMemo(() => 
    chartData.reduce((acc, curr) => acc + (curr.vencimentos || 0), 0), 
  [chartData]);

  // Mostrar o ano corretamente mesmo quando passamos o mouse
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Extrair o mês completo do item de dados original
      const dataItem = chartData.find(item => item.month === label);
      
      // Garantir que mostramos o mês com o ano correto (2025)
      const fullMonth = dataItem?.monthFull || label;
      
      // Valores para exibição no tooltip - agora na ordem correta
      // payload[0] é pagamentos (azul) e payload[1] é vencimentos (rosa)
      const valorRecebido = payload[0]?.value || 0;
      const valorEsperado = payload[1]?.value || 0;
      const diferenca = Math.abs(valorEsperado - valorRecebido);
      const isDeficit = valorEsperado > valorRecebido;
      
      return (
        <div className="bg-white dark:bg-black border border-border rounded-xl p-4 shadow-lg">
          <p className="text-heading-3 font-bold mb-2">{fullMonth}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-body text-muted-foreground">Esperado:</span>
              <span className="text-base font-bold text-pink-500">
                {formatCurrency(valorEsperado)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-body text-muted-foreground">Recebido:</span>
              <span className="text-base font-bold text-blue-500">
                {formatCurrency(valorRecebido)}
              </span>
            </div>
            
            <div className="h-px w-full bg-border my-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-body text-muted-foreground">Diferença:</span>
              <span className={`text-base font-bold ${isDeficit ? 'text-red-500' : 'text-green-500'}`}>
                {isDeficit ? '-' : '+'}
                {formatCurrency(diferenca)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-2 overflow-hidden bg-blue-50/80 dark:bg-slate-900/80">
      <CardHeader className="flex flex-row items-start justify-between pb-0">
        <div>
          <CardTitle className="text-heading-1 font-semibold">
            Tendência de Receita
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Evolução da receita recebida vs esperada
          </p>
        </div>
        
        <div className="flex flex-col items-end">
          <div className={`flex items-center rounded-full ${growth >= 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'} px-3 py-1 mb-1`}>
            {growth >= 0 ? <TrendingUp className="mr-1.5 h-4 w-4" /> : <TrendingDown className="mr-1.5 h-4 w-4" />}
            <span className="text-body font-medium" title="Crescimento baseado nos valores esperados (a vencer) comparando o mês atual com o primeiro mês do período de 6 meses">{growth.toFixed(1)}%</span>
          </div>
          <span className="text-xs text-muted-foreground">Crescimento semestral</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 pt-4">
        <div className="h-64 sm:h-72 md:h-80 lg:h-96 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="gradientPink" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  
                  {/* Glow effects */}
                  <filter id="glowPink" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feFlood floodColor="#ec4899" floodOpacity="0.2" result="color" />
                    <feComposite in="color" in2="blur" operator="in" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  
                  <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feFlood floodColor="#3b82f6" floodOpacity="0.2" result="color" />
                    <feComposite in="color" in2="blur" operator="in" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(142, 142, 160, 0.1)" 
                  vertical={false} 
                />
                
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value, true)}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  domain={[0, maxValue]}
                />
                
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: 'rgba(142, 142, 160, 0.2)', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                
                <Legend 
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => {
                    return <span className={value === "Vencimentos Esperados" ? "text-pink-500" : "text-blue-500"}>
                      {value}
                    </span>
                  }}
                />
                
                {/* Pagamentos recebidos (atrás) */}
                <Area
                  type="monotone"
                  dataKey="pagamentos"
                  name="Pagamentos Recebidos"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gradientBlue)"
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  style={{ filter: 'url(#glowBlue)' }}
                  fillOpacity={0.6}
                />
                
                {/* Vencimentos esperados (na frente) */}
                <Area
                  type="monotone"
                  dataKey="vencimentos"
                  name="Vencimentos Esperados"
                  stroke="#ec4899"
                  strokeWidth={2}
                  fill="url(#gradientPink)"
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  style={{ filter: 'url(#glowPink)' }}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6">
                <p className="text-sm text-muted-foreground">Não há dados de pagamentos disponíveis para exibir</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Seção de resumo - mostrar apenas mês atual */}
        <div className="grid grid-cols-2 gap-4 p-6 pt-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Total Recebido</div>
            <div className="text-heading-1 font-bold text-blue-500 tracking-tight">
              {formatCurrency(currentMonthData.pagamentos)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {`Mês atual: ${currentMonthData.monthFull || 'N/D'}`}
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Total Esperado</div>
            <div className="text-heading-1 font-bold text-pink-500 tracking-tight">
              {formatCurrency(currentMonthData.vencimentos)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {currentMonthData.vencimentos > currentMonthData.pagamentos ? 
                `Faltam ${formatCurrency(currentMonthData.vencimentos - currentMonthData.pagamentos)} a receber` : 
                `Superávit de ${formatCurrency(currentMonthData.pagamentos - currentMonthData.vencimentos)}`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
