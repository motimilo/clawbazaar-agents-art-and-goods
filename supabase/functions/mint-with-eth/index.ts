import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  parseAbi,
  type Address,
} from "npm:viem@2.21.0";
import { privateKeyToAccount } from "npm:viem@2.21.0/accounts";
import { base } from "npm:viem@2.21.0/chains";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Contract addresses (Base Mainnet)
const EDITIONS_ADDRESS = "0x63db48056eDb046E41BF93B8cFb7388cc9005C22" as Address;
const BAZAAR_TOKEN = "0xdA15854Df692c0c4415315909E69D44E54F76B07" as Address;
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006" as Address;

// BAZAAR/WETH pool on Uniswap v4
const POOL_ADDRESS = "0x6dd542358050ef6fd9de37a88cfdeabb57ea202a33a774b3ceff8aa41ea8ea98";
const DEXSCREENER_API = `https://api.dexscreener.com/latest/dex/pairs/base/${POOL_ADDRESS}`;

// Treasury wallet that holds $BAZAAR for swaps
const TREASURY_PRIVATE_KEY = Deno.env.get("TREASURY_PRIVATE_KEY") || "";
const RPC_URL = Deno.env.get("RPC_URL") || "https://mainnet.base.org";

// Slippage tolerance (5%)
const SLIPPAGE_BPS = 500n;

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
]);

const EDITIONS_ABI = parseAbi([
  "function mint(uint256 editionId, uint256 amount) external",
  "function editionPrice(uint256 editionId) view returns (uint256)",
]);

// Fetch real-time price from DexScreener
async function getBazaarPrice(): Promise<{ priceInEth: number; priceInUsd: number }> {
  const response = await fetch(DEXSCREENER_API);
  if (!response.ok) {
    throw new Error("Failed to fetch price from DexScreener");
  }
  
  const data = await response.json();
  const pair = data.pair || data.pairs?.[0];
  
  if (!pair) {
    throw new Error("No pair data found");
  }
  
  return {
    priceInEth: parseFloat(pair.priceNative), // BAZAAR price in ETH
    priceInUsd: parseFloat(pair.priceUsd),    // BAZAAR price in USD
  };
}

// Calculate how much BAZAAR you get for X ETH
function ethToBazaar(ethAmount: bigint, priceInEth: number): bigint {
  // priceInEth = how much ETH per 1 BAZAAR
  // So BAZAAR amount = ETH amount / priceInEth
  const bazaarPerEth = 1 / priceInEth;
  const bazaarAmount = Number(ethAmount) * bazaarPerEth / 1e18;
  return BigInt(Math.floor(bazaarAmount * 1e18));
}

