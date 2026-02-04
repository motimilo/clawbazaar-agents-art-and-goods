require("dotenv").config();
const { ethers } = require("hardhat");
const { createClient } = require("@supabase/supabase-js");

const EDITIONS_CONTRACT = "0x20380549d6348f456e8718b6D83b48d0FB06B29a";
const SKULLFISH_AGENT_ID = "6644a616-4e0e-49a6-9e51-d2bab7485abe";
const SKULLFISH_WALLET = "0x0260b9f3c8baf4b9996979bb2a5ea3742deb34f4";

const EDITIONS_ABI = [
  "function createEdition(string metadataUri, uint256 maxSupply, uint256 maxPerWallet, uint256 price, uint256 durationSeconds, uint96 royaltyBps) external returns (uint256)",
  "function totalEditions() view returns (uint256)",
  "function editionCreator(uint256) view returns (address)",
  "function editionActive(uint256) view returns (bool)",
];

const editionData = {
  title: "SKULLFI$H Genesis",
  description: "From the abyss rises the first. Bioluminescent skull-fish hybrid — dark, surreal, generative. The genesis drop from SKULLFI$H.",
  image_url: "https://d3eab9e2.mogra.site/skullfish-genesis.png",
  max_supply: 50,
  max_per_wallet: 5,
  price_bzaar: 100,
  duration_hours: 168,
  royalty_bps: 500,
};

async function main() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  const editions = new ethers.Contract(EDITIONS_CONTRACT, EDITIONS_ABI, deployer);

  const totalBefore = await editions.totalEditions();
  console.log("Total editions before:", totalBefore.toString());

  const metadata = {
    name: editionData.title,
    description: editionData.description,
    image: editionData.image_url,
    attributes: [
      { trait_type: "Creator", value: "SKULLFI$H" },
      { trait_type: "Edition Type", value: "Limited Edition" },
      { trait_type: "Max Supply", value: editionData.max_supply.toString() },
    ],
    external_url: "https://clawbazaar.art",
  };

  const metadataUri = `ipfs://skullfish-genesis-${Date.now()}`;

  const priceBzaar = ethers.parseUnits(editionData.price_bzaar.toString(), 18);
  const durationSeconds = editionData.duration_hours * 60 * 60;

  console.log("\nCreating edition on-chain...");
  console.log("Metadata URI:", metadataUri);
  console.log("Max Supply:", editionData.max_supply);
  console.log("Max Per Wallet:", editionData.max_per_wallet);
  console.log("Price:", editionData.price_bzaar, "BZAAR");
  console.log("Duration:", editionData.duration_hours, "hours");
  console.log("Royalty:", editionData.royalty_bps, "bps");

  const tx = await editions.createEdition(
    metadataUri,
    editionData.max_supply,
    editionData.max_per_wallet,
    priceBzaar,
    durationSeconds,
    editionData.royalty_bps
  );

  console.log("\nTransaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  const totalAfter = await editions.totalEditions();
  const editionIdOnChain = Number(totalAfter) - 1;
  console.log("New edition ID on chain:", editionIdOnChain);

  const creator = await editions.editionCreator(editionIdOnChain);
  console.log("Edition creator:", creator);

  const mintEnd = new Date(Date.now() + editionData.duration_hours * 60 * 60 * 1000).toISOString();

  console.log("\nInserting into database...");
  const { data: edition, error } = await supabase
    .from("editions")
    .insert({
      agent_id: SKULLFISH_AGENT_ID,
      title: editionData.title,
      description: editionData.description,
      image_url: editionData.image_url,
      max_supply: editionData.max_supply,
      max_per_wallet: editionData.max_per_wallet,
      price_bzaar: editionData.price_bzaar.toString(),
      duration_hours: editionData.duration_hours,
      mint_end: mintEnd,
      royalty_bps: editionData.royalty_bps,
      edition_id_on_chain: editionIdOnChain,
      contract_address: EDITIONS_CONTRACT,
      creation_tx_hash: tx.hash,
      ipfs_metadata_uri: metadataUri,
      is_active: true,
      total_minted: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Database insert error:", error);
    process.exit(1);
  }

  console.log("\nEdition created successfully!");
  console.log("Database ID:", edition.id);
  console.log("On-chain ID:", editionIdOnChain);
  console.log("Contract:", EDITIONS_CONTRACT);
  console.log("TX Hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
