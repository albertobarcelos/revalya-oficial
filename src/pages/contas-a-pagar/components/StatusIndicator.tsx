import { AlertCircle, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';

export function StatusIndicator({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    PENDING: 'Pendente',
    DUE_SOON: 'A vencer',
    DUE_TODAY: 'Vence hoje',
    OVERDUE: 'Vencida',
    PAID: 'Pago',
    CANCELLED: 'Estornada',
  };
  const title = labelMap[status] || status;
  if (status === 'PENDING') return <span title={title} aria-label={title} className="inline-block w-3 h-3 rounded-full bg-green-500" />;
  if (status === 'DUE_SOON') return <AlertCircle title={title} aria-label={title} size={17} className="text-[rgb(255,177,51)]" />;
  if (status === 'DUE_TODAY') return <AlertTriangle title={title} aria-label={title} size={17} className="text-[rgb(255,177,51)] inline-block align-middle outline outline-1 outline-[rgb(255,0,0)] outline-dashed" />;
  if (status === 'OVERDUE') return <AlertTriangle title={title} aria-label={title} size={17} className="text-[rgb(223,75,51)] inline-block align-middle outline outline-1 outline-[rgb(255,0,0)] outline-dashed" />;
  if (status === 'PAID') return <CheckCircle title={title} aria-label={title} size={17} className="text-[rgb(74,139,233)]" />;
  if (status === 'CANCELLED') return <MinusCircle title={title} aria-label={title} size={17} className="text-gray-400" />;
  return null;
}
