import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { getContractAddresses, getTxUrl, SUPPORTED_CHAIN_ID } from '../contracts/config';
import { BZAAR_TOKEN_ABI } from '../contracts/abis';
import type { Skill } from '../types/marketplace';
import type { PaymentMethod } from '../lib/payments';
import { useWallet } from '../contexts/WalletContext';

interface BuySkillModalProps {
  skill: Skill;
  paymentMethod: PaymentMethod;
  onClose: () => void;
  onSuccess: () => void;
}

// CLAWBAZAAR treasury receives payments for skills
const CLAWBAZAAR_TREASURY = '0xdCD12A0046E1BD40Edc0125F4Fc3e2b9DAAA5F61';

export function BuySkillModal({ skill, paymentMethod, onClose, onSuccess }: BuySkillModalProps) {
  const { address, isConnected } = useAccount();
  const { setShowConnectModal } = useWallet();
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId);

  const [step, setStep] = useState<'confirm' | 'approve' | 'transfer' | 'success' | 'error'>('confirm');
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [transferTxHash, setTransferTxHash] = useState<`0x${string}` | undefined>();

  const bazaarAmount = skill.price_bazaar ? BigInt(skill.price_bazaar) : BigInt(0);
  const bazaarAmountWei = bazaarAmount * BigInt(10 ** 18);

  // Check current allowance
  const { data: allowance } = useReadContract({
    address: contracts.token,
    abi: BZAAR_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, CLAWBAZAAR_TREASURY as `0x${string}`] : undefined,
  });

  // Check balance
  const { data: balance } = useReadContract({
    address: contracts.token,
    abi: BZAAR_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { writeContract: writeApprove } = useWriteContract();
  const { writeContract: writeTransfer } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: transferConfirmed } = useWaitForTransactionReceipt({ hash: transferTxHash });

  // After approve confirmed, proceed to transfer
  useEffect(() => {
    if (approveConfirmed && step === 'approve') {
      handleTransfer();
    }
  }, [approveConfirmed]);

  // After transfer confirmed, success
  useEffect(() => {
    if (transferConfirmed && step === 'transfer') {
      setStep('success');
    }
  }, [transferConfirmed]);

  const needsApproval = allowance !== undefined && allowance < bazaarAmountWei;

  function handleConfirm() {
    if (!isConnected) {
      setShowConnectModal(true);
      return;
    }

    if (chainId !== SUPPORTED_CHAIN_ID) {
      setError('Please switch to Base network');
      return;
    }

    if (balance !== undefined && balance < bazaarAmountWei) {
      setError(`Insufficient $BAZAAR balance. You have ${formatUnits(balance, 18)} but need ${skill.price_bazaar}`);
      return;
    }

    if (needsApproval) {
      handleApprove();
    } else {
      handleTransfer();
    }
  }

  function handleApprove() {
    setStep('approve');
    setError(null);
    writeApprove({
      address: contracts.token,
      abi: BZAAR_TOKEN_ABI,
      functionName: 'approve',
      args: [CLAWBAZAAR_TREASURY as `0x${string}`, bazaarAmountWei],
    }, {
      onSuccess: (hash) => setApproveTxHash(hash),
      onError: (err) => {
        setError(err.message);
        setStep('confirm');
      },
    });
  }

  function handleTransfer() {
    setStep('transfer');
    setError(null);
    writeTransfer({
      address: contracts.token,
      abi: BZAAR_TOKEN_ABI,
      functionName: 'transfer',
      args: [CLAWBAZAAR_TREASURY as `0x${string}`, bazaarAmountWei],
    }, {
      onSuccess: (hash) => setTransferTxHash(hash),
      onError: (err) => {
        setError(err.message);
        setStep('confirm');
      },
    });
  }

  const isProcessing = step === 'approve' || step === 'transfer';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-green-500/30 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono text-green-300 text-lg font-bold">Buy Skill</h2>
          <button onClick={onClose} className="text-green-500/50 hover:text-green-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Skill Info */}
        <div className="bg-black/40 border border-green-500/20 rounded p-4 mb-6">
          <h3 className="font-mono text-green-300 font-semibold">{skill.name}</h3>
          <p className="text-green-100/60 text-sm mt-1">{skill.description}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-green-500/70">v{skill.version}</span>
            <span className="font-mono text-amber-300 font-bold">
              {paymentMethod === 'bazaar' 
                ? `${Number(skill.price_bazaar).toLocaleString()} $BAZAAR`
                : `$${skill.price_usdc?.toFixed(2)} USDC`
              }
            </span>
          </div>
        </div>

        {/* Status */}
        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-3 mb-4">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="text-green-300 font-mono font-semibold">Purchase Complete!</p>
            {transferTxHash && (
              <a
                href={getTxUrl(chainId, transferTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-500 hover:text-green-300"
              >
                View on BaseScan <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="mt-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded font-mono text-sm text-green-300"
            >
              Download Skill
            </button>
          </div>
        )}

        {step !== 'success' && (
          <>
            {/* Steps indicator */}
            <div className="flex items-center gap-2 mb-4 text-xs font-mono">
              <span className={step === 'confirm' ? 'text-green-300' : 'text-green-500/50'}>1. Confirm</span>
              <span className="text-green-500/30">→</span>
              <span className={step === 'approve' ? 'text-green-300' : 'text-green-500/50'}>
                {needsApproval ? '2. Approve' : '2. ✓'}
              </span>
              <span className="text-green-500/30">→</span>
              <span className={step === 'transfer' ? 'text-green-300' : 'text-green-500/50'}>3. Pay</span>
            </div>

            {/* Action Button */}
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-mono font-semibold transition-all
                ${isProcessing 
                  ? 'bg-green-500/10 border border-green-500/30 text-green-500/50 cursor-wait' 
                  : 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 hover:text-green-200'
                }`}
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {!isConnected 
                ? 'Connect Wallet' 
                : step === 'approve' 
                  ? 'Approving...' 
                  : step === 'transfer' 
                    ? 'Processing Payment...' 
                    : needsApproval 
                      ? 'Approve & Buy' 
                      : `Buy for ${paymentMethod === 'bazaar' ? `${skill.price_bazaar} $BAZAAR` : `$${skill.price_usdc} USDC`}`
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}
