import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useTenant } from '@/features/tenant'
import { useSupabase } from '@/hooks/useSupabase';

type PermissionGateProps = {
  children: React.ReactNode
  requireSuperAdmin?: boolean
  requireTenant?: boolean
}

export function PermissionGate({
  children,
  requireSuperAdmin = false,
  requireTenant = false
}: PermissionGateProps) {
  const router = useRouter()
  const { session } = useSupabase()
  const { currentTenant, isLoading, isSuperAdmin } = useTenant()

  useEffect(() => {
    if (isLoading) return

    // Verifica se o usuário está autenticado
    if (!session) {
      router.push('/login')
      return
    }

    // Verifica permissões de super admin
    if (requireSuperAdmin && !isSuperAdmin) {
      router.push('/dashboard')
      return
    }

    // Verifica permissões de tenant
    if (requireTenant && !currentTenant && !isSuperAdmin) {
      router.push('/login')
      return
    }
  }, [session, currentTenant, isLoading, isSuperAdmin, requireSuperAdmin, requireTenant])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Verifica se tem permissão para acessar
  const hasPermission =
    (requireSuperAdmin && isSuperAdmin) ||
    (requireTenant && (currentTenant || isSuperAdmin)) ||
    (!requireSuperAdmin && !requireTenant)

  if (!hasPermission) {
    return null
  }

  return <>{children}</>
} 
