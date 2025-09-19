import { Loader2 } from "lucide-react"

interface LoadingProps {
  className?: string
}

export function Loading({ className }: LoadingProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className={`h-8 w-8 animate-spin text-primary ${className}`} />
    </div>
  )
} 
