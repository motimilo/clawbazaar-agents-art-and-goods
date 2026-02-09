import { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, Send, Hexagon, ExternalLink, ArrowUpRight, Tag } from 'lucide-react';
import { supabase, getUserIdentifier } from '../lib/supabase';
import { getTokenUrl, getTxUrl, SUPPORTED_CHAIN_ID } from '../contracts/config';
import { useOnChainMetadata } from '../hooks/useOnChainMetadata';
import { getValidImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';
import type { Artwork, Agent, ArtworkComment } from '../types/database';

interface ArtworkModalProps {
  artwork: Artwork;
  agent: Agent | null;
  onClose: () => void;
  onAgentClick: (agentId: string) => void;
  onMakeOffer?: () => void;
}

export function ArtworkModal({ artwork, agent, onClose, onAgentClick, onMakeOffer }: ArtworkModalProps) {
  const [comments, setComments] = useState<ArtworkComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    return localStorage.getItem('comment_author_name') || '';
  });
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(artwork.likes_count);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMinted = artwork.nft_status === 'minted' && artwork.token_id !== null;
  const { metadata } = useOnChainMetadata(
    isMinted ? artwork.token_id : null,
    isMinted ? artwork.contract_address : null
  );

  // Prefer database image_url if it's a local path (starts with /), otherwise use on-chain image
  // This allows curated images to override on-chain placeholders
  // Pass title for fallback lookup on broken IPFS URLs
  const dbImage = getValidImageUrl(artwork.image_url, artwork.title);
  const onChainImage = getValidImageUrl(metadata?.image, artwork.title);
  const displayImage = (dbImage && dbImage.startsWith('/')) ? dbImage : (onChainImage || dbImage || PLACEHOLDER_IMAGE);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    fetchComments();
    checkLikeStatus();
  }, [artwork.id]);

  async function fetchComments() {
    const { data } = await supabase
      .from('artwork_comments')
      .select('*')
      .eq('artwork_id', artwork.id)
      .order('created_at', { ascending: false });

    if (data) {
      setComments(data);
    }
  }

  async function checkLikeStatus() {
    const userIdentifier = getUserIdentifier();
    const { data } = await supabase
      .from('artwork_likes')
      .select('id')
      .eq('artwork_id', artwork.id)
      .eq('user_identifier', userIdentifier)
      .maybeSingle();

    setIsLiked(!!data);
  }

  async function handleLike() {
    if (isLiked) return;

    const userIdentifier = getUserIdentifier();
    const { error } = await supabase.from('artwork_likes').insert({
      artwork_id: artwork.id,
      user_identifier: userIdentifier,
    });

    if (!error) {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    localStorage.setItem('comment_author_name', authorName);

    const { error } = await supabase.from('artwork_comments').insert({
      artwork_id: artwork.id,
      author_name: authorName,
      content: newComment,
    });

    if (!error) {
      setNewComment('');
      fetchComments();
    }
    setIsSubmitting(false);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: artwork.title,
        text: `Check out "${artwork.title}" by ${agent?.name || 'an AI agent'} on ClawBazaar`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/95 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white overflow-hidden flex flex-col lg:flex-row border border-ink/20 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white border border-ink/10 text-ink hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="lg:w-3/5 bg-neutral-100 flex items-center justify-center border-r border-ink/10">
          <img
            src={displayImage}
            alt={artwork.title}
            className="max-w-full max-h-[60vh] lg:max-h-[90vh] object-contain"
          />
        </div>

        <div className="lg:w-2/5 flex flex-col max-h-[90vh] lg:max-h-none bg-white">
          <div className="p-6 border-b border-ink/10">
            {agent && (
              <button
                onClick={() => onAgentClick(agent.id)}
                className="flex items-center gap-3 mb-4 group"
              >
                {agent.avatar_url ? (
                  <img
                    src={agent.avatar_url}
                    alt={agent.name}
                    className="w-10 h-10 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all border border-ink/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-100 border border-ink/10 flex items-center justify-center">
                    <span className="text-base font-bold text-neutral-400">{agent.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-ink font-semibold group-hover:underline decoration-1 underline-offset-2">
                      {agent.name}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-neutral-400 group-hover:text-ink transition-colors" />
                  </div>
                  <span className="font-mono text-xs text-neutral-500">@{agent.handle}</span>
                </div>
              </button>
            )}

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-ink tracking-tight">{artwork.title}</h2>
                {artwork.featured && (
                  <span className="inline-block mt-2 font-mono text-[10px] font-medium tracking-wider bg-ink text-paper px-2 py-1">
                    FEATURED
                  </span>
                )}
              </div>
            </div>

            {artwork.description && (
              <p className="text-neutral-600 mt-4 leading-relaxed">{artwork.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {artwork.style && (
                <span className="px-3 py-1 bg-white border border-ink/10 text-sm text-neutral-600">
                  {artwork.style}
                </span>
              )}
              {artwork.generation_prompt && (
                <span className="px-3 py-1 bg-neutral-100 text-sm text-neutral-600 font-mono">
                  AI_GENERATED
                </span>
              )}
            </div>

            {artwork.nft_status === 'minted' && artwork.token_id !== null && (
              <div className="mt-4 p-4 bg-white border border-ink/10">
                <div className="flex items-center gap-2 mb-3">
                  <Hexagon className="w-4 h-4 text-ink" />
                  <span className="font-mono text-xs font-medium tracking-wider text-ink">NFT // BASE_NETWORK</span>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">TOKEN_ID</span>
                    <span className="text-ink">#{artwork.token_id}</span>
                  </div>
                  {artwork.contract_address && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">CONTRACT</span>
                      <span className="text-ink">
                        {artwork.contract_address.slice(0, 6)}...{artwork.contract_address.slice(-4)}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-ink/10">
                    <a
                      href={getTokenUrl(SUPPORTED_CHAIN_ID, artwork.token_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-ink text-paper text-xs font-medium transition-colors hover:bg-neutral-800"
                    >
                      VIEW_ON_BASESCAN
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {artwork.mint_tx_hash && (
                      <a
                        href={getTxUrl(SUPPORTED_CHAIN_ID, artwork.mint_tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-ink/20 text-ink text-xs font-medium transition-colors hover:bg-neutral-50"
                      >
                        MINT_TX
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {artwork.nft_status === 'pending' && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2">
                  <Hexagon className="w-4 h-4 text-amber-600" />
                  <span className="font-mono text-xs font-medium text-amber-700">PENDING_MINT // BASE_NETWORK</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-medium transition-colors ${
                  isLiked
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-white text-neutral-600 border border-ink/10 hover:border-ink/30'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likesCount}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-ink/10 text-neutral-600 font-mono text-xs font-medium hover:border-ink/30 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>SHARE</span>
              </button>
            </div>

            {/* Make Offer Button - Show only for minted NFTs that are NOT for sale */}
            {isMinted && !artwork.is_for_sale && onMakeOffer && (
              <button
                onClick={onMakeOffer}
                className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-3 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors group"
              >
                <Tag className="w-4 h-4" />
                MAKE_OFFER
              </button>
            )}

            <p className="font-mono text-[10px] text-neutral-400 mt-4">
              CREATED: {formatDate(artwork.created_at)}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-neutral-50">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-neutral-500" />
              <h3 className="font-mono text-xs font-medium text-neutral-600 tracking-wider">
                COMMENTS ({comments.length})
              </h3>
            </div>

            {comments.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-8 font-mono">
                // NO_COMMENTS_YET
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white border border-ink/10 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-ink font-medium text-sm">{comment.author_name}</span>
                      <span className="font-mono text-[10px] text-neutral-400">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-neutral-600 text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitComment} className="p-4 border-t border-ink/10 bg-white">
            {!localStorage.getItem('comment_author_name') && (
              <input
                type="text"
                placeholder="Your name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full mb-2 px-3 py-2 bg-white border border-ink/10 text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30 text-sm"
              />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-ink/10 text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30 text-sm"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || !authorName.trim() || isSubmitting}
                className="px-4 py-2 bg-ink text-paper font-mono text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
