import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Verifica se o usuário está autenticado
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rotas que requerem autenticação
  const authRoutes = ['/dashboard', '/admin', '/meus-aplicativos']
  const isAuthRoute = authRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Rotas de login
  const isLoginRoute = req.nextUrl.pathname === '/login'
  
  // Rota raiz
  const isRootRoute = req.nextUrl.pathname === '/'

  // Se não estiver autenticado e tentar acessar rota protegida
  if (isAuthRoute && !session) {
    // Redireciona para a página de login
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Se estiver autenticado e tentar acessar login ou rota raiz
  if (session && (isLoginRoute || isRootRoute)) {
    // Redireciona para a página de seleção de portal
    return NextResponse.redirect(new URL('/meus-aplicativos', req.url))
  }

  return res
}

// Configuração de quais rotas o middleware deve processar
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
