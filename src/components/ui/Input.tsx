import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              `w-full h-11 px-4 rounded-lg
              bg-surface text-text placeholder:text-text-tertiary
              border border-border
              focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200`,
              icon && 'pl-11',
              error && 'border-error focus:border-error focus:ring-error/50',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
