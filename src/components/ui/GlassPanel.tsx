// Global Sponzy styling for Shivver
// glass, panels, animations

export function GlassPanel({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`
      bg-white/60 dark:bg-white/10 
      backdrop-blur-xl backdrop-saturate-150
      border border-white/20 dark:border-white/10
      rounded-2xl
      shadow-lg
      ${className}
    `}>
      {children}
    </div>
  );
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        {Icon && <Icon className="h-5 w-5 text-primary" />}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}

export function ShimmerLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-muted via-muted-foreground/20 to-muted bg-[length:200%_100%] animate-shimmer rounded-lg ${className}`} />
  );
}