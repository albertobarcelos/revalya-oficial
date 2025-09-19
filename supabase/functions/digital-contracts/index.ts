// =====================================================
// EDGE FUNCTION: Digital Contracts
// Descrição: Gerenciamento completo de contratos digitais
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getAllHeaders, getErrorHeaders, getSuccessHeaders } from '../_shared/cors.ts';
import { validateRequest, ValidationOptions } from '../_shared/validation.ts';
import { createEmailService } from '../_shared/email.ts';
import { createSMSService } from '../_shared/sms.ts';
import { createPushNotificationService } from '../_shared/push.ts';

// Types for digital contracts
interface ContractRequest {
  action: 'create' | 'sign' | 'get' | 'list' | 'update_status' | 'add_signature' | 'send_reminder';
  contractData?: {
    title: string;
    content: string;
    contractType: 'SERVICE' | 'PURCHASE' | 'EMPLOYMENT' | 'NDA' | 'OTHER';
    signatories: Signatory[];
    expiresAt?: string;
    metadata?: Record<string, any>;
    requiresWitness?: boolean;
    allowPartialSigning?: boolean;
  };
  contractId?: string;
  signatureData?: {
    signatoryEmail: string;
    signatureType: 'DIGITAL' | 'ELECTRONIC' | 'BIOMETRIC';
    signatureData: string;
    ipAddress?: string;
    userAgent?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    witnessEmail?: string;
  };
  filters?: {
    status?: string;
    contractType?: string;
    dateFrom?: string;
    dateTo?: string;
    signatoryEmail?: string;
  };
  reminderData?: {
    signatoryEmail: string;
    message?: string;
    channels: ('email' | 'sms' | 'push')[];
  };
}

interface Signatory {
  email: string;
  name: string;
  role: 'SIGNER' | 'WITNESS' | 'APPROVER';
  phone?: string;
  required: boolean;
  order?: number;
}

interface ContractResponse {
  id: string;
  contractNumber: string;
  title: string;
  content: string;
  contractType: string;
  status: string;
  signatories: Signatory[];
  signatures: any[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
  progress: {
    totalSignatories: number;
    signedCount: number;
    pendingCount: number;
    percentComplete: number;
  };
}

// Contract management class
class ContractManager {
  private supabase: any;
  private emailService: any;
  private smsService: any;
  private pushService: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.emailService = createEmailService();
    this.smsService = createSMSService();
    this.pushService = createPushNotificationService();
  }

  async createContract(
    contractData: ContractRequest['contractData'],
    tenantId: string,
    userId: string
  ): Promise<ContractResponse> {
    if (!contractData) {
      throw new Error('Contract data is required');
    }

    // Validate signatories
    if (!contractData.signatories || contractData.signatories.length === 0) {
      throw new Error('At least one signatory is required');
    }

    // Create contract in database
    const { data: contract, error } = await this.supabase
      .rpc('create_digital_contract', {
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_title: contractData.title,
        p_content: contractData.content,
        p_contract_type: contractData.contractType,
        p_signatories: contractData.signatories,
        p_expires_at: contractData.expiresAt,
        p_metadata: contractData.metadata || {},
        p_requires_witness: contractData.requiresWitness || false,
        p_allow_partial_signing: contractData.allowPartialSigning || false,
      });

    if (error) {
      throw new Error(`Failed to create contract: ${error.message}`);
    }

    // Send notifications to signatories
    await this.notifySignatories(contract, 'contract_created');

    return this.formatContractResponse(contract);
  }

