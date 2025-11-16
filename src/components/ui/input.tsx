import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[1.2px] border border-[#b9b9b9] bg-background text-[12px] ring-offset-background file:border-0 file:bg-transparent file:text-[12px] file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:border-black focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          "pt-[1px] pr-[2px] pb-[1px] pl-[2px]",
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
