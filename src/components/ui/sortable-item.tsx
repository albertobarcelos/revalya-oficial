import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  useHandle?: boolean;
}

/**
 * Componente wrapper para itens que podem ser arrastados e reorganizados
 * Utiliza a biblioteca @dnd-kit para funcionalidade de drag and drop
 */
export function SortableItem({ id, children, className, disabled = false, useHandle = false }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ 
    id,
    disabled 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Se useHandle for true, não aplicamos os listeners no container principal
  const containerProps = useHandle ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "z-50",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...containerProps}
    >
      {useHandle ? (
        React.cloneElement(children as React.ReactElement, {
          dragHandleProps: { ...attributes, ...listeners, ref: setActivatorNodeRef }
        })
      ) : (
        children
      )}
    </div>
  );
}

export default SortableItem;
