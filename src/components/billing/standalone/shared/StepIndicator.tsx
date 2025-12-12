/**
 * AIDEV-NOTE: Indicador de progresso dos steps do wizard
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { CheckCircle, User, Package, CreditCard } from 'lucide-react';
import type { StandaloneBillingStep, StepConfig } from '@/types/billing/standalone';

interface StepIndicatorProps {
  currentStep: StandaloneBillingStep;
  steps: StepConfig[];
}

/**
 * Indicador de progresso dos steps
 */
export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="px-6 py-4 border-b bg-gray-50">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted = currentIndex > index;
          
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2
                  ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : ''}
                  ${isCompleted ? 'border-green-600 bg-green-50 text-green-600' : ''}
                  ${!isActive && !isCompleted ? 'border-gray-300 bg-white text-gray-400' : ''}
                `}>
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : step.icon}
                </div>
                <span className={`
                  ml-2 text-sm font-medium
                  ${isActive ? 'text-blue-600' : ''}
                  ${isCompleted ? 'text-green-600' : ''}
                  ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                `}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-4
                  ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
