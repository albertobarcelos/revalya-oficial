import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ResellerDetail } from '@/components/admin/ResellerDetail';

export default function ResellerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => navigate('/admin/resellers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes do Revendedor</h1>
        </div>
      </div>

      <ResellerDetail resellerId={id} />
    </div>
  );
}