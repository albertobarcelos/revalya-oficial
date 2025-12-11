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
  if (status === 'PENDING') {
    return (
      <span
        title={title}
        aria-label={title}
        className="inline-block align-middle w-[17px] h-[17px] leading-[17px] rounded-full bg-[rgb(31,181,133)] m-0 p-0"
      />
    );
  }
  if (status === 'DUE_SOON') return (
    <span title={title} aria-label={title} className="inline-block align-middle">
      <AlertCircle size={17} className="text-[rgb(255,177,51)]" />
    </span>
  );
  if (status === 'DUE_TODAY') return (
    <span title={title} aria-label={title} className="inline-block align-middle">
      <AlertTriangle size={17} className="text-[rgb(255,177,51)]" />
    </span>
  );
  if (status === 'OVERDUE') return (
    <span title={title} aria-label={title} className="inline-block align-middle">
      <AlertTriangle size={17} className="text-[rgb(223,75,51)]" />
    </span>
  );
  if (status === 'PAID') return (
    <span title={title} aria-label={title} className="inline-block align-middle">
      <CheckCircle size={17} className="text-[rgb(74,139,233)]" />
    </span>
  );
  if (status === 'CANCELLED') return (
    <span title={title} aria-label={title} className="inline-block align-middle">
      <MinusCircle size={17} className="text-gray-400" />
    </span>
  );
  return null;
}
