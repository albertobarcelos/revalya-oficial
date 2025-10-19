[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: undefined, contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
📊 ContractBasicInfo - Estado do contractData: 
Object { isLoadingContract: false, contractData: null, hasCustomer: false, customerFromContract: undefined }
ContractBasicInfo.tsx:48:13
🔄 [SYNC] Tenant alterado, sincronizando contexto: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:55:21
🔧 [INIT] Inicializando contexto do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:34:21
🔍 ContractServices: Hook useServices retornou: 
Object { services: 17, isLoading: false, firstService: {…} }
ContractServices.tsx:119:17
🔄 ContractServices: Detectada mudança nos serviços do formulário: 0 ContractServices.tsx:137:17
📝 ContractServices: Nenhum serviço encontrado no formulário ContractServices.tsx:147:21
🔄 ContractFormProvider: Carregando contrato ID: 0431fef1-397e-4d92-b4ff-a88d19d23d26 ContractFormProvider.tsx:133:21
🔄 Iniciando carregamento otimizado do contrato: 0431fef1-397e-4d92-b4ff-a88d19d23d26 useContractEdit.ts:28:21
🔍 [AUDIT] Carregando contrato para tenant: nexsyn (8d2888f1-64a5-445f-84f5-2614d5160251) useContractEdit.ts:29:21
💰 Totais recalculados: 
Object { subtotal: 0, discount: 0, tax: 0, total: 0 }
 para 0 serviços e 0 produtos com desconto do contrato: 0 ContractFormProvider.tsx:179:17
🔄 [SYNC] Tenant alterado, sincronizando contexto: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:55:21
🔧 [INIT] Inicializando contexto do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:34:21
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: undefined, contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
💰 Totais recalculados: 
Object { subtotal: 0, discount: 0, tax: 0, total: 0 }
 para 0 serviços e 0 produtos com desconto do contrato: 0 ContractFormProvider.tsx:179:17
✅ [INIT] Contexto RPC configurado com sucesso para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useContracts.ts:327:21
✅ [INIT] Contexto do tenant inicializado com sucesso useServices.ts:42:21
✅ [INIT] Contexto RPC configurado com sucesso para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 2 useContracts.ts:327:21
✅ [INIT] Contexto do tenant inicializado com sucesso useServices.ts:42:21
✅ Dados carregados: 
Object { contract: "20250331", servicesCount: 1, productsCount: 0, customer: undefined }
useContractEdit.ts:86:21
🔧 Formatando serviços carregados do banco: 
Array [ {…} ]
useContractEdit.ts:93:21
📋 Serviço formatado com mapeamento reverso: 
Object { original: {…}, mapped: {…} }
useContractEdit.ts:175:25
✅ Total de serviços formatados: 1 useContractEdit.ts:199:21
🔧 Formatando produtos carregados do banco: 
Array []
useContractEdit.ts:201:21
✅ Total de produtos formatados: 0 useContractEdit.ts:268:21
📝 Populando formulário com dados: 
Object { customer_id: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contract_number: "20250331", initial_date: Date Thu Aug 15 2024 00:00:00 GMT-0400 (Horário Padrão do Amazonas), final_date: Date Sat Aug 15 2026 00:00:00 GMT-0400 (Horário Padrão do Amazonas), billing_type: "Mensal", billing_day: 1, anticipate_weekends: true, installments: 1, description: "", internal_notes: "", … }
useContractEdit.ts:289:21
🎉 Contrato carregado e formulário populado com sucesso! useContractEdit.ts:305:21
📋 Serviços carregados: 1 useContractEdit.ts:306:21
📦 Produtos carregados: 0 useContractEdit.ts:307:21
✅ ContractFormProvider: Contrato carregado, dados do formulário: 
Object { customer_id: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contract_number: "20250331", initial_date: Date Thu Aug 15 2024 00:00:00 GMT-0400 (Horário Padrão do Amazonas), final_date: Date Sat Aug 15 2026 00:00:00 GMT-0400 (Horário Padrão do Amazonas), billing_type: "Mensal", billing_day: 1, anticipate_weekends: true, installments: 1, description: "", internal_notes: "", … }
ContractFormProvider.tsx:138:25
📋 ContractFormProvider: Serviços no formulário após carregamento: 1 
Array [ {…} ]
ContractFormProvider.tsx:140:25
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
📊 ContractBasicInfo - Estado do contractData: 
Object { isLoadingContract: false, contractData: {…}, hasCustomer: false, customerFromContract: undefined }
ContractBasicInfo.tsx:48:13
❌ Cliente não encontrado no array customers ContractBasicInfo.tsx:87:15
🔄 [SYNC] Tenant alterado, sincronizando contexto: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:55:21
🔧 [INIT] Inicializando contexto do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:34:21
🔍 ContractServices: Hook useServices retornou: 
Object { services: 17, isLoading: false, firstService: {…} }
ContractServices.tsx:119:17
🔄 ContractServices: Detectada mudança nos serviços do formulário: 1 ContractServices.tsx:137:17
✅ ContractServices: Carregando serviços no estado local: 
Array [ {…} ]
ContractServices.tsx:144:21
💰 Totais recalculados: 
Object { subtotal: 280, discount: 0, tax: 0, total: 280 }
 para 1 serviços e 0 produtos com desconto do contrato: 0 ContractFormProvider.tsx:179:17
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
💰 Totais recalculados: 
Object { subtotal: 0, discount: 0, tax: 0, total: 0 }
 para 0 serviços e 0 produtos com desconto do contrato: 0 ContractFormProvider.tsx:179:17
🔍 Verificação pós-reset - Serviços no formulário: 0 
Array []
useContractEdit.ts:294:25
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
💰 Totais recalculados: 
Object { subtotal: 280, discount: 0, tax: 0, total: 280 }
 para 1 serviços e 0 produtos com desconto do contrato: 0 ContractFormProvider.tsx:179:17
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
[DEBUG] useSecureProducts - URL atual: http://localhost:8082/nexsyn/contratos?id=0431fef1-397e-4d92-b4ff-a88d19d23d26&mode=edit useSecureProducts.ts:16:13
[DEBUG] useSecureProducts - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn", active: true, created_at: "2025-10-19T05:58:05.965Z", updated_at: "2025-10-19T05:58:05.965Z" }
useSecureProducts.ts:17:13
[DEBUG] useSecureProducts - hasAccess: true useSecureProducts.ts:18:13
🎯 Campo Cliente - Debug: 
Object { selectedClient: null, selectedClientName: undefined, customerId: "913c4b6e-22c0-4b26-8646-b6dbff29f78c", contractCustomer: undefined, displayValue: "" }
ContractBasicInfo.tsx:171:31
✅ [INIT] Contexto RPC configurado com sucesso para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useContracts.ts:327:21
✅ [INIT] Contexto RPC configurado com sucesso para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useContracts.ts:327:21
✅ [INIT] Contexto do tenant inicializado com sucesso useServices.ts:42:21
✅ [INIT] Contexto RPC configurado com sucesso para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useContracts.ts:327:21
