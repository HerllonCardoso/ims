import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-pill bg-surface-2 text-foreground px-4 py-3 text-[14px] outline-none focus:outline focus:outline-1 focus:outline-black placeholder:text-foreground-muted',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
