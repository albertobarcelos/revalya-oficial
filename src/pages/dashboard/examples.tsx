import React from 'react';
import { NeonAreaChart } from '@/components/dashboard/NeonAreaChart';
import { NeonLineChart } from '@/components/dashboard/NeonLineChart';
import { NeonBarChart } from '@/components/dashboard/NeonBarChart';
import { NeonRadialChart } from '@/components/dashboard/NeonRadialChart';
import { NeonScatterChart } from '@/components/dashboard/NeonScatterChart';
import { NeonRadarChart } from '@/components/dashboard/NeonRadarChart';
import { NeonComposedChart } from '@/components/dashboard/NeonComposedChart';
import { NeonTreeMapChart } from '@/components/dashboard/NeonTreeMapChart';
import { NeonFunnelChart } from '@/components/dashboard/NeonFunnelChart';
import { Layout } from '@/components/layout/Layout';

// Dados de exemplo para os gráficos
const areaChartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Fev', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Abr', value: 2780 },
  { name: 'Mai', value: 3890 },
  { name: 'Jun', value: 6390 },
  { name: 'Jul', value: 3490 },
];

const lineChartData = [
  { name: 'Seg', value: 4000 },
  { name: 'Ter', value: 6000 },
  { name: 'Qua', value: 4000 },
  { name: 'Qui', value: 7000 },
  { name: 'Sex', value: 5000 },
  { name: 'Sab', value: 3000 },
  { name: 'Dom', value: 1000 },
];

const barChartData = [
  { name: 'Q1', value: 600 },
  { name: 'Q2', value: 800 },
  { name: 'Q3', value: 500 },
  { name: 'Q4', value: 1200 },
];

const radialChartData = [
  { name: 'Concluído', value: 60, color: '#10B981' },
  { name: 'Em Progresso', value: 30, color: '#F59E0B' },
  { name: 'Pendente', value: 10, color: '#EC4899' },
];

const scatterChartData = [
  { x: 10, y: 30, z: 200 },
  { x: 30, y: 200, z: 100 },
  { x: 45, y: 100, z: 400 },
  { x: 50, y: 400, z: 200 },
  { x: 70, y: 150, z: 500 },
  { x: 100, y: 250, z: 300 }
];

const radarChartData = [
  { subject: 'Vendas', value: 120, fullMark: 150 },
  { subject: 'Marketing', value: 98, fullMark: 150 },
  { subject: 'Desenvolvimento', value: 86, fullMark: 150 },
  { subject: 'Suporte', value: 99, fullMark: 150 },
  { subject: 'Administração', value: 85, fullMark: 150 },
  { subject: 'Design', value: 65, fullMark: 150 },
];

const composedChartData = [
  { name: 'Jan', receita: 4000, despesas: 2400, lucro: 1600 },
  { name: 'Fev', receita: 3000, despesas: 1800, lucro: 1200 },
  { name: 'Mar', receita: 5000, despesas: 3500, lucro: 1500 },
  { name: 'Abr', receita: 2780, despesas: 1908, lucro: 872 },
  { name: 'Mai', receita: 3890, despesas: 2800, lucro: 1090 },
  { name: 'Jun', receita: 6390, despesas: 4300, lucro: 2090 },
];

const treeMapData = [
  { name: 'Vendas', value: 5000, color: '#3B82F6' },
  { name: 'Marketing', value: 3500, color: '#EC4899' },
  { name: 'Desenvolvimento', value: 7500, color: '#10B981' },
  { name: 'Operações', value: 2500, color: '#F59E0B' },
  { name: 'Suporte', value: 1500, color: '#8B5CF6' },
  { name: 'Admin', value: 1000, color: '#EF4444' }
];

const funnelChartData = [
  { name: 'Visitantes', value: 5000 },
  { name: 'Leads', value: 3500 },
  { name: 'Qualificados', value: 2500 },
  { name: 'Propostas', value: 1500 },
  { name: 'Negociações', value: 800 },
  { name: 'Vendas', value: 400 }
];

