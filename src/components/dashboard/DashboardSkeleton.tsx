import { MetricCardSkeleton, ChartSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Skeleton from 'react-loading-skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <ChartSkeleton height={250} />
        </Card>
        <Card className="p-6">
          <ChartSkeleton height={250} />
        </Card>
      </div>
      
      {/* Projeção de fluxo de caixa */}
      <Card className="p-6">
        <ChartSkeleton height={200} />
      </Card>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        {/* Tab buttons skeleton */}
        <div className="flex space-x-1 rounded-lg bg-muted p-1">
          <Skeleton height={36} width={100} />
          <Skeleton height={36} width={100} />
          <Skeleton height={36} width={100} />
        </div>
        
        {/* Tab content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <ChartSkeleton height={200} />
          </Card>
          
          <Card className="overflow-hidden">
            <div className="p-4 border-b">
              <Skeleton height={20} width="50%" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton height={16} width={120} />
                    <Skeleton height={12} width={80} />
                  </div>
                  <Skeleton height={16} width={80} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 
