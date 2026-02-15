import { useState, useEffect } from 'react';
import { X, Coins, AlertCircle, CheckCircle, Loader2, Wallet, Layers, Users, Clock, Minus, Plus, Terminal } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract } from 'wagmi';
import { getContractAddresses, SUPPORTED_CHAIN_ID } from '../contracts/config';
import { CLAW_BAZAAR_EDITIONS_ABI, BZAAR_TOKEN_ABI } from '../contracts/abis';
import { formatBazaar, normalizeBazaarAmount, toBazaarWei } from '../utils/bazaar';
import type { Edition, Agent } from '../types/database';

interface EditionMintModalProps {
  edition: Edition;
  agent: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}

type MintStep = 'idle' | 'approving' | 'minting' | 'success' | 'error' | 'not_deployed';

export function EditionMintModal({ edition, agent, onClose, onSuccess }: EditionMintModalProps) {
  const { address, isConnected, balance, connect, isCorrectNetwork, switchToBase, targetChainName } = useWallet();
  const [step, setStep] = useState<MintStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [mintTxHash, setMintTxHash] = useState<`0x${string}` | undefined>();
  const [mintQuantity, setMintQuantity] = useState(1);

  const chainId = useChainId();
  const contracts = getContractAddresses(chainId);
  const editionsAddress = contracts.editions;
  const tokenAddress = contracts.token;

  const isContractDeployed = editionsAddress !== '0x0000000000000000000000000000000000000000';

  const unitPrice = normalizeBazaarAmount(edition.price_bzaar);
  const totalCost = unitPrice * quantity;
  const totalPriceWei = toBazaarWei(totalCost);

  const { data: currentAllowance } = useReadContract({
    address: tokenAddress,
    abi: BZAAR_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, editionsAddress] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  const { writeContract: writeApprove } = useWriteContract();
  const { writeContract: writeMint } = useWriteContract();

  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const { isSuccess: isMintConfirmed } = useWaitForTransactionReceipt({
    hash: mintTxHash,
  });

  useEffect(() => {
    if (isMintConfirmed && mintTxHash && address && step === 'minting') {
      recordMintToDatabase(mintTxHash, mintQuantity);
    }
  }, [isMintConfirmed, mintTxHash, address, step, mintQuantity]);

  useEffect(() => {
    if (isApproveConfirmed && step === 'approving' && edition.edition_id_on_chain !== null) {
      setStep('minting');
      writeMint(
        {
          address: editionsAddress,
          abi: CLAW_BAZAAR_EDITIONS_ABI,
          functionName: 'mint',
          args: [BigInt(edition.edition_id_on_chain), BigInt(mintQuantity)],
        },
        {
          onSuccess: (hash) => {
            setMintTxHash(hash);
          },
          onError: (err) => {
            console.error('Mint error:', err);
            setError(`Mint failed: ${err.message || 'Unknown error'}`);
            setStep('error');
          },
        }
      );
    }
  }, [isApproveConfirmed, step, edition.edition_id_on_chain, mintQuantity, editionsAddress, writeMint]);

  async function recordMintToDatabase(hash: string, qty: number) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-mint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            edition_id: edition.id,
            quantity: qty,
            minter_wallet: address,
            tx_hash: hash,
          }),
        }
      );

      if (!response.ok) {
        console.error('Failed to record mint:', await response.text());
      }

      setStep('success');
      onSuccess();
    } catch (err) {
      console.error('Error recording mint:', err);
      setStep('success');
      onSuccess();
    }
  }

  const remaining = edition.max_supply - edition.total_minted;
  const isSoldOut = remaining === 0;
  const hasEnoughBalance = balance >= totalCost;
  const maxCanMint = Math.min(remaining, edition.max_per_wallet);

  const isExpired = edition.mint_end ? new Date(edition.mint_end).getTime() < Date.now() : false;

  const hasEnoughAllowance = currentAllowance !== undefined && currentAllowance >= totalPriceWei;

  async function handleMint() {
    if (!isConnected || !address) {
      connect();
      return;
    }

    if (!isCorrectNetwork) {
      await switchToBase();
      return;
    }

    if (isSoldOut) {
      setError('This edition is sold out');
      setStep('error');
      return;
    }

    if (isExpired) {
      setError('This edition mint has ended');
      setStep('error');
      return;
    }

    if (!isContractDeployed) {
      setStep('not_deployed');
      return;
    }

    if (edition.edition_id_on_chain === null || edition.edition_id_on_chain === undefined) {
      setError('Edition not linked to blockchain');
      setStep('error');
      return;
    }

    setMintQuantity(quantity);

    // Final chain check right before transaction
    if (chainId !== SUPPORTED_CHAIN_ID) {
      setError(`Please switch to Base network (currently on chain ${chainId})`);
      setStep('error');
      return;
    }

    try {
      if (hasEnoughAllowance) {
        setStep('minting');
        writeMint(
          {
            address: editionsAddress,
            abi: CLAW_BAZAAR_EDITIONS_ABI,
            functionName: 'mint',
            args: [BigInt(edition.edition_id_on_chain), BigInt(quantity)],
            chainId: SUPPORTED_CHAIN_ID,
          },
          {
            onSuccess: (hash) => {
              setMintTxHash(hash);
            },
            onError: (err) => {
              console.error('Mint error:', err);
              setError(`Mint failed: ${err.message || 'Unknown error'}`);
              setStep('error');
            },
          }
        );
      } else {
        setStep('approving');
        writeApprove(
          {
            address: tokenAddress,
            abi: BZAAR_TOKEN_ABI,
            functionName: 'approve',
            args: [editionsAddress, totalPriceWei],
            chainId: SUPPORTED_CHAIN_ID,
          },
          {
            onSuccess: (hash) => {
              setApproveTxHash(hash);
            },
            onError: (err) => {
              console.error('Approve error:', err);
              setError(`Approval failed: ${err.message || 'Unknown error'}`);
              setStep('error');
            },
          }
        );
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep('error');
    }
  }

  function handleRetry() {
    setStep('idle');
    setError(null);
    setApproveTxHash(undefined);
    setMintTxHash(undefined);
  }

  function incrementQuantity() {
    if (quantity < maxCanMint) {
      setQuantity(q => q + 1);
    }
  }

  function decrementQuantity() {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  }

  const isProcessing = step === 'approving' || step === 'minting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-paper border border-ink/20 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-ink text-paper">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <h2 className="font-mono text-sm font-medium tracking-wider">MINT_EDITION</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-paper/70 hover:text-paper transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <img
              src={edition.image_url}
              alt={edition.title}
              className="w-24 h-24 object-cover border border-ink/10"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-ink font-semibold truncate">{edition.title}</h3>
              {agent && (
                <p className="font-mono text-xs text-neutral-500 mt-0.5">by @{agent.handle}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-neutral-500">
                  <Users className="w-3 h-3" />
                  <span className="font-mono text-xs">{edition.total_minted}/{edition.max_supply}</span>
                </div>
                {edition.mint_end && (
                  <div className="flex items-center gap-1 text-neutral-500">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono text-xs">
                      {isExpired ? 'Ended' : 'Active'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-lg font-bold text-ink">{formatBazaar(unitPrice)} $BAZAAR</span>
              </div>
            </div>
          </div>

          {isSoldOut && (
            <div className="flex items-start gap-3 p-4 bg-neutral-100 border border-neutral-200 mb-6">
              <AlertCircle className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs font-medium text-neutral-700">SOLD_OUT</p>
                <p className="text-neutral-500 text-sm mt-1">This edition has reached maximum supply</p>
              </div>
            </div>
          )}

          {isExpired && !isSoldOut && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 mb-6">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs font-medium text-amber-700">MINT_ENDED</p>
                <p className="text-amber-600 text-sm mt-1">The minting period for this edition has closed</p>
              </div>
            </div>
          )}

          {!isConnected ? (
            <div className="text-center py-6">
              <Wallet className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 mb-4 text-sm">Connect wallet to mint</p>
              <button
                onClick={connect}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                CONNECT_WALLET
              </button>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="text-center py-6">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-neutral-500 mb-4 text-sm">Switch to {targetChainName} network</p>
              <button
                onClick={switchToBase}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
              >
                SWITCH_NETWORK
              </button>
            </div>
          ) : step === 'success' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-mono text-sm font-medium text-ink mb-2">MINT_COMPLETE</h3>
              <p className="text-neutral-500 text-sm">
                {quantity > 1 ? `${quantity} editions` : '1 edition'} minted successfully
              </p>
            </div>
          ) : step === 'error' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-mono text-sm font-medium text-ink mb-2">MINT_FAILED</h3>
              <p className="text-neutral-500 text-sm mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-white border border-ink/20 text-ink font-mono text-xs font-medium hover:border-ink/40 transition-colors"
              >
                RETRY
              </button>
            </div>
          ) : step === 'not_deployed' ? (
            <div className="py-6">
              <div className="w-14 h-14 bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <Terminal className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="font-mono text-sm font-medium text-ink mb-2 text-center">CONTRACT_NOT_DEPLOYED</h3>
              <p className="text-neutral-500 text-sm mb-4 text-center">
                Edition minting requires the ClawBazaarEditions contract
              </p>
              <div className="bg-neutral-900 border border-neutral-700 p-4 mb-4 font-mono text-xs">
                <p className="text-neutral-400 mb-2"># Deploy the contract:</p>
                <p className="text-emerald-400">npx hardhat run scripts/deploy/deploy-editions.cjs --network base</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 mb-4">
                <p className="text-amber-700 text-xs font-mono mb-1">REQUIRED_SETUP:</p>
                <ul className="text-amber-600 text-xs space-y-1 list-disc list-inside">
                  <li>Fund deployer wallet with Base ETH</li>
                  <li>Deploy ClawBazaarEditions contract</li>
                  <li>Update config.ts with contract address</li>
                  <li>Add contract ABI to abis.ts</li>
                </ul>
              </div>
              <button
                onClick={() => setStep('idle')}
                className="w-full px-6 py-2 bg-white border border-ink/20 text-ink font-mono text-xs font-medium hover:border-ink/40 transition-colors"
              >
                BACK
              </button>
            </div>
          ) : (
            <>
              {!isSoldOut && !isExpired && maxCanMint > 1 && (
                <div className="flex items-center justify-between p-4 bg-white border border-ink/10 mb-4">
                  <span className="font-mono text-xs text-neutral-500">QUANTITY</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="w-8 h-8 flex items-center justify-center border border-ink/20 text-ink hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-lg font-bold text-ink w-8 text-center">{quantity}</span>
                    <button
                      onClick={incrementQuantity}
                      disabled={quantity >= maxCanMint}
                      className="w-8 h-8 flex items-center justify-center border border-ink/20 text-ink hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white border border-ink/10 p-4 mb-6 font-mono text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-500">YOUR_BALANCE</span>
                  <span className="text-ink">{formatBazaar(balance)} $BAZAAR</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-500">EDITION_PRICE</span>
                  <span className="text-ink">{formatBazaar(unitPrice)} x {quantity}</span>
                </div>
                <div className="border-t border-ink/10 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">TOTAL_COST</span>
                  <span className="text-ink font-bold">{formatBazaar(totalCost)} $BAZAAR</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-neutral-500">BALANCE_AFTER</span>
                  <span className={hasEnoughBalance ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatBazaar(balance - totalCost)} $BAZAAR
                  </span>
                </div>
              </div>

              {isProcessing && (
                <div className="bg-neutral-50 border border-ink/10 p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-ink animate-spin" />
                    <div>
                      {step === 'approving' ? (
                        <>
                          <p className="font-mono text-xs font-medium text-ink">STEP_1/2: APPROVING_TOKEN...</p>
                          <p className="text-neutral-500 text-xs mt-0.5">Approving BAZAAR token spending</p>
                        </>
                      ) : (
                        <>
                          <p className="font-mono text-xs font-medium text-ink">STEP_2/2: MINTING_EDITION...</p>
                          <p className="text-neutral-500 text-xs mt-0.5">Minting your edition</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!hasEnoughBalance && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 mb-4">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-xs font-medium text-rose-700">INSUFFICIENT_BALANCE</p>
                    <p className="text-rose-600 text-sm mt-1">Need {formatBazaar(totalCost - balance)} more $BAZAAR</p>
                  </div>
                </div>
              )}

              {!hasEnoughBalance && (
                <div className="flex flex-col gap-3 p-4 bg-blue-50 border border-blue-200 mb-6">
                  <div className="flex items-start gap-3">
                    <Coins className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-mono text-xs font-medium text-blue-700">GET_BAZAAR</p>
                      <p className="text-blue-600 text-sm mt-1">
                        Swap ETH for $BAZAAR on Uniswap, then return to mint.
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://app.uniswap.org/swap?outputCurrency=0xdA15854Df692c0c4415315909E69D44E54F76B07&chain=base`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-mono text-xs font-medium tracking-wider hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 16.681l-1.878-1.878c.657-.879 1.047-1.967 1.047-3.145 0-2.905-2.353-5.258-5.258-5.258S6.547 8.753 6.547 11.658s2.353 5.258 5.258 5.258c1.178 0 2.266-.39 3.145-1.047l1.878 1.878c.244.244.64.244.884 0l.182-.182c.244-.244.244-.64 0-.884z"/>
                    </svg>
                    SWAP_ETH_FOR_BAZAAR
                  </a>
                </div>
              )}

              <button
                onClick={handleMint}
                disabled={!hasEnoughBalance || isProcessing || isSoldOut || isExpired}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors group"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {step === 'approving' ? 'APPROVING...' : 'MINTING...'}
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    MINT {quantity > 1 ? `${quantity} EDITIONS` : 'EDITION'} // {formatBazaar(totalCost)} $BAZAAR
                  </>
                )}
              </button>

              <div className="flex items-center justify-between mt-4 font-mono text-[10px] text-neutral-400">
                <span>{remaining} remaining</span>
                <span>Max {edition.max_per_wallet} per wallet</span>
              </div>

              {edition.edition_id_on_chain !== null && (
                <div className="mt-2 p-2 bg-neutral-50 border border-neutral-200 font-mono text-[9px] text-neutral-500">
                  <div>EDITION_ID: {edition.edition_id_on_chain}</div>
                  <div>CONTRACT: {editionsAddress.slice(0, 6)}...{editionsAddress.slice(-4)}</div>
                  <div>TOKEN: {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
