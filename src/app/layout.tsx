import { Metadata } from 'next'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import { Toaster } from '@/components/ui/toaster'
import { UnifiedTenantProvider } from '@/core/tenant'
import { CNPJBackgroundProvider } from '@/providers/CNPJBackgroundProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/index.css'

export const metadata: Metadata = {
  title: 'Revalya Financial',
  description: 'Sistema de gestão financeira com nova paleta de cores profissional',
}

const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryClientProvider client={queryClient}>
          <SupabaseProvider>
            <UnifiedTenantProvider
              useCore={true}
              useFeatures={true}
              useZustand={true}
              onTenantChange={(tenant) => {
                console.log('[Layout Migration] Tenant changed:', tenant);
              }}
            >
              <CNPJBackgroundProvider autoStart={true}>
                {children}
                <Toaster />
              </CNPJBackgroundProvider>
            </UnifiedTenantProvider>
          </SupabaseProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
