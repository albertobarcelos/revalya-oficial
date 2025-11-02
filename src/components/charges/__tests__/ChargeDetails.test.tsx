import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChargeDetails } from '../ChargeDetails';
import { useChargeDetails } from '@/hooks/useChargeDetails';
import { useMessageHistory } from '@/hooks/useMessageHistory';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { useChargeActions } from '@/hooks/useChargeActions';

// Mock dos hooks
jest.mock('@/hooks/useChargeDetails');
jest.mock('@/hooks/useMessageHistory');
jest.mock('@/hooks/usePaymentHistory');
jest.mock('@/hooks/useChargeActions');

const mockCharge = {
  id: 'charge-123',
};

const mockChargeDetails = {
  id: 'charge-123',
  status: 'PENDING',
  amount: 1000,
  due_date: '2024-03-20',
  payment_type: 'PIX',
  pix_code: 'pix-code-123',
  customer_name: 'John Doe',
  customer_document: '123.456.789-00',
  customer_phone: '(11) 99999-9999',
};

const mockMessageHistory = [
  {
    id: 'msg-1',
    tenant_id: 'tenant-123',
    charge_id: 'charge-123',
    template_id: 'template-1',
    customer_id: 'customer-1',
    message: 'Mensagem de teste',
    status: 'delivered',
    error_details: null,
    metadata: null,
    created_at: '2024-03-19T10:00:00',
    updated_at: '2024-03-19T10:00:00',
    batch_id: null,
  },
];

const mockPaymentHistory = [
  {
    id: 'payment-1',
    paid_at: '2024-03-19T10:00:00',
    payment_method: 'PIX',
    amount: 1000,
    transaction_id: 'tx-123',
  },
];

describe('ChargeDetails', () => {
  beforeEach(() => {
    // Setup dos mocks
    (useChargeDetails as jest.Mock).mockReturnValue({
      chargeDetails: mockChargeDetails,
      isLoading: false,
      refreshChargeDetails: jest.fn(),
    });

    (useMessageHistory as jest.Mock).mockReturnValue({
      messageHistory: mockMessageHistory,
      isLoading: false,
    });

    (usePaymentHistory as jest.Mock).mockReturnValue({
      paymentHistory: mockPaymentHistory,
      isLoading: false,
    });

    (useChargeActions as jest.Mock).mockReturnValue({
      cancelCharge: jest.fn(),
      printBoleto: jest.fn(),
      copyPixCode: jest.fn(),
      sendMessage: jest.fn(),
    });
  });

  it('should render loading state correctly', () => {
    (useChargeDetails as jest.Mock).mockReturnValue({
      chargeDetails: null,
      isLoading: true,
      refreshChargeDetails: jest.fn(),
    });

    render(<ChargeDetails charge={mockCharge} onRefresh={jest.fn()} />);

    expect(screen.getAllByTestId('skeleton')).toHaveLength(4);
  });

  it('should render charge details correctly', () => {
    render(<ChargeDetails charge={mockCharge} onRefresh={jest.fn()} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();
    expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('20/03/2024')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('should handle cancel charge correctly', async () => {
    const mockCancelCharge = jest.fn();
    const mockOnRefresh = jest.fn();

    (useChargeActions as jest.Mock).mockReturnValue({
      cancelCharge: mockCancelCharge,
      printBoleto: jest.fn(),
      copyPixCode: jest.fn(),
      sendMessage: jest.fn(),
    });

    render(<ChargeDetails charge={mockCharge} onRefresh={mockOnRefresh} />);

    const cancelButton = screen.getByText('Cancelar Cobrança');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockCancelCharge).toHaveBeenCalledWith('charge-123');
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('should handle copy PIX code correctly', () => {
    const mockCopyPixCode = jest.fn();

    (useChargeActions as jest.Mock).mockReturnValue({
      cancelCharge: jest.fn(),
      printBoleto: jest.fn(),
      copyPixCode: mockCopyPixCode,
      sendMessage: jest.fn(),
    });

    render(<ChargeDetails charge={mockCharge} onRefresh={jest.fn()} />);

    const copyButton = screen.getByText('Copiar Código PIX');
    fireEvent.click(copyButton);

    expect(mockCopyPixCode).toHaveBeenCalledWith('pix-code-123');
  });

  it('should render message history correctly', () => {
    render(<ChargeDetails charge={mockCharge} onRefresh={jest.fn()} />);

    expect(screen.getByText('Histórico de Mensagens')).toBeInTheDocument();
    expect(screen.getByText('19/03/2024 10:00')).toBeInTheDocument();
    expect(screen.getByText('Cobrança')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();
  });

  it('should render payment history correctly', () => {
    render(<ChargeDetails charge={mockCharge} onRefresh={jest.fn()} />);

    expect(screen.getByText('Histórico de Pagamentos')).toBeInTheDocument();
    expect(screen.getByText('19/03/2024 10:00')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('tx-123')).toBeInTheDocument();
  });
});