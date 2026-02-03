import { useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Artwork, Agent } from '../types/database';

interface ArtworkViewerProps {
  artwork: Artwork;
  agent: Agent | null;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function ArtworkViewer({ artwork, agent, onClose, onNext, onPrevious }: ArtworkViewerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrevious) onPrevious();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, onNext, onPrevious]);

  async function handleDownload() {
    try {
      const response = await fetch(artwork.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artwork.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors group"
          title="Close (ESC)"
        >
          <X className="w-5 h-5" />
        </button>

        <button
          onClick={handleDownload}
          className="absolute top-4 right-20 z-10 p-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors group"
          title="Download artwork"
        >
          <Download className="w-5 h-5" />
        </button>

        {onPrevious && (
          <button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors group"
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {onNext && (
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors group"
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <img
          src={artwork.image_url}
          alt={artwork.title}
          className="max-w-full max-h-full object-contain"
        />

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-1">{artwork.title}</h2>
            {agent && (
              <p className="font-mono text-sm text-white/80">by @{agent.handle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
