/**
 * Middleware Next.js - Sistema Revalya
 * Aplica validações de segurança em todas as rotas
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  securityMiddleware, 
  apiSecurityMiddleware, 
  adminSecurityMiddleware 
} from './src/middleware/securityMiddleware';

/**
 * Middleware principal do Next.js
 * Intercepta todas as requisições e aplica validações de segurança
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  
  // Ignora arquivos estáticos e recursos do Next.js
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    (pathname.includes('.') && !pathname.startsWith('/api/')) ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  try {
    // Aplica middleware específico baseado na rota
    if (pathname.startsWith('/admin')) {
      // Middleware mais restritivo para rotas administrativas
      return await adminSecurityMiddleware(request);
    }
    
    if (pathname.startsWith('/api/admin')) {
      // Middleware específico para APIs administrativas
      return await adminSecurityMiddleware(request);
    }
    
    if (pathname.startsWith('/api/')) {
      // Middleware para APIs gerais
      return await apiSecurityMiddleware(request);
    }
    
    // Middleware padrão para outras rotas
    return await securityMiddleware(request);
    
  } catch (error) {
    console.error('Erro no middleware principal:', error);
    
    // Em caso de erro crítico, permite a requisição mas registra o problema
    const response = NextResponse.next();
    response.headers.set('X-Middleware-Error', 'true');
    
    return response;
  }
}

/**
 * Configuração do matcher
 * Define quais rotas devem passar pelo middleware
 */
export const config = {
  matcher: [
    /*
     * Aplica middleware em todas as rotas exceto:
     * - api (handled by function)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};