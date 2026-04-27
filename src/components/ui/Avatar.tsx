import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

const statusSizeClasses = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
  xl: 'h-5 w-5',
};

const statusColors = {
  online: 'bg-success',
  offline: 'bg-text-tertiary',
  away: 'bg-warning',
  busy: 'bg-error',
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, name = 'User', size = 'md', status, ...props }, ref) => {
    const initials = getInitials(name);

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface-secondary font-semibold', sizeClasses[size], className)}
        {...props}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="text-text-secondary">{initials}</span>
        )}
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full ring-2 ring-surface',
              statusSizeClasses[size],
              statusColors[status]
            )}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