const ExamplesPage = () => {
  return (
    <Layout title="Exemplos de Gráficos">
      <div className="h-screen overflow-y-auto overflow-x-hidden py-4">
        <div className="container px-4 py-4 mx-auto">
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Biblioteca de Gráficos com Estilo Neon</h1>
          <p className="text-gray-400 mb-8">Uma coleção completa de gráficos personalizados com efeitos neon baseados em Recharts.</p>
          
          {/* Primeiros 4 tipos de gráficos */}
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Gráficos Básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Área Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico de Área</h3>
              <NeonAreaChart 
                data={areaChartData} 
                dataKey="value" 
                showAxis={true} 
                showGrid={true}
                gradientColors={{ start: '#8B5CF6', end: '#EC4899' }}
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Ideal para mostrar tendências e volumes ao longo do tempo.</p>
              </div>
            </div>
            
            {/* Line Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico de Linha</h3>
              <NeonLineChart 
                data={lineChartData} 
                dataKey="value" 
                showAxis={true} 
                showGrid={true}
                color="#3B82F6"
                secondaryColor="#10B981"
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Perfeito para visualizar progressão e tendências lineares.</p>
              </div>
            </div>
            
            {/* Bar Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico de Barras</h3>
              <NeonBarChart 
                data={barChartData} 
                showAxis={true} 
                showGrid={true}
                color="#EC4899"
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Excelente para comparar valores entre diferentes categorias.</p>
              </div>
            </div>
            
            {/* Radial Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico Radial (Donut)</h3>
              <NeonRadialChart 
                data={radialChartData}
                innerRadius={60}
                outerRadius={90}
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Melhor para mostrar proporções e distribuições.</p>
              </div>
            </div>
          </div>
          
          {/* Próximos 5 tipos de gráficos */}
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Gráficos Avançados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Scatter Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico de Dispersão</h3>
              <NeonScatterChart 
                data={scatterChartData} 
                showAxis={true}
                showGrid={true}
                color="#8B5CF6"
                secondaryColor="#EC4899"
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Ótimo para visualizar correlações entre duas variáveis.</p>
              </div>
            </div>
            
            {/* Radar Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico de Radar</h3>
              <NeonRadarChart 
                data={radarChartData}
                color="#3B82F6"
                secondaryColor="#EC4899"
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Ideal para comparar múltiplas variáveis em um único gráfico.</p>
              </div>
            </div>
            
            {/* TreeMap Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico TreeMap</h3>
              <NeonTreeMapChart 
                data={treeMapData}
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Perfeito para visualizar dados hierárquicos com proporções.</p>
              </div>
            </div>
            
            {/* Funnel Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico de Funil</h3>
              <NeonFunnelChart 
                data={funnelChartData}
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Excelente para visualizar etapas de um processo com conversões.</p>
              </div>
            </div>
          </div>
          
          {/* Composed Chart */}
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Gráficos Compostos</h2>
          <div className="mb-12">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Gráfico Composto</h3>
              <NeonComposedChart 
                data={composedChartData}
                showAxis={true}
                showGrid={true}
                showLegend={true}
                series={[
                  { type: 'bar', dataKey: 'receita', name: 'Receita', color: '#3B82F6' },
                  { type: 'bar', dataKey: 'despesas', name: 'Despesas', color: '#EC4899' },
                  { type: 'line', dataKey: 'lucro', name: 'Lucro', color: '#10B981' }
                ]}
              />
              <div className="mt-3 text-xs text-slate-400">
                <p>Combina múltiplos tipos de gráficos (barras, linhas, áreas) em uma única visualização.</p>
              </div>
            </div>
          </div>
          
          {/* Exemplos de Uso */}
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Exemplos de Uso</h2>
          <div className="grid grid-cols-1 gap-8 mb-8">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Dashboard de Desempenho Financeiro</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <NeonComposedChart 
                    data={composedChartData}
                    showAxis={true}
                    showGrid={true}
                    series={[
                      { type: 'bar', dataKey: 'receita', name: 'Receita', color: '#3B82F6' },
                      { type: 'bar', dataKey: 'despesas', name: 'Despesas', color: '#EC4899' },
                      { type: 'line', dataKey: 'lucro', name: 'Lucro', color: '#10B981' }
                    ]}
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <NeonFunnelChart 
                    data={funnelChartData.slice(0, 4)}
                    height={200}
                    showLabels={false}
                  />
                  <div className="h-4"></div>
                  <NeonRadialChart 
                    data={radialChartData}
                    height={200}
                    innerRadius={50}
                    outerRadius={70}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Dashboard de Análise de Marketing</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <NeonAreaChart 
                    data={areaChartData} 
                    dataKey="value" 
                    showAxis={true}
                    gradientColors={{ start: '#8B5CF6', end: '#10B981' }}
                  />
                </div>
                <div>
                  <NeonRadarChart 
                    data={radarChartData}
                    showAxis={true}
                    color="#EC4899"
                    secondaryColor="#3B82F6"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Como Implementar */}
          <div className="bg-slate-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Como Implementar</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-gray-200 mb-2">Gráfico Básico</h3>
                <pre className="text-xs text-slate-300 overflow-x-auto p-3 bg-slate-900 rounded">
{`// Importe o componente
import { NeonAreaChart } from '@/components/dashboard/NeonAreaChart';

// Defina seus dados
const data = [
  { name: 'Jan', value: 4000 },
  { name: 'Fev', value: 3000 },
  // ...
];

// Use o componente em seu JSX
<NeonAreaChart 
  data={data} 
  dataKey="value"
  showAxis={true}
  gradientColors={{ start: '#8B5CF6', end: '#EC4899' }}
/>`}
                </pre>
              </div>
              
              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-gray-200 mb-2">Gráfico Avançado</h3>
                <pre className="text-xs text-slate-300 overflow-x-auto p-3 bg-slate-900 rounded">
{`// Importe o componente
import { NeonComposedChart } from '@/components/dashboard/NeonComposedChart';

// Defina seus dados
const data = [
  { name: 'Jan', receita: 4000, despesas: 2400, lucro: 1600 },
  { name: 'Fev', receita: 3000, despesas: 1800, lucro: 1200 },
  // ...
];

// Use o componente em seu JSX
<NeonComposedChart 
  data={data}
  showAxis={true}
  showGrid={true}
  series={[
    { type: 'bar', dataKey: 'receita', color: '#3B82F6' },
    { type: 'bar', dataKey: 'despesas', color: '#EC4899' },
    { type: 'line', dataKey: 'lucro', color: '#10B981' }
  ]}
/>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExamplesPage; 
