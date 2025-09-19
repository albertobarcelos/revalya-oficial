import SkeletonComponent, { SkeletonProps } from 'react-loading-skeleton';
import { Card, CardContent, CardFooter, CardHeader } from './card';

// Export do Skeleton básico da biblioteca
export const Skeleton = SkeletonComponent;

// Skeleton básico personalizado
export const CustomSkeleton = ({ ...props }: SkeletonProps) => {
  return <SkeletonComponent {...props} />;
};

// Skeleton para cards de portal/aplicativo
export const PortalCardSkeleton = () => {
  return (
    <Card className="group relative overflow-hidden border border-slate-700 bg-slate-800/90">
      <div className="relative z-10">
        <CardHeader className="pb-4">
          {/* Ícone skeleton */}
          <div className="mb-4">
            <SkeletonComponent circle height={56} width={56} />
          </div>
          
          {/* Título skeleton */}
          <SkeletonComponent height={24} width="80%" className="mb-2" />
          
          {/* Descrição skeleton */}
          <SkeletonComponent height={16} width="100%" />
        </CardHeader>
        
        <CardContent className="pb-4">
          {/* Label skeleton */}
          <SkeletonComponent height={12} width="40%" className="mb-3" />
          
          {/* Lista de funcionalidades skeleton */}
          <div className="space-y-2">
            <div className="flex items-center">
              <SkeletonComponent circle height={6} width={6} className="mr-2" />
              <SkeletonComponent height={14} width="70%" />
            </div>
            <div className="flex items-center">
              <SkeletonComponent circle height={6} width={6} className="mr-2" />
              <SkeletonComponent height={14} width="60%" />
            </div>
            <div className="flex items-center">
              <SkeletonComponent circle height={6} width={6} className="mr-2" />
              <SkeletonComponent height={14} width="80%" />
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          {/* Botão skeleton */}
          <SkeletonComponent height={40} width="100%" />
        </CardFooter>
      </div>
    </Card>
  );
};

// Skeleton para lista de clientes/itens
export const ListItemSkeleton = () => {
  return (
    <div className="flex items-center space-x-4 p-4">
      <SkeletonComponent circle height={40} width={40} />
      <div className="space-y-2 flex-1">
        <SkeletonComponent height={16} width="60%" />
        <SkeletonComponent height={14} width="40%" />
      </div>
      <div className="text-right space-y-2">
        <SkeletonComponent height={16} width={80} />
        <SkeletonComponent height={14} width={60} />
      </div>
    </div>
  );
};

// Skeleton para tabela
export const TableRowSkeleton = ({ columns = 4 }: { columns?: number }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="p-4">
          <SkeletonComponent height={16} />
        </td>
      ))}
    </tr>
  );
};

// Skeleton para métricas/cards de dashboard
export const MetricCardSkeleton = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonComponent height={14} width="50%" />
          <SkeletonComponent height={24} width="70%" />
        </div>
        <SkeletonComponent circle height={32} width={32} />
      </div>
    </Card>
  );
};

// Skeleton para formulário
export const FormSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonComponent height={16} width="20%" />
        <SkeletonComponent height={40} width="100%" />
      </div>
      <div className="space-y-2">
        <SkeletonComponent height={16} width="25%" />
        <SkeletonComponent height={40} width="100%" />
      </div>
      <div className="space-y-2">
        <SkeletonComponent height={16} width="30%" />
        <SkeletonComponent height={80} width="100%" />
      </div>
      <div className="flex gap-4">
        <SkeletonComponent height={40} width={120} />
        <SkeletonComponent height={40} width={100} />
      </div>
    </div>
  );
};

// Skeleton para gráficos
export const ChartSkeleton = ({ height = 300 }: { height?: number }) => {
  return (
    <div className="space-y-4">
      <SkeletonComponent height={20} width="30%" />
      <SkeletonComponent height={height} width="100%" />
    </div>
  );
};
