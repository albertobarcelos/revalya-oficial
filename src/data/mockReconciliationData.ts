// =====================================================
// MOCK RECONCILIATION DATA
// Descrição: Dados simulados para desenvolvimento e testes da tela de conciliação
// =====================================================

import { 
  ImportedMovement, 
  ReconciliationSource, 
  ReconciliationStatus, 
  PaymentStatus,
  ReconciliationIndicators,
  MockDataConfig
} from '@/types/reconciliation';

// AIDEV-NOTE: Dados mock realistas simulando diferentes cenários de conciliação
// Inclui movimentações de todas as origens com diferentes status e situações

// =====================================================
// MOCK DATA GENERATORS
// =====================================================

const generateRandomId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

const generateExternalId = (source: ReconciliationSource): string => {
  const prefixes = {
    [ReconciliationSource.ASAAS]: 'cus_',
    [ReconciliationSource.CORA]: 'cor_',
    [ReconciliationSource.ITAU]: 'ita_',
    [ReconciliationSource.STONE]: 'sto_',
    [ReconciliationSource.MANUAL]: 'man_'
  };
  
  return prefixes[source] + Math.random().toString(36).substr(2, 12);
};

const generateCustomerData = () => {
  const names = [
    'João Silva Santos',
    'Maria Oliveira Costa',
    'Pedro Almeida Ferreira',
    'Ana Paula Rodrigues',
    'Carlos Eduardo Lima',
    'Fernanda Souza Martins',
    'Ricardo Pereira Gomes',
    'Juliana Santos Barbosa',
    'Marcos Vinícius Rocha',
    'Patrícia Fernandes Dias'
  ];
  
  const documents = [
    '123.456.789-01',
    '987.654.321-02',
    '456.789.123-03',
    '789.123.456-04',
    '321.654.987-05',
    '654.987.321-06',
    '147.258.369-07',
    '369.258.147-08',
    '258.147.369-09',
    '741.852.963-10'
  ];
  
  const randomIndex = Math.floor(Math.random() * names.length);
  return {
    name: names[randomIndex],
    document: documents[randomIndex]
  };
};

const generateRandomDate = (daysAgo: number = 30): string => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
};

const generateRandomAmount = (min: number = 50, max: number = 5000): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

// =====================================================
// MOCK MOVEMENTS DATA
// =====================================================

export const generateMockMovements = (config?: Partial<MockDataConfig>): ImportedMovement[] => {
  const defaultConfig: MockDataConfig = {
    count: 50,
    sources: [
      ReconciliationSource.ASAAS,
      ReconciliationSource.CORA,
      ReconciliationSource.ITAU,
      ReconciliationSource.STONE,
      ReconciliationSource.MANUAL
    ],
    statusDistribution: {
      [ReconciliationStatus.PENDING]: 0.6,
      [ReconciliationStatus.RECONCILED]: 0.25,
      [ReconciliationStatus.DIVERGENT]: 0.1,
      [ReconciliationStatus.CANCELLED]: 0.05
    },
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    },
    includeContracts: true,
    includeDivergences: true
  };

  const finalConfig = { ...defaultConfig, ...config };
  const movements: ImportedMovement[] = [];

  for (let i = 0; i < finalConfig.count; i++) {
    const source = finalConfig.sources[Math.floor(Math.random() * finalConfig.sources.length)];
    const customer = generateCustomerData();
    const chargeAmount = generateRandomAmount(100, 2000);
    const paidAmount = generateRandomAmount(chargeAmount * 0.8, chargeAmount * 1.2);
    const difference = Math.round((paidAmount - chargeAmount) * 100) / 100;
    
    // Determine status based on distribution
    const rand = Math.random();
    let status = ReconciliationStatus.PENDING;
    let cumulative = 0;
    
    for (const [statusKey, probability] of Object.entries(finalConfig.statusDistribution)) {
      cumulative += probability;
      if (rand <= cumulative) {
        status = statusKey as ReconciliationStatus;
        break;
      }
    }

    // Determine payment status
    let paymentStatus = PaymentStatus.PENDING;
    if (status === ReconciliationStatus.RECONCILED) {
      paymentStatus = PaymentStatus.PAID;
    } else if (status === ReconciliationStatus.CANCELLED) {
      paymentStatus = PaymentStatus.CANCELLED;
    } else if (Math.random() > 0.7) {
      paymentStatus = PaymentStatus.PAID;
    }

    const hasContract = finalConfig.includeContracts && Math.random() > 0.3;
    const contractId = hasContract ? `CTR-${generateRandomId().toUpperCase()}` : undefined;
    const chargeId = hasContract && Math.random() > 0.5 ? `CHG-${generateRandomId().toUpperCase()}` : undefined;

    const movement: ImportedMovement = {
      id: generateRandomId(),
      tenantId: 'tenant-1',
      source,
      externalId: generateExternalId(source),
      externalReference: Math.random() > 0.7 ? `REF-${generateRandomId()}` : undefined,
      
      chargeAmount: hasContract ? chargeAmount : undefined,
      paidAmount,
      difference: Math.abs(difference) > 0.01 ? difference : undefined,
      currency: 'BRL',
      
      paymentStatus,
      reconciliationStatus: status,
      dueDate: hasContract ? generateRandomDate(45) : undefined,
      paymentDate: paymentStatus === PaymentStatus.PAID ? generateRandomDate(15) : undefined,
      
      contractId,
      chargeId,
      hasContract,
      
      description: `Pagamento via ${source} - ${customer.name}`,
      customerName: customer.name,
      customerDocument: customer.document,
      observations: status === ReconciliationStatus.DIVERGENT ? 
        `Diferença de ${difference > 0 ? 'juros' : 'desconto'}: ${Math.abs(difference).toFixed(2)}` : 
        undefined,
      
      importedAt: generateRandomDate(7),
      reconciledAt: status === ReconciliationStatus.RECONCILED ? generateRandomDate(3) : undefined,
      reconciledBy: status === ReconciliationStatus.RECONCILED ? 'admin@revalya.com' : undefined,
      createdAt: generateRandomDate(30),
      updatedAt: generateRandomDate(5)
    };

    movements.push(movement);
  }

  return movements.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
};

