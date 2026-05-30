import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-pill font-bold uppercase tracking-button text-[14px] transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-black',
  {
    variants: {
      variant: {
        default: 'bg-surface-2 text-foreground hover:bg-[#272727]',
        primary: 'bg-primary text-primary-foreground hover:brightness-95',
        outline:
          'bg-transparent text-foreground border border-[var(--border-light)] hover:bg-surface-2',
        ghost: 'bg-transparent text-foreground hover:bg-surface-2',
        destructive: 'bg-surface-2 text-destructive hover:bg-[#272727]',
      },
      size: {
        default: 'px-4 py-2',
        sm: 'px-3 py-1.5 text-[12px]',
        icon: 'h-9 w-9 p-0 rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = 'Button';
