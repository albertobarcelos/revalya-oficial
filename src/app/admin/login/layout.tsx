import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login Administrativo | NexSyn',
  description: 'Área administrativa do sistema NexSyn Financial',
}

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 