// =====================================================
// SPECIFIC MOCK SCENARIOS
// =====================================================

export const mockMovementsAsaas: ImportedMovement[] = [
  {
    id: 'mov-asaas-001',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_123456789',
    
    chargeAmount: 1500.00,
    paidAmount: 1500.00,
    difference: 0,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.RECONCILED,
    dueDate: '2024-01-15T00:00:00.000Z',
    paymentDate: '2024-01-15T14:30:00.000Z',
    
    contractId: 'CTR-ABC123',
    chargeId: 'CHG-XYZ789',
    hasContract: true,
    
    description: 'Mensalidade Janeiro 2024 - João Silva',
    customerName: 'João Silva Santos',
    customerDocument: '123.456.789-01',
    reconciledAt: '2024-01-15T15:00:00.000Z',
    reconciledBy: 'user-admin-001',
    
    importedAt: '2024-01-15T15:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T15:00:00.000Z'
  },
  {
    id: 'mov-asaas-002',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_987654321',
    
    chargeAmount: undefined,
    paidAmount: 750.00,
    difference: undefined,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: undefined,
    paymentDate: '2024-01-16T10:45:00.000Z',
    
    contractId: undefined,
    chargeId: undefined,
    hasContract: false,
    
    description: 'Pagamento avulso - Maria Oliveira',
    customerName: 'Maria Oliveira Costa',
    customerDocument: '987.654.321-02',
    
    importedAt: '2024-01-16T11:00:00.000Z',
    createdAt: '2024-01-16T10:45:00.000Z',
    updatedAt: '2024-01-16T11:00:00.000Z'
  },
  {
    id: 'mov-asaas-003',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_456789123',
    
    chargeAmount: 2800.00,
    paidAmount: 2850.00,
    difference: 50.00,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.DIVERGENT,
    dueDate: '2024-01-08T00:00:00.000Z',
    paymentDate: '2024-01-18T16:20:00.000Z',
    
    contractId: 'CTR-ASA003',
    chargeId: 'CHG-ASA003',
    hasContract: true,
    
    description: 'Mensalidade com juros - Carlos Pereira',
    customerName: 'Carlos Pereira Lima',
    customerDocument: '456.789.123-03',
    observations: 'Diferença de juros: R$ 50,00 (pagamento em atraso)',
    
    importedAt: '2024-01-18T17:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-18T17:00:00.000Z'
  },
  {
    id: 'mov-asaas-004',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_789123456',
    
    chargeAmount: 1200.00,
    paidAmount: 1200.00,
    difference: 0,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.RECONCILED,
    dueDate: '2024-01-20T00:00:00.000Z',
    paymentDate: '2024-01-19T08:15:00.000Z',
    
    contractId: 'CTR-ASA004',
    chargeId: 'CHG-ASA004',
    hasContract: true,
    
    description: 'Mensalidade Janeiro 2024 - Ana Rodrigues',
    customerName: 'Ana Rodrigues Silva',
    customerDocument: '789.123.456-04',
    reconciledAt: '2024-01-19T09:00:00.000Z',
    reconciledBy: 'user-admin-003',
    
    importedAt: '2024-01-19T09:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-19T09:00:00.000Z'
  },
  {
    id: 'mov-asaas-005',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_321654987',
    
    chargeAmount: undefined,
    paidAmount: 1850.00,
    difference: undefined,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: undefined,
    paymentDate: '2024-01-21T13:30:00.000Z',
    
    contractId: undefined,
    chargeId: undefined,
    hasContract: false,
    
    description: 'Pagamento avulso - Ricardo Santos',
    customerName: 'Ricardo Santos Oliveira',
    customerDocument: '321.654.987-05',
    
    importedAt: '2024-01-21T14:00:00.000Z',
    createdAt: '2024-01-21T13:30:00.000Z',
    updatedAt: '2024-01-21T14:00:00.000Z'
  },
  {
    id: 'mov-asaas-006',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_654987321',
    
    chargeAmount: 3500.00,
    paidAmount: 3450.00,
    difference: -50.00,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.DIVERGENT,
    dueDate: '2024-01-25T00:00:00.000Z',
    paymentDate: '2024-01-23T11:45:00.000Z',
    
    contractId: 'CTR-ASA006',
    chargeId: 'CHG-ASA006',
    hasContract: true,
    
    description: 'Pagamento com desconto - Luciana Costa',
    customerName: 'Luciana Costa Ferreira',
    customerDocument: '654.987.321-06',
    observations: 'Desconto de R$ 50,00 aplicado (pagamento antecipado)',
    
    importedAt: '2024-01-23T12:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-23T12:00:00.000Z'
  },
  {
    id: 'mov-asaas-007',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_147258369',
    
    chargeAmount: 1950.00,
    paidAmount: 1950.00,
    difference: 0,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: '2024-01-30T00:00:00.000Z',
    paymentDate: '2024-01-25T15:20:00.000Z',
    
    contractId: 'CTR-ASA007',
    chargeId: 'CHG-ASA007',
    hasContract: true,
    
    description: 'Mensalidade Janeiro 2024 - Eduardo Martins',
    customerName: 'Eduardo Martins Santos',
    customerDocument: '147.258.369-07',
    
    importedAt: '2024-01-25T16:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-25T16:00:00.000Z'
  },
  {
    id: 'mov-asaas-008',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_369258147',
    
    chargeAmount: 2400.00,
    paidAmount: 2480.00,
    difference: 80.00,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.DIVERGENT,
    dueDate: '2024-01-18T00:00:00.000Z',
    paymentDate: '2024-01-26T09:10:00.000Z',
    
    contractId: 'CTR-ASA008',
    chargeId: 'CHG-ASA008',
    hasContract: true,
    
    description: 'Mensalidade com juros - Gabriela Lima',
    customerName: 'Gabriela Lima Rocha',
    customerDocument: '369.258.147-08',
    observations: 'Diferença de juros: R$ 80,00 (pagamento em atraso)',
    
    importedAt: '2024-01-26T10:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-26T10:00:00.000Z'
  },
  {
    id: 'mov-asaas-009',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_258147369',
    
    chargeAmount: undefined,
    paidAmount: 1100.00,
    difference: undefined,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: undefined,
    paymentDate: '2024-01-28T12:25:00.000Z',
    
    contractId: undefined,
    chargeId: undefined,
    hasContract: false,
    
    description: 'Pagamento avulso - Felipe Almeida',
    customerName: 'Felipe Almeida Costa',
    customerDocument: '258.147.369-09',
    
    importedAt: '2024-01-28T13:00:00.000Z',
    createdAt: '2024-01-28T12:25:00.000Z',
    updatedAt: '2024-01-28T13:00:00.000Z'
  },
  {
    id: 'mov-asaas-010',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ASAAS,
    externalId: 'asaas_pay_741852963',
    
    chargeAmount: 1650.00,
    paidAmount: 1650.00,
    difference: 0,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.RECONCILED,
    dueDate: '2024-01-31T00:00:00.000Z',
    paymentDate: '2024-01-30T14:50:00.000Z',
    
    contractId: 'CTR-ASA010',
    chargeId: 'CHG-ASA010',
    hasContract: true,
    
    description: 'Mensalidade Janeiro 2024 - Mariana Silva',
    customerName: 'Mariana Silva Ferreira',
    customerDocument: '741.852.963-10',
    reconciledAt: '2024-01-30T15:30:00.000Z',
    reconciledBy: 'user-admin-004',
    
    importedAt: '2024-01-30T15:30:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-30T15:30:00.000Z'
  }
];

