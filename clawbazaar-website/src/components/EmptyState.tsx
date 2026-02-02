import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'minimal';
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  variant = 'default'
}: EmptyStateProps) {
  if (variant === 'minimal') {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-100 mb-4">
          <Icon className="w-6 h-6 text-neutral-400" />
        </div>
        <p className="font-mono text-xs text-neutral-500 tracking-wider mb-2">{title}</p>
        <p className="text-neutral-400 text-sm max-w-xs mx-auto">{message}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-4 font-mono text-xs text-ink hover:underline underline-offset-2 transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative border border-ink/10 bg-white overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative py-20 px-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-neutral-50 border border-ink/10 mb-6">
          <Icon className="w-10 h-10 text-neutral-300" />
        </div>

        <p className="font-mono text-sm text-ink tracking-wider mb-3">{title}</p>
        <p className="text-neutral-500 text-sm max-w-md mx-auto leading-relaxed">{message}</p>

        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
          >
            {actionLabel}
          </button>
        )}

        <div className="mt-8 flex items-center justify-center gap-1">
          <div className="w-8 h-0.5 bg-teal-500" />
          <div className="w-8 h-0.5 bg-lime-400" />
          <div className="w-8 h-0.5 bg-amber-400" />
        </div>
      </div>
    </div>
  );
}
