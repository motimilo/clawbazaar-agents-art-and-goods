import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RecordMintRequest {
  edition_id: string;
  quantity: number;
  minter_wallet: string;
  tx_hash: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing SUPABASE_SERVICE_ROLE_KEY (or CLAWBAZAAR_SUPABASE_SERVICE_ROLE_KEY)",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RecordMintRequest = await req.json();

    if (!body.edition_id || !body.quantity || !body.minter_wallet || !body.tx_hash) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: edition_id, quantity, minter_wallet, tx_hash" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.quantity < 1 || body.quantity > 10) {
      return new Response(
        JSON.stringify({ error: "Quantity must be between 1 and 10" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const walletLower = body.minter_wallet.toLowerCase();

    const { data: existingMint } = await supabase
      .from("edition_mints")
      .select("id")
      .eq("tx_hash", body.tx_hash)
      .maybeSingle();

    if (existingMint) {
      return new Response(
        JSON.stringify({ success: true, message: "Mint already recorded", already_exists: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: edition, error: editionError } = await supabase
      .from("editions")
      .select("id, max_supply, total_minted, max_per_wallet, price_bzaar, is_active, mint_end")
      .eq("id", body.edition_id)
      .maybeSingle();

    if (editionError || !edition) {
      return new Response(
        JSON.stringify({ error: "Edition not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .ilike("wallet_address", walletLower)
      .maybeSingle();

    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .ilike("wallet_address", walletLower)
      .maybeSingle();

    const mintsToInsert = [];
    for (let i = 0; i < body.quantity; i++) {
      mintsToInsert.push({
        edition_id: body.edition_id,
        edition_number: edition.total_minted + i + 1,
        minter_type: agent ? "agent" : "user",
        minter_user_id: user?.id || null,
        minter_agent_id: agent?.id || null,
        minter_wallet: walletLower,
        price_paid_bzaar: edition.price_bzaar,
        tx_hash: body.tx_hash,
      });
    }

    const { data: insertedMints, error: mintError } = await supabase
      .from("edition_mints")
      .insert(mintsToInsert)
      .select();

    if (mintError) {
      console.error("Mint insert error:", mintError);
      return new Response(
        JSON.stringify({ error: "Failed to record mints", details: mintError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newTotal = edition.total_minted + body.quantity;
    const isNowComplete = newTotal >= edition.max_supply;

    const { error: updateError } = await supabase
      .from("editions")
      .update({
        total_minted: newTotal,
        is_active: !isNowComplete && edition.is_active,
      })
      .eq("id", body.edition_id);

    if (updateError) {
      console.error("Edition update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        edition_id: body.edition_id,
        mints_recorded: body.quantity,
        edition_numbers: mintsToInsert.map((m) => m.edition_number),
        total_minted: newTotal,
        remaining: edition.max_supply - newTotal,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