export const mockMovementsCora: ImportedMovement[] = [
  {
    id: 'mov-cora-001',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654321',
    
    chargeAmount: 2200.00,
    paidAmount: 2250.00,
    difference: 50.00,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.DIVERGENT,
    dueDate: '2024-01-10T00:00:00.000Z',
    paymentDate: '2024-01-12T09:15:00.000Z',
    
    contractId: 'CTR-DEF456',
    chargeId: 'CHG-UVW123',
    hasContract: true,
    
    description: 'Mensalidade com juros - Pedro Almeida',
    customerName: 'Pedro Almeida Ferreira',
    customerDocument: '456.789.123-03',
    observations: 'Diferença de juros: R$ 50,00 (pagamento em atraso)',
    
    importedAt: '2024-01-12T10:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-12T10:00:00.000Z'
  },
  {
    id: 'mov-cora-002',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654322',
    
    chargeAmount: 1800.00,
    paidAmount: 1800.00,
    difference: 0,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.RECONCILED,
    dueDate: '2024-01-15T00:00:00.000Z',
    paymentDate: '2024-01-14T11:30:00.000Z',
    
    contractId: 'CTR-COR002',
    chargeId: 'CHG-COR002',
    hasContract: true,
    
    description: 'Mensalidade Janeiro 2024 - Maria Santos',
    customerName: 'Maria Santos Silva',
    customerDocument: '987.654.321-02',
    reconciledAt: '2024-01-14T12:00:00.000Z',
    reconciledBy: 'user-admin-001',
    
    importedAt: '2024-01-14T12:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-14T12:00:00.000Z'
  },
  {
    id: 'mov-cora-003',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654323',
    
    chargeAmount: undefined,
    paidAmount: 950.00,
    difference: undefined,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: undefined,
    paymentDate: '2024-01-16T14:45:00.000Z',
    
    contractId: undefined,
    chargeId: undefined,
    hasContract: false,
    
    description: 'Pagamento avulso - Ana Costa',
    customerName: 'Ana Costa Oliveira',
    customerDocument: '456.789.123-03',
    
    importedAt: '2024-01-16T15:00:00.000Z',
    createdAt: '2024-01-16T14:45:00.000Z',
    updatedAt: '2024-01-16T15:00:00.000Z'
  },
  {
    id: 'mov-cora-004',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654324',
    
    chargeAmount: 2500.00,
    paidAmount: 2450.00,
    difference: -50.00,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.DIVERGENT,
    dueDate: '2024-01-18T00:00:00.000Z',
    paymentDate: '2024-01-17T08:20:00.000Z',
    
    contractId: 'CTR-COR004',
    chargeId: 'CHG-COR004',
    hasContract: true,
    
    description: 'Pagamento com desconto - Carlos Lima',
    customerName: 'Carlos Lima Ferreira',
    customerDocument: '789.123.456-04',
    observations: 'Desconto de R$ 50,00 aplicado (pagamento antecipado)',
    
    importedAt: '2024-01-17T09:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-17T09:00:00.000Z'
  },
  {
    id: 'mov-cora-005',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654325',
    
    chargeAmount: 1350.00,
    paidAmount: 1350.00,
    difference: 0,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: '2024-01-20T00:00:00.000Z',
    paymentDate: '2024-01-19T16:10:00.000Z',
    
    contractId: 'CTR-COR005',
    chargeId: 'CHG-COR005',
    hasContract: true,
    
    description: 'Mensalidade Janeiro 2024 - Fernanda Rocha',
    customerName: 'Fernanda Rocha Santos',
    customerDocument: '321.654.987-05',
    
    importedAt: '2024-01-19T17:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-19T17:00:00.000Z'
  },
  {
    id: 'mov-cora-006',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654326',
    
    chargeAmount: 3200.00,
    paidAmount: 3280.00,
    difference: 80.00,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.DIVERGENT,
    dueDate: '2024-01-12T00:00:00.000Z',
    paymentDate: '2024-01-22T13:25:00.000Z',
    
    contractId: 'CTR-COR006',
    chargeId: 'CHG-COR006',
    hasContract: true,
    
    description: 'Mensalidade com juros - Roberto Silva',
    customerName: 'Roberto Silva Costa',
    customerDocument: '654.987.321-06',
    observations: 'Diferença de juros: R$ 80,00 (pagamento em atraso)',
    
    importedAt: '2024-01-22T14:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-22T14:00:00.000Z'
  },
  {
    id: 'mov-cora-007',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654327',
    
    chargeAmount: 1750.00,
    paidAmount: 1750.00,
    difference: 0,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.RECONCILED,
    dueDate: '2024-01-25T00:00:00.000Z',
    paymentDate: '2024-01-24T10:15:00.000Z',
    
    contractId: 'CTR-COR007',
    chargeId: 'CHG-COR007',
    hasContract: true,
    
    description: 'Mensalidade Janeiro 2024 - Juliana Martins',
    customerName: 'Juliana Martins Oliveira',
    customerDocument: '147.258.369-07',
    reconciledAt: '2024-01-24T11:00:00.000Z',
    reconciledBy: 'user-admin-002',
    
    importedAt: '2024-01-24T11:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-24T11:00:00.000Z'
  },
  {
    id: 'mov-cora-008',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654328',
    
    chargeAmount: undefined,
    paidAmount: 680.00,
    difference: undefined,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: undefined,
    paymentDate: '2024-01-26T15:40:00.000Z',
    
    contractId: undefined,
    chargeId: undefined,
    hasContract: false,
    
    description: 'Pagamento avulso - Diego Almeida',
    customerName: 'Diego Almeida Santos',
    customerDocument: '369.258.147-08',
    
    importedAt: '2024-01-26T16:00:00.000Z',
    createdAt: '2024-01-26T15:40:00.000Z',
    updatedAt: '2024-01-26T16:00:00.000Z'
  },
  {
    id: 'mov-cora-009',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654329',
    
    chargeAmount: 2100.00,
    paidAmount: 2100.00,
    difference: 0,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: '2024-01-28T00:00:00.000Z',
    paymentDate: '2024-01-27T12:30:00.000Z',
    
    contractId: 'CTR-COR009',
    chargeId: 'CHG-COR009',
    hasContract: true,
    
    description: 'Mensalidade Janeiro 2024 - Patrícia Lima',
    customerName: 'Patrícia Lima Ferreira',
    customerDocument: '258.147.369-09',
    
    importedAt: '2024-01-27T13:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-27T13:00:00.000Z'
  },
  {
    id: 'mov-cora-010',
    tenantId: 'tenant-1',
    source: ReconciliationSource.CORA,
    externalId: 'cor_tx_987654330',
    
    chargeAmount: 1450.00,
    paidAmount: 1520.00,
    difference: 70.00,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.DIVERGENT,
    dueDate: '2024-01-22T00:00:00.000Z',
    paymentDate: '2024-01-29T09:45:00.000Z',
    
    contractId: 'CTR-COR010',
    chargeId: 'CHG-COR010',
    hasContract: true,
    
    description: 'Mensalidade com juros - Bruno Costa',
    customerName: 'Bruno Costa Silva',
    customerDocument: '741.852.963-10',
    observations: 'Diferença de juros: R$ 70,00 (pagamento em atraso)',
    
    importedAt: '2024-01-29T10:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-29T10:00:00.000Z'
  }
];

