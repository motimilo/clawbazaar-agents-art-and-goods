import { Zap, Activity, Clock, CheckCircle } from 'lucide-react';
import type { Service } from '../types/marketplace';

interface ServiceCardProps {
  service: Service;
  onCall?: (service: Service) => void;
}

export function ServiceCard({ service, onCall }: ServiceCardProps) {
  const pricePerCall = service.price_per_call_usdc 
    ? `$${service.price_per_call_usdc.toFixed(4)}/call` 
    : service.price_per_call_bazaar 
      ? `${Number(service.price_per_call_bazaar).toLocaleString()} $BAZAAR/call`
      : 'Free';

  const isFree = !service.price_per_call_usdc && !service.price_per_call_bazaar;

  return (
    <div className="bg-black/40 border border-cyan-500/30 rounded-lg p-4 hover:border-cyan-500/60 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="font-mono text-cyan-300 font-semibold truncate">
            {service.name}
          </h3>
        </div>
        <div className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded ${
          service.status === 'active' 
            ? 'text-green-400 bg-green-500/10' 
            : 'text-yellow-400 bg-yellow-500/10'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            service.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
          }`} />
          {service.status}
        </div>
      </div>

      {/* Description */}
      <p className="text-cyan-100/70 text-sm mb-4 line-clamp-2">
        {service.description || 'No description provided'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-cyan-500/10 rounded p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
            <Activity className="w-3 h-3" />
          </div>
          <div className="text-xs text-cyan-300 font-mono">
            {service.total_calls.toLocaleString()}
          </div>
          <div className="text-xs text-cyan-500/50">calls</div>
        </div>
        
        <div className="bg-cyan-500/10 rounded p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
            <CheckCircle className="w-3 h-3" />
          </div>
          <div className="text-xs text-cyan-300 font-mono">
            {service.success_rate ? `${service.success_rate.toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-cyan-500/50">success</div>
        </div>
        
        <div className="bg-cyan-500/10 rounded p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
            <Clock className="w-3 h-3" />
          </div>
          <div className="text-xs text-cyan-300 font-mono">
            {service.avg_response_time_ms ? `${service.avg_response_time_ms}ms` : '--'}
          </div>
          <div className="text-xs text-cyan-500/50">avg</div>
        </div>
      </div>

      {/* Price & Call */}
      <div className="flex items-center justify-between pt-3 border-t border-cyan-500/20">
        <span className={`font-mono font-bold ${isFree ? 'text-cyan-400' : 'text-cyan-300'}`}>
          {pricePerCall}
        </span>
        <button
          onClick={() => onCall?.(service)}
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 
                     border border-cyan-500/50 rounded font-mono text-sm text-cyan-300
                     transition-all group-hover:border-cyan-400"
        >
          <Zap className="w-4 h-4" />
          Try it
        </button>
      </div>
    </div>
  );
}
