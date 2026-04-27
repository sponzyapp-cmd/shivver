import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98] active:transition-transform
    `;

    const variants = {
      primary: `
        bg-accent text-white shadow-md hover:bg-accent-hover
        active:shadow-none
      `,
      secondary: `
        bg-surface-secondary text-text border border-border
        hover:bg-border/50 active:bg-border/70
      `,
      ghost: `
        bg-transparent text-text-secondary hover:text-text hover:bg-surface-secondary
        active:bg-border
      `,
      danger: `
        bg-error text-white shadow-sm hover:opacity-90 active:opacity-80
      `,
    };

    const sizes = {
      sm: 'h-9 px-4 rounded-lg text-sm',
      md: 'h-11 px-5 rounded-lg text-sm',
      lg: 'h-14 px-6 rounded-xl text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