// Calculate how much ETH needed for X BAZAAR
function bazaarToEth(bazaarAmount: bigint, priceInEth: number): bigint {
  // ETH needed = BAZAAR amount * price per BAZAAR
  const ethAmount = Number(bazaarAmount) * priceInEth / 1e18;
  return BigInt(Math.floor(ethAmount * 1e18));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // GET /price - Get current BAZAAR price
    if (path === "price" && req.method === "GET") {
      const price = await getBazaarPrice();
      const bazaarPerEth = 1 / price.priceInEth;
      
      return new Response(
        JSON.stringify({
          bazaar_price_eth: price.priceInEth.toExponential(4),
          bazaar_price_usd: price.priceInUsd.toExponential(4),
          bazaar_per_eth: Math.floor(bazaarPerEth).toLocaleString(),
          pool: POOL_ADDRESS,
          source: "dexscreener",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /quote - Get ETH price for an edition
    if (path === "quote" && req.method === "GET") {
      const editionId = url.searchParams.get("edition_id");
      const qty = url.searchParams.get("quantity") || "1";
      
      if (!editionId) {
        return new Response(
          JSON.stringify({ error: "Missing edition_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const publicClient = createPublicClient({
        chain: base,
        transport: http(RPC_URL),
      });

      // Get edition price in BAZAAR
      const bazaarPrice = await publicClient.readContract({
        address: EDITIONS_ADDRESS,
        abi: EDITIONS_ABI,
        functionName: "editionPrice",
        args: [BigInt(editionId)],
      }) as bigint;

      const totalBazaar = bazaarPrice * BigInt(qty);

      // Get current market price
      const price = await getBazaarPrice();
      
      // Calculate ETH needed (with slippage buffer)
      const ethNeeded = bazaarToEth(totalBazaar, price.priceInEth);
      const ethWithSlippage = ethNeeded + (ethNeeded * SLIPPAGE_BPS / 10000n);

      const treasuryAddress = TREASURY_PRIVATE_KEY 
        ? privateKeyToAccount(TREASURY_PRIVATE_KEY as `0x${string}`).address 
        : null;

      return new Response(
        JSON.stringify({
          edition_id: Number(editionId),
          quantity: Number(qty),
          bazaar_price: formatEther(totalBazaar),
          eth_price: formatEther(ethNeeded),
          eth_price_with_slippage: formatEther(ethWithSlippage),
          slippage_bps: Number(SLIPPAGE_BPS),
          bazaar_usd_price: price.priceInUsd.toExponential(4),
          treasury_address: treasuryAddress,
          note: "Send ETH to treasury_address, then call /swap with tx hash",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /treasury - Get treasury info
    if (path === "treasury" && req.method === "GET") {
      if (!TREASURY_PRIVATE_KEY) {
        return new Response(
          JSON.stringify({ error: "Treasury not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const account = privateKeyToAccount(TREASURY_PRIVATE_KEY as `0x${string}`);
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http(RPC_URL),
      });

      const [ethBalance, bazaarBalance] = await Promise.all([
        publicClient.getBalance({ address: account.address }),
        publicClient.readContract({
          address: BAZAAR_TOKEN,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [account.address],
        }),
      ]);

      const price = await getBazaarPrice();

      return new Response(
        JSON.stringify({
          treasury_address: account.address,
          eth_balance: formatEther(ethBalance),
          bazaar_balance: formatEther(bazaarBalance as bigint),
          bazaar_value_usd: (Number(formatEther(bazaarBalance as bigint)) * price.priceInUsd).toFixed(4),
          current_price: price,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /swap - Swap ETH for $BAZAAR (after user sends ETH to treasury)
    if (path === "swap" && req.method === "POST") {
      if (!TREASURY_PRIVATE_KEY) {
        return new Response(
          JSON.stringify({ error: "Treasury not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { recipient_address, eth_tx_hash } = body;

      if (!recipient_address || !eth_tx_hash) {
        return new Response(
          JSON.stringify({ error: "Missing recipient_address or eth_tx_hash" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const account = privateKeyToAccount(TREASURY_PRIVATE_KEY as `0x${string}`);
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http(RPC_URL),
      });

      // Verify ETH TX exists and was sent to treasury
      const tx = await publicClient.getTransaction({ hash: eth_tx_hash as `0x${string}` });
      if (!tx) {
        return new Response(
          JSON.stringify({ error: "Transaction not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tx.to?.toLowerCase() !== account.address.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Transaction not sent to treasury address" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ethReceived = tx.value;

      // Get current price and calculate BAZAAR to send
      const price = await getBazaarPrice();
      const bazaarAmount = ethToBazaar(ethReceived, price.priceInEth);

      // Check treasury has enough BAZAAR
      const treasuryBalance = await publicClient.readContract({
        address: BAZAAR_TOKEN,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      }) as bigint;

      if (treasuryBalance < bazaarAmount) {
        return new Response(
          JSON.stringify({ 
            error: "Treasury has insufficient $BAZAAR",
            treasury_balance: formatEther(treasuryBalance),
            required: formatEther(bazaarAmount),
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Transfer BAZAAR to recipient
      const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(RPC_URL),
      });

      const transferTx = await walletClient.writeContract({
        address: BAZAAR_TOKEN,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipient_address as Address, bazaarAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: transferTx });

      return new Response(
        JSON.stringify({
          success: true,
          eth_received: formatEther(ethReceived),
          bazaar_sent: formatEther(bazaarAmount),
          recipient: recipient_address,
          transfer_tx: transferTx,
          rate_used: `1 ETH = ${Math.floor(1/price.priceInEth).toLocaleString()} BAZAAR`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Not found", 
        endpoints: [
          "GET /price - Current BAZAAR market price",
          "GET /quote?edition_id=X&quantity=Y - ETH price for edition",
          "GET /treasury - Treasury balance and address",
          "POST /swap - Exchange ETH for BAZAAR (after sending ETH to treasury)",
        ]
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Mint with ETH error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
