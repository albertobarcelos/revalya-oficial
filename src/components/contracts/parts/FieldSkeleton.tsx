import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

interface FieldSkeletonProps {
  visible: boolean;
}

export function FieldSkeleton({ visible }: FieldSkeletonProps) {
  if (!visible) return null;
  
  return (
    <div className="absolute inset-0 bg-background/80 flex items-center justify-start pl-3 z-10 rounded-md">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full animate-pulse bg-primary/20" />
        <Skeleton className="h-3 w-24 animate-pulse bg-primary/20" />
      </div>
    </div>
  );
}