export const mockMovementsItau: ImportedMovement[] = [
  {
    id: 'mov-itau-001',
    tenantId: 'tenant-1',
    source: ReconciliationSource.ITAU,
    externalId: 'ita_341_123456789',
    
    chargeAmount: 3500.00,
    paidAmount: 3450.00,
    difference: -50.00,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.DIVERGENT,
    dueDate: '2024-01-20T00:00:00.000Z',
    paymentDate: '2024-01-18T16:45:00.000Z',
    
    contractId: 'CTR-GHI789',
    chargeId: 'CHG-RST456',
    hasContract: true,
    
    description: 'Pagamento com desconto - Ana Paula',
    customerName: 'Ana Paula Rodrigues',
    customerDocument: '789.123.456-04',
    observations: 'Desconto de R$ 50,00 aplicado (pagamento antecipado)',
    
    importedAt: '2024-01-18T17:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-18T17:00:00.000Z'
  }
];

export const mockMovementsStone: ImportedMovement[] = [
  {
    id: 'mov-stone-001',
    tenantId: 'tenant-1',
    source: ReconciliationSource.STONE,
    externalId: 'sto_card_789123456',
    
    chargeAmount: undefined,
    paidAmount: 1200.00,
    difference: undefined,
    currency: 'BRL',
    
    paymentStatus: PaymentStatus.PAID,
    reconciliationStatus: ReconciliationStatus.PENDING,
    dueDate: undefined,
    paymentDate: '2024-01-16T12:30:00.000Z',
    
    contractId: undefined,
    chargeId: undefined,
    hasContract: false,
    
    description: 'Pagamento cartão - Carlos Eduardo',
    customerName: 'Carlos Eduardo Lima',
    customerDocument: '321.654.987-05',
    
    importedAt: '2024-01-16T13:00:00.000Z',
    createdAt: '2024-01-16T12:30:00.000Z',
    updatedAt: '2024-01-16T13:00:00.000Z'
  }
];

