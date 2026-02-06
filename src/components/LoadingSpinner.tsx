interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`font-mono ${sizeClasses[size]} text-text-muted tracking-wider`}>
        LOADING<span className="animate-blink text-signal-live">█</span>
      </div>
      {text && <p className="font-mono text-xs text-text-ghost">{text}</p>}
    </div>
  );
}
