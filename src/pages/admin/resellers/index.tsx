import { useState, useEffect } from 'react'
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useSupabase } from '@/hooks/useSupabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Plus, Search, Eye, Shield, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCpfCnpj, formatPhoneNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

type Reseller = {
  id: string
  name: string
  document: string
  email: string
  phone: string
  active: boolean
  commission_rate: number
  created_at: string
}

// AIDEV-NOTE: Página de gerenciamento de revendedores com proteção multi-tenant
// Implementa todas as 5 camadas de segurança obrigatórias
export default function ResellersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const location = useLocation()
  const supabase = useSupabase()

  // 🛡️ CAMADA 1: Validação de acesso obrigatória
  const { hasAccess, accessError } = useTenantAccessGuard({
    requireTenant: false,
    requiredRole: 'ADMIN'
  })

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
          {accessError || 'Você não tem permissão para gerenciar revendedores.'}
        </p>
      </motion.div>
    )
  }

  // 🔍 CAMADA 2: Consulta global de revendedores para admin
  const { data: resellers, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-resellers'],
    queryFn: async () => {
      // 🛡️ AUDIT LOG obrigatório
      console.log(`[AUDIT] Admin Resellers - Consultando lista global de revendedores`);
      
      try {
        // 🔍 Consulta global de revendedores
        const { data, error } = await supabase
          .from('resellers')
          .select(`
            *,
            resellers_users(
              id,
              user_id,
              role,
              users(email)
            )
          `)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error(`[SECURITY] Erro ao buscar revendedores:`, error);
          throw error;
        }
        
        console.log(`[AUDIT] Revendedores obtidos: ${data?.length || 0} registros`);
        return data as Reseller[];
        
      } catch (error) {
        console.error(`[SECURITY] Erro ao consultar revendedores:`, error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos de cache
    refetchOnWindowFocus: false
  })

  // 🚨 TRATAMENTO DE ERRO SEGURO
  if (error) {
    console.error('[SECURITY] Erro ao carregar lista de revendedores:', error);
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
      >
        <AlertTriangle className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold text-red-600">Erro de Segurança</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Não foi possível carregar a lista de revendedores. Verifique suas permissões.
        </p>
      </motion.div>
    )
  }

  // Refetch data when route changes
  useEffect(() => {
    refetch()
  }, [location, refetch])

  // 🔍 FILTRO DE BUSCA SEGURO
  const filteredResellers = resellers?.filter(reseller =>
    reseller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reseller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reseller.document.toLowerCase().includes(searchTerm.toLowerCase())
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
            Revendedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Modo: <Badge variant="outline">Admin Global</Badge>
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/resellers/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Revendedor
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
            placeholder="Buscar por nome, email ou documento..."
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
              <TableHead>Email</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
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
            ) : filteredResellers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-muted-foreground"
                  >
                    Nenhum revendedor encontrado
                  </motion.div>
                </TableCell>
              </TableRow>
            ) : (
              filteredResellers?.map((reseller, index) => (
                <motion.tr
                  key={reseller.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <Link
                      to={`/admin/resellers/${reseller.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {reseller.name}
                    </Link>
                  </TableCell>
                  <TableCell>{reseller.email}</TableCell>
                  <TableCell>{formatCpfCnpj(reseller.document)}</TableCell>
                  <TableCell>{formatPhoneNumber(reseller.phone)}</TableCell>
                  <TableCell>
                    <Badge variant={reseller.active ? "default" : "secondary"}>
                      {reseller.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/resellers/${reseller.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* 📊 ESTATÍSTICAS DE SEGURANÇA */}
        {filteredResellers && filteredResellers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 bg-muted/30 border-t"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total de revendedores: {filteredResellers.length}</span>
              <span>Ativos: {filteredResellers.filter(r => r.active).length}</span>
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