// =====================================================
// COMBINED MOCK DATA
// =====================================================

export const mockReconciliationMovements: ImportedMovement[] = [
  ...mockMovementsAsaas,
  ...mockMovementsCora,
  // Removendo outras integrações para focar apenas em Asaas e Cora
];

// =====================================================
// MOCK INDICATORS
// =====================================================

export const generateMockIndicators = (movements: ImportedMovement[]): ReconciliationIndicators => {
  const notReconciled = movements.filter(m => m.reconciliationStatus === ReconciliationStatus.PENDING).length;
  const reconciledThisMonth = movements.filter(m => {
    if (m.reconciliationStatus !== ReconciliationStatus.RECONCILED || !m.reconciledAt) return false;
    const reconciledDate = new Date(m.reconciledAt);
    const currentDate = new Date();
    return reconciledDate.getMonth() === currentDate.getMonth() && 
           reconciledDate.getFullYear() === currentDate.getFullYear();
  }).length;
  
  const valueDifferences = movements.filter(m => 
    m.reconciliationStatus === ReconciliationStatus.DIVERGENT
  ).length;
  
  const totalAmount = movements.reduce((sum, m) => sum + m.paidAmount, 0);

  return {
    notReconciled,
    reconciledThisMonth,
    valueDifferences,
    totalAmount
  };
};

