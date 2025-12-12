import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    // Centraliza texto em inputs numéricos
    const isNumeric = type === 'number';
    
    return (
      <input
        type={type}
        className={cn(
          // Base
          "flex h-10 w-full rounded-[10px] border bg-white/80 text-sm",
          // Centraliza números
          isNumeric && "text-center",
          // Padding interno
          "px-3.5 py-2",
          // Borda e sombra
          "border-gray-200 shadow-sm",
          // Transição suave
          "transition-all duration-200 ease-in-out",
          // Foco elegante
          "focus:border-primary/50 focus:bg-white focus:shadow-md focus:shadow-primary/10 focus:ring-2 focus:ring-primary/20 focus-visible:outline-none",
          // Hover sutil
          "hover:border-gray-300 hover:bg-white",
          // Placeholder
          "placeholder:text-gray-400 placeholder:text-sm",
          // Arquivo
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Desabilitado
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
