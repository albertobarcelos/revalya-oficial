/**
 * AIDEV-NOTE: Step de seleção de cliente
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientSearch } from '@/components/contracts/parts/ClientSearch';
import { ClientCreation } from '@/components/contracts/parts/ClientCreation';
import type { Customer } from '@/hooks/useCustomers';

interface CustomerStepProps {
  selectedCustomer: Customer | null;
  showClientSearch: boolean;
  showCreateClient: boolean;
  onShowClientSearch: (show: boolean) => void;
  onShowCreateClient: (show: boolean) => void;
  onClientSelect: (client: any) => void;
  onClientCreated: (clientData: { id: string; name: string; document: string; email?: string; phone?: string }) => void;
  error?: string;
}

/**
 * Step de seleção de cliente
 */
export function CustomerStep({
  selectedCustomer,
  showClientSearch,
  showCreateClient,
  onShowClientSearch,
  onShowCreateClient,
  onClientSelect,
  onClientCreated,
  error,
}: CustomerStepProps) {
  return (
    <motion.div
      key="customer"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="customer">Cliente *</Label>
        <Input
          id="customer"
          readOnly
          value={selectedCustomer ? selectedCustomer.name : ''}
          placeholder="Selecione um cliente"
          onClick={() => onShowClientSearch(true)}
          className="cursor-pointer"
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>

      {selectedCustomer && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <p className="font-medium">{selectedCustomer.name}</p>
          {selectedCustomer.company && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Empresa:</span> {selectedCustomer.company}
            </p>
          )}
          {selectedCustomer.cpf_cnpj && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">CPF/CNPJ:</span> {String(selectedCustomer.cpf_cnpj)}
            </p>
          )}
          {selectedCustomer.email && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span> {selectedCustomer.email}
            </p>
          )}
        </div>
      )}

      <ClientSearch
        open={showClientSearch}
        onOpenChange={onShowClientSearch}
        clients={[]}
        onClientSelect={onClientSelect}
        onCreateClient={() => {
          onShowClientSearch(false);
          onShowCreateClient(true);
        }}
      />

      <ClientCreation
        open={showCreateClient}
        onOpenChange={onShowCreateClient}
        onClientCreated={onClientCreated}
      />
    </motion.div>
  );
}
