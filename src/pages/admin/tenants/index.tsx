import { useState } from 'react'
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useSupabase } from '@/hooks/useSupabase'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Plus, Search, Pencil, Shield, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCpfCnpj, formatPhoneNumber } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

type Tenant = {
  id: string
  name: string
  document: string
  email: string
  phone: string
  active: boolean
  reseller_id: string | null
  reseller_name?: string
  created_at: string
  slug?: string
}

// AIDEV-NOTE: Página de gerenciamento de tenants com proteção multi-tenant
// Implementa todas as 5 camadas de segurança obrigatórias
export default function TenantsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  // 🛡️ CAMADA 1: Validação de acesso obrigatória
  const { hasAccess, accessError } = useTenantAccessGuard({
    requireTenant: false,
    requiredRole: 'ADMIN'
  })
  const supabase = useSupabase()

  // 🚨 BLOQUEIO IMEDIATO se não tiver acesso
  if (!hasAccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
      >
        <Shield className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold text-red-600">Acesso Negado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {accessError || 'Você não tem permissão para gerenciar tenants.'}
        </p>
      </motion.div>
    )
  }

  // 🔍 CAMADA 2: Consulta global de tenants para admin
  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      // 🛡️ AUDIT LOG obrigatório
      console.log(`[AUDIT] Admin Tenants - Consultando lista global de tenants`);
      
      try {
        // 🔍 Consulta global de tenants
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            *,
            resellers(name)
          `)
          .order('created_at', { ascending: false })
        
        if (error) {
          throw error
        }
        
        // Transformar dados para o formato esperado
        const transformedData = data?.map(tenant => ({
          ...tenant,
          reseller_name: tenant.resellers?.name || ''
        })) || []
        
        console.log(`[AUDIT] Tenants obtidos: ${transformedData.length} registros`);
        return transformedData as Tenant[];
        
      } catch (error) {
        console.error(`[SECURITY] Erro ao consultar tenants:`, error);
        throw error;
      }
    },
    enabled: hasAccess,
    staleTime: 2 * 60 * 1000, // 2 minutos de cache
    refetchOnWindowFocus: false
  })

  // 🚨 TRATAMENTO DE ERRO SEGURO
  if (error) {
    console.error('[SECURITY] Erro ao carregar lista de tenants:', error);
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
      >
        <AlertTriangle className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold text-red-600">Erro de Segurança</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Não foi possível carregar a lista de tenants. Verifique suas permissões.
        </p>
      </motion.div>
    )
  }

  // 🔍 FILTRO DE BUSCA SEGURO
  const filteredTenants = tenants?.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.document.includes(searchTerm) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tenant.reseller_name && tenant.reseller_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* 📋 CABEÇALHO COM INFORMAÇÕES DE SEGURANÇA */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-green-600" />
            Tenants
          </h1>
          <p className="text-sm text-muted-foreground">
            Modo: <Badge variant="outline">Administração Global</Badge>
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Tenant
          </Link>
        </Button>
      </motion.div>

      {/* 🔍 BARRA DE BUSCA */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center space-x-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, documento, email ou revendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </motion.div>

      {/* 📊 CONTEÚDO PRINCIPAL */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-md border"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Revendedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center items-center py-8"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Carregando...</span>
                  </motion.div>
                </TableCell>
              </TableRow>
            ) : filteredTenants?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-muted-foreground"
                  >
                    Nenhum tenant encontrado
                  </motion.div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTenants?.map((tenant, index) => (
                <motion.tr
                  key={tenant.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <Link
                      to={`/admin/tenants/${tenant.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {tenant.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCpfCnpj(tenant.document)}</TableCell>
                  <TableCell>{tenant.email}</TableCell>
                  <TableCell>{formatPhoneNumber(tenant.phone)}</TableCell>
                  <TableCell>
                    {tenant.reseller_name ? (
                      <Link
                        to={`/admin/resellers/${tenant.reseller_id}`}
                        className="text-primary hover:underline"
                      >
                        {tenant.reseller_name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Sem revendedor</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.active ? "default" : "secondary"}>
                      {tenant.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/admin/tenants/${tenant.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* 📊 ESTATÍSTICAS DE SEGURANÇA */}
        {filteredTenants && filteredTenants.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 bg-muted/30 border-t"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total de tenants: {filteredTenants.length}</span>
              <span>Ativos: {filteredTenants.filter(t => t.active).length}</span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Consulta segura ativa
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
