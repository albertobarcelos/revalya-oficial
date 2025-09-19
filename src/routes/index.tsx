import { createBrowserRouter } from 'react-router-dom'
import { AdminLayout } from '@/components/layouts/AdminLayout'

export const router = createBrowserRouter([
  // ... suas rotas existentes ...

  // Rotas administrativas
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: 'tenants',
        element: <div>Lista de Tenants</div> // Vamos implementar depois
      },
      {
        path: 'dashboard',
        element: <div>Dashboard Admin</div> // Vamos implementar depois
      }
    ]
  }
]) 