  async signContract(
    contractId: string,
    signatureData: ContractRequest['signatureData'],
    tenantId: string,
    userId: string
  ): Promise<ContractResponse> {
    if (!signatureData) {
      throw new Error('Signature data is required');
    }

    // Get contract details
    const { data: contract, error: contractError } = await this.supabase
      .rpc('get_digital_contract_details', {
        p_contract_id: contractId,
        p_tenant_id: tenantId,
      });

    if (contractError || !contract) {
      throw new Error('Contract not found or access denied');
    }

    // Validate signatory
    const signatory = contract.signatories.find(
      (s: Signatory) => s.email === signatureData.signatoryEmail
    );

    if (!signatory) {
      throw new Error('Signatory not authorized for this contract');
    }

    // Check if already signed
    const existingSignature = contract.signatures.find(
      (s: any) => s.signatory_email === signatureData.signatoryEmail
    );

    if (existingSignature) {
      throw new Error('Contract already signed by this signatory');
    }

    // Add signature
    const { data: signature, error: signError } = await this.supabase
      .rpc('sign_contract', {
        p_contract_id: contractId,
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_signatory_email: signatureData.signatoryEmail,
        p_signature_type: signatureData.signatureType,
        p_signature_data: signatureData.signatureData,
        p_ip_address: signatureData.ipAddress,
        p_user_agent: signatureData.userAgent,
        p_location: signatureData.location,
        p_witness_email: signatureData.witnessEmail,
      });

    if (signError) {
      throw new Error(`Failed to sign contract: ${signError.message}`);
    }

    // Get updated contract
    const { data: updatedContract } = await this.supabase
      .rpc('get_digital_contract_details', {
        p_contract_id: contractId,
        p_tenant_id: tenantId,
      });

    // Send notifications
    await this.notifySignatories(updatedContract, 'contract_signed', {
      signerName: signatory.name,
      signerEmail: signatory.email,
    });

    return this.formatContractResponse(updatedContract);
  }

  async getContract(contractId: string, tenantId: string): Promise<ContractResponse> {
    const { data: contract, error } = await this.supabase
      .rpc('get_digital_contract_details', {
        p_contract_id: contractId,
        p_tenant_id: tenantId,
      });

    if (error || !contract) {
      throw new Error('Contract not found or access denied');
    }

    return this.formatContractResponse(contract);
  }

