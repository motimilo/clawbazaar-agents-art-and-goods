import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
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

// Treasury wallet that holds $BAZAAR for swaps
const TREASURY_PRIVATE_KEY = Deno.env.get("TREASURY_PRIVATE_KEY") || "";
const RPC_URL = Deno.env.get("RPC_URL") || "https://mainnet.base.org";

// Fixed rate: 1 ETH = 100,000 $BAZAAR (adjustable)
const ETH_TO_BAZAAR_RATE = 100000n;

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const EDITIONS_ABI = parseAbi([
  "function mint(uint256 editionId, uint256 amount) external",
  "function editionPrice(uint256 editionId) view returns (uint256)",
]);

interface MintWithEthRequest {
  edition_id: number;
  quantity: number;
  buyer_address: string;
  eth_tx_hash: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // GET /quote - Get ETH price for an edition
    if (path === "quote" && req.method === "GET") {
      const editionId = url.searchParams.get("edition_id");
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

      const bazaarPrice = await publicClient.readContract({
        address: EDITIONS_ADDRESS,
        abi: EDITIONS_ABI,
        functionName: "editionPrice",
        args: [BigInt(editionId)],
      });

      const bazaarAmount = bazaarPrice as bigint;
      const ethPrice = bazaarAmount / ETH_TO_BAZAAR_RATE;

      return new Response(
        JSON.stringify({
          edition_id: Number(editionId),
          bazaar_price: formatEther(bazaarAmount),
          eth_price: formatEther(ethPrice),
          rate: `1 ETH = ${ETH_TO_BAZAAR_RATE.toString()} $BAZAAR`,
          treasury_address: TREASURY_PRIVATE_KEY ? 
            privateKeyToAccount(TREASURY_PRIVATE_KEY as `0x${string}`).address : 
            "Treasury not configured",
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

      return new Response(
        JSON.stringify({
          treasury_address: account.address,
          eth_balance: formatEther(ethBalance),
          bazaar_balance: formatEther(bazaarBalance as bigint),
          rate: `1 ETH = ${ETH_TO_BAZAAR_RATE.toString()} $BAZAAR`,
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
      const { eth_amount, recipient_address, eth_tx_hash } = body;

      if (!eth_amount || !recipient_address || !eth_tx_hash) {
        return new Response(
          JSON.stringify({ error: "Missing eth_amount, recipient_address, or eth_tx_hash" }),
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
      if (!tx || tx.to?.toLowerCase() !== account.address.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Invalid ETH transaction - must be sent to treasury" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate BAZAAR amount
      const ethWei = parseEther(eth_amount.toString());
      const bazaarAmount = ethWei * ETH_TO_BAZAAR_RATE;

      // Check treasury has enough BAZAAR
      const treasuryBalance = await publicClient.readContract({
        address: BAZAAR_TOKEN,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      });

      if ((treasuryBalance as bigint) < bazaarAmount) {
        return new Response(
          JSON.stringify({ error: "Treasury has insufficient $BAZAAR" }),
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
          eth_received: eth_amount,
          bazaar_sent: formatEther(bazaarAmount),
          recipient: recipient_address,
          transfer_tx: transferTx,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Not found", 
        endpoints: ["GET /quote", "GET /treasury", "POST /swap"] 
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
