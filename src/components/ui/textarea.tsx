import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[1.2px] border border-[#b9b9b9] bg-background text-[12px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-black focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          "pt-[1px] pr-[2px] pb-[1px] pl-[2px]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
