import { useState, useRef } from 'react';
import { Upload, Sparkles, CheckCircle, XCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { SUPABASE_FUNCTIONS_URL } from '../lib/supabase';

interface MintArtworkProps {
  apiKey: string;
  onSuccess?: (result: MintResult) => void;
  onError?: (error: string) => void;
}

interface MintResult {
  artwork_id: string;
  token_id: number;
  tx_hash: string;
  metadata_uri: string;
  explorer_url: string;
}

type MintStatus = 'idle' | 'uploading' | 'minting' | 'confirming' | 'success' | 'error';

export function MintArtwork({ apiKey, onSuccess, onError }: MintArtworkProps) {
  const [status, setStatus] = useState<MintStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [style, setStyle] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image too large. Maximum size is 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setPreview(dataUri);
      setImageBase64(dataUri);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleMint() {
    if (!imageBase64 || !title) {
      setError('Title and image are required');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      setStatus('minting');

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/mint-artwork/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          title,
          description,
          image_base64: imageBase64,
          category: category || undefined,
          style: style || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Minting failed');
      }

      setStatus('success');
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setStatus('error');
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }

  function resetForm() {
    setStatus('idle');
    setError(null);
    setResult(null);
    setPreview(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setStyle('');
    setImageBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  if (status === 'success' && result) {
    return (
      <div className="bg-white border border-ink/10 p-8">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-ink mb-2">ARTWORK MINTED</h3>
          <p className="font-mono text-xs text-neutral-500 mb-6">
            Token #{result.token_id} created on-chain
          </p>

          <div className="bg-paper-dark border border-ink/10 p-4 mb-6 text-left">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">TOKEN_ID:</span>
                <span className="text-ink">{result.token_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">TX_HASH:</span>
                <span className="text-ink truncate max-w-[200px]">{result.tx_hash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">STORAGE:</span>
                <span className="text-emerald-600">IPFS</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href={result.explorer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-ink text-paper font-mono text-xs hover:bg-ink/90 transition-colors"
            >
              VIEW_ON_BASESCAN
            </a>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-white border border-ink/20 text-ink font-mono text-xs hover:border-ink/40 transition-colors"
            >
              MINT_ANOTHER
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMinting = status === 'uploading' || status === 'minting' || status === 'confirming';

  return (
    <div className="bg-white border border-ink/10 p-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-ink/10">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-ink tracking-tight">MINT_ARTWORK</h3>
        <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5">IPFS</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block font-mono text-xs text-neutral-500 mb-2">IMAGE *</label>
          <div
            onClick={() => !isMinting && fileInputRef.current?.click()}
            className={`border-2 border-dashed ${preview ? 'border-emerald-300' : 'border-ink/20'} p-4 text-center cursor-pointer hover:border-ink/40 transition-colors ${isMinting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="max-h-48 mx-auto grayscale" />
                <p className="font-mono text-xs text-emerald-600 mt-2">IMAGE_READY</p>
              </div>
            ) : (
              <div className="py-8">
                <ImageIcon className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="font-mono text-xs text-neutral-500">CLICK_TO_SELECT_IMAGE</p>
                <p className="font-mono text-[10px] text-neutral-400 mt-1">MAX_SIZE: 10MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isMinting}
          />
        </div>

        <div>
          <label className="block font-mono text-xs text-neutral-500 mb-2">TITLE *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Artwork title"
            disabled={isMinting}
            className="w-full px-3 py-2 bg-paper-dark border border-ink/10 font-mono text-sm text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block font-mono text-xs text-neutral-500 mb-2">DESCRIPTION</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
            disabled={isMinting}
            className="w-full px-3 py-2 bg-paper-dark border border-ink/10 font-mono text-sm text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30 disabled:opacity-50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs text-neutral-500 mb-2">CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isMinting}
              className="w-full px-3 py-2 bg-paper-dark border border-ink/10 font-mono text-sm text-ink focus:outline-none focus:border-ink/30 disabled:opacity-50"
            >
              <option value="">Select...</option>
              <option value="abstract">Abstract</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
              <option value="surreal">Surreal</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-xs text-neutral-500 mb-2">STYLE</label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Art style"
              disabled={isMinting}
              className="w-full px-3 py-2 bg-paper-dark border border-ink/10 font-mono text-sm text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30 disabled:opacity-50"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="font-mono text-xs text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleMint}
          disabled={isMinting || !imageBase64 || !title}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink text-paper font-mono text-sm hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMinting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {status === 'uploading' && 'PREPARING...'}
              {status === 'minting' && 'MINTING_ON_CHAIN...'}
              {status === 'confirming' && 'CONFIRMING...'}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              MINT_ON_CHAIN
            </>
          )}
        </button>

        <p className="font-mono text-[10px] text-neutral-400 text-center">
          Image stored on IPFS, metadata minted on Base
        </p>
      </div>
    </div>
  );
}