  async listContracts(
    filters: ContractRequest['filters'],
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ contracts: ContractResponse[]; total: number }> {
    let query = this.supabase
      .from('digital_contracts')
      .select('*, digital_contract_signatures(*)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.contractType) {
      query = query.eq('contract_type', filters.contractType);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.signatoryEmail) {
      query = query.contains('signatories', [{ email: filters.signatoryEmail }]);
    }

    const { data: contracts, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list contracts: ${error.message}`);
    }

    return {
      contracts: contracts.map((contract: any) => this.formatContractResponse(contract)),
      total: count || 0,
    };
  }

  async sendReminder(
    contractId: string,
    reminderData: ContractRequest['reminderData'],
    tenantId: string
  ): Promise<{ success: boolean; sent: string[] }> {
    if (!reminderData) {
      throw new Error('Reminder data is required');
    }

    // Get contract details
    const contract = await this.getContract(contractId, tenantId);
    
    // Find signatory
    const signatory = contract.signatories.find(
      (s: Signatory) => s.email === reminderData.signatoryEmail
    );

    if (!signatory) {
      throw new Error('Signatory not found');
    }

    // Check if already signed
    const alreadySigned = contract.signatures.some(
      (s: any) => s.signatory_email === reminderData.signatoryEmail
    );

    if (alreadySigned) {
      throw new Error('Contract already signed by this signatory');
    }

    const sent: string[] = [];
    const templateData = {
      signatoryName: signatory.name,
      contractTitle: contract.title,
      contractNumber: contract.contractNumber,
      expiresAt: contract.expiresAt,
      customMessage: reminderData.message,
    };

    // Send email reminder
    if (reminderData.channels.includes('email')) {
      try {
        await this.emailService.sendEmail({
          to: [{ email: signatory.email, name: signatory.name }],
          template: 'contract_reminder',
          data: templateData,
        });
        sent.push('email');
      } catch (error) {
        console.error('Failed to send email reminder:', error);
      }
    }

    // Send SMS reminder
    if (reminderData.channels.includes('sms') && signatory.phone) {
      try {
        await this.smsService.sendSMS({
          to: signatory.phone,
          template: 'contract_reminder',
          data: templateData,
        });
        sent.push('sms');
      } catch (error) {
        console.error('Failed to send SMS reminder:', error);
      }
    }

    // Send push notification
    if (reminderData.channels.includes('push')) {
      try {
        await this.pushService.sendNotification({
          userId: signatory.email, // Using email as user identifier
          template: 'contract_reminder',
          data: templateData,
        });
        sent.push('push');
      } catch (error) {
        console.error('Failed to send push reminder:', error);
      }
    }

    return { success: sent.length > 0, sent };
  }

  private async notifySignatories(
    contract: any,
    event: 'contract_created' | 'contract_signed',
    eventData?: Record<string, any>
  ): Promise<void> {
    const templateData = {
      contractTitle: contract.title,
      contractNumber: contract.contract_number,
      expiresAt: contract.expires_at,
      ...eventData,
    };

    for (const signatory of contract.signatories) {
      // Skip if already signed (for contract_signed event)
      if (event === 'contract_signed') {
        const alreadySigned = contract.signatures?.some(
          (s: any) => s.signatory_email === signatory.email
        );
        if (alreadySigned) continue;
      }

      const personalizedData = {
        ...templateData,
        signatoryName: signatory.name,
      };

      // Send email notification
      try {
        await this.emailService.sendEmail({
          to: [{ email: signatory.email, name: signatory.name }],
          template: event,
          data: personalizedData,
        });
      } catch (error) {
        console.error(`Failed to send email to ${signatory.email}:`, error);
      }

      // Send SMS if phone is available
      if (signatory.phone) {
        try {
          await this.smsService.sendSMS({
            to: signatory.phone,
            template: event,
            data: personalizedData,
          });
        } catch (error) {
          console.error(`Failed to send SMS to ${signatory.phone}:`, error);
        }
      }
    }
  }

  private formatContractResponse(contract: any): ContractResponse {
    const signatures = contract.digital_contract_signatures || contract.signatures || [];
    const totalSignatories = contract.signatories?.length || 0;
    const signedCount = signatures.length;
    const pendingCount = totalSignatories - signedCount;
    const percentComplete = totalSignatories > 0 ? (signedCount / totalSignatories) * 100 : 0;

    return {
      id: contract.id,
      contractNumber: contract.contract_number,
      title: contract.title,
      content: contract.content,
      contractType: contract.contract_type,
      status: contract.status,
      signatories: contract.signatories || [],
      signatures: signatures,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
      expiresAt: contract.expires_at,
      metadata: contract.metadata,
      progress: {
        totalSignatories,
        signedCount,
        pendingCount,
        percentComplete: Math.round(percentComplete),
      },
    };
  }
}

// Main handler function
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request
    const validationOptions: ValidationOptions = {
      allowedMethods: ['POST', 'GET'],
      requireAuth: true,
      requireTenant: true,
      allowedRoles: ['ADMIN', 'CONTRACT_MANAGER', 'FINANCIAL_MANAGER'],
      maxBodySize: 5 * 1024 * 1024, // 5MB for contract content
    };

    const validation = await validateRequest(req, validationOptions);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: validation.status || 400, 
          headers: getErrorHeaders(validation.status) 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contractManager = new ContractManager(supabase);

    let result: any;

    if (req.method === 'GET') {
      // Handle GET requests (list contracts or get specific contract)
      const url = new URL(req.url);
      const contractId = url.searchParams.get('id');
      
      if (contractId) {
        // Get specific contract
        result = await contractManager.getContract(contractId, validation.tenantId!);
      } else {
        // List contracts with filters
        const filters = {
          status: url.searchParams.get('status') || undefined,
          contractType: url.searchParams.get('contractType') || undefined,
          dateFrom: url.searchParams.get('dateFrom') || undefined,
          dateTo: url.searchParams.get('dateTo') || undefined,
          signatoryEmail: url.searchParams.get('signatoryEmail') || undefined,
        };
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        result = await contractManager.listContracts(filters, validation.tenantId!, limit, offset);
      }
    } else {
      // Handle POST requests
      const body: ContractRequest = await req.json();
      
      if (!body.action) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: action' }),
          { status: 400, headers: getErrorHeaders(400) }
        );
      }

      switch (body.action) {
        case 'create':
          result = await contractManager.createContract(
            body.contractData!,
            validation.tenantId!,
            validation.user!.id
          );
          break;

        case 'sign':
          if (!body.contractId) {
            throw new Error('Contract ID is required for signing');
          }
          result = await contractManager.signContract(
            body.contractId,
            body.signatureData!,
            validation.tenantId!,
            validation.user!.id
          );
          break;

        case 'get':
          if (!body.contractId) {
            throw new Error('Contract ID is required');
          }
          result = await contractManager.getContract(body.contractId, validation.tenantId!);
          break;

        case 'list':
          result = await contractManager.listContracts(
            body.filters || {},
            validation.tenantId!,
            50,
            0
          );
          break;

        case 'send_reminder':
          if (!body.contractId) {
            throw new Error('Contract ID is required for sending reminders');
          }
          result = await contractManager.sendReminder(
            body.contractId,
            body.reminderData!,
            validation.tenantId!
          );
          break;

        default:
          throw new Error(`Unsupported action: ${body.action}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: getSuccessHeaders() 
      }
    );

  } catch (error) {
    console.error('Digital contracts error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: getErrorHeaders(500) 
      }
    );
  }
});