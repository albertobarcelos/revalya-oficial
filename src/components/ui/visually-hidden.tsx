import React from "react";
import { cn } from "@/lib/utils";

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export function VisuallyHidden({
  children,
  className,
  ...props
}: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "!overflow-hidden !absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