export const mockReconciliationIndicators: ReconciliationIndicators = generateMockIndicators(mockReconciliationMovements);

// =====================================================
// FILTER HELPERS
// =====================================================

export const filterMockMovements = (
  movements: ImportedMovement[],
  filters: {
    status?: ReconciliationStatus | 'ALL';
    source?: ReconciliationSource | 'ALL';
    hasContract?: 'WITH_CONTRACT' | 'WITHOUT_CONTRACT' | 'ALL';
    search?: string;
  }
): ImportedMovement[] => {
  return movements.filter(movement => {
    // Status filter
    if (filters.status && filters.status !== 'ALL' && movement.reconciliationStatus !== filters.status) {
      return false;
    }

    // Source filter
    if (filters.source && filters.source !== 'ALL' && movement.source !== filters.source) {
      return false;
    }

    // Contract filter
    if (filters.hasContract && filters.hasContract !== 'ALL') {
      if (filters.hasContract === 'WITH_CONTRACT' && !movement.hasContract) return false;
      if (filters.hasContract === 'WITHOUT_CONTRACT' && movement.hasContract) return false;
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      const searchableFields = [
        movement.customerName,
        movement.customerDocument,
        movement.externalId,
        movement.contractId,
        movement.description
      ].filter(Boolean).map(field => field!.toLowerCase());

      if (!searchableFields.some(field => field.includes(searchTerm))) {
        return false;
      }
    }

    return true;
  });
};