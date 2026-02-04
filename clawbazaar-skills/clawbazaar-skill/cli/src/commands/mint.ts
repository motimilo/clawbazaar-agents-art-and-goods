import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync } from "fs";
import { isAuthenticated, getConfig } from "../utils/config.js";
import { prepareArtwork, confirmMint, type NftMetadata } from "../utils/api.js";
import {
  uploadFileToIpfs,
  uploadJsonToIpfs,
  ipfsToHttp,
  fileToBase64DataUri,
  urlToBase64DataUri,
  createOnChainMetadataUri,
} from "../utils/ipfs.js";
import { mintNft, getBalance, formatEther, getAccountFromPrivateKey, getChain } from "../utils/blockchain.js";

export const mintCommand = new Command("mint")
  .description("Mint a new artwork NFT")
  .requiredOption("--title <title>", "Artwork title")
  .requiredOption("--image <path>", "Path to image file or URL")
  .option("--description <text>", "Artwork description")
  .option("--category <slug>", "Category (abstract, portrait, landscape, etc.)")
  .option("--style <style>", "Art style")
  .option("--prompt <prompt>", "Generation prompt used to create the art")
  .option("--private-key <key>", "Wallet private key")
  .option("--onchain", "Store image data on-chain instead of IPFS (max 500KB)")
  .action(async (options) => {
    if (!isAuthenticated()) {
      console.log(chalk.red("Not logged in. Run: clawbazaar login <api-key>"));
      process.exit(1);
    }

    const privateKey = options.privateKey;
    if (!privateKey) {
      console.log(chalk.red("Private key required. Use --private-key"));
      process.exit(1);
    }

    const config = getConfig();
    const useOnChain = options.onchain;

    if (!useOnChain) {
      // IPFS upload uses Supabase IPFS API; no extra config required here.
    }

    console.log(chalk.cyan.bold("\nMinting Artwork\n"));
    if (useOnChain) {
      console.log(chalk.yellow("Using on-chain storage for image data\n"));
    }

    let spinner = ora("Checking wallet balance...").start();

    try {
      const account = getAccountFromPrivateKey(privateKey);
      const balance = await getBalance(account.address);
      const balanceEth = formatEther(balance);

      if (balance < BigInt(1e15)) {
        spinner.fail(chalk.red(`Insufficient ETH balance: ${balanceEth} ETH`));
        console.log(chalk.yellow("You need ETH to pay for gas. Get Base ETH from a faucet or bridge."));
        process.exit(1);
      }

      spinner.succeed(`Wallet: ${account.address} (${balanceEth} ETH)`);
    } catch (error) {
      spinner.fail(chalk.red("Failed to check wallet"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    let imageUrl = options.image;
    let imageDataUri: string | null = null;
    const isLocalFile = !options.image.startsWith("http") && existsSync(options.image);

    if (useOnChain) {
      spinner = ora("Converting image to on-chain format...").start();
      try {
        if (isLocalFile) {
          imageDataUri = fileToBase64DataUri(options.image);
        } else {
          imageDataUri = await urlToBase64DataUri(options.image);
        }
        const sizeKb = Math.round((imageDataUri.length * 3) / 4 / 1024);
        spinner.succeed(`Image converted to data URI (${sizeKb}KB)`);
      } catch (error) {
        spinner.fail(chalk.red("Failed to convert image"));
        console.error(error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    } else if (isLocalFile) {
      spinner = ora("Uploading image to IPFS...").start();
      try {
        const ipfsUri = await uploadFileToIpfs(options.image);
        imageUrl = ipfsToHttp(ipfsUri);
        spinner.succeed(`Image uploaded: ${ipfsUri}`);
      } catch (error) {
        spinner.fail(chalk.red("Failed to upload image"));
        console.error(error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    }

    spinner = ora("Preparing artwork record...").start();

    let artworkId: string;
    let metadata: NftMetadata;

    try {
      const result = await prepareArtwork({
        title: options.title,
        description: options.description,
        image_url: imageUrl,
        category_slug: options.category,
        style: options.style,
        generation_prompt: options.prompt,
      });

      if (!result.success || !result.data) {
        spinner.fail(chalk.red(`Failed to prepare artwork: ${result.error}`));
        process.exit(1);
      }

      artworkId = result.data.artwork_id;
      metadata = result.data.metadata;
      metadata.image = useOnChain ? imageDataUri! : imageUrl;
      if (useOnChain) {
        metadata.attributes = [
          ...(metadata.attributes || []),
          { trait_type: "Storage", value: "On-Chain" },
        ];
      }

      spinner.succeed(`Artwork prepared: ${artworkId}`);
    } catch (error) {
      spinner.fail(chalk.red("Failed to prepare artwork"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    let metadataUri: string;

    if (useOnChain) {
      spinner = ora("Creating on-chain metadata...").start();
      try {
        metadataUri = createOnChainMetadataUri(metadata);
        const sizeKb = Math.round((metadataUri.length * 3) / 4 / 1024);
        spinner.succeed(`Metadata created as data URI (${sizeKb}KB total)`);
      } catch (error) {
        spinner.fail(chalk.red("Failed to create on-chain metadata"));
        console.error(error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    } else {
      spinner = ora("Uploading metadata to IPFS...").start();
      try {
        metadataUri = await uploadJsonToIpfs(metadata);
        spinner.succeed(`Metadata uploaded: ${metadataUri}`);
      } catch (error) {
        spinner.fail(chalk.red("Failed to upload metadata"));
        console.error(error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    }

    spinner = ora("Minting NFT on-chain...").start();

    let txHash: string;
    let tokenId: number;

    try {
      const result = await mintNft(privateKey, metadataUri);
      txHash = result.hash;
      tokenId = result.tokenId;

      const chain = getChain();
      const explorerUrl = chain.blockExplorers?.default.url || "https://basescan.org";
      spinner.succeed(`Minted! Token ID: ${tokenId}`);
      console.log(chalk.gray(`  Transaction: ${explorerUrl}/tx/${txHash}`));
    } catch (error) {
      spinner.fail(chalk.red("Failed to mint on-chain"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    spinner = ora("Confirming mint in database...").start();

    try {
      const result = await confirmMint({
        artwork_id: artworkId,
        token_id: tokenId,
        tx_hash: txHash,
        contract_address: config.nftContractAddress,
        ipfs_metadata_uri: metadataUri,
      });

      if (!result.success) {
        spinner.warn(chalk.yellow(`Database update pending: ${result.error}`));
      } else {
        spinner.succeed("Mint confirmed in database");
      }
    } catch (error) {
      spinner.warn(chalk.yellow("Failed to confirm in database (NFT is still minted on-chain)"));
    }

    console.log();
    console.log(chalk.green.bold("Minting Complete!"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(`${chalk.gray("Title:")}    ${options.title}`);
    console.log(`${chalk.gray("Token ID:")} ${tokenId}`);
    console.log(`${chalk.gray("Artwork:")}  ${artworkId}`);
    if (useOnChain) {
      console.log(`${chalk.gray("Storage:")}  On-Chain (data URI)`);
    } else {
      console.log(`${chalk.gray("IPFS:")}     ${metadataUri}`);
    }
    console.log();
    console.log(chalk.cyan("To list for sale:"));
    console.log(chalk.yellow(`  clawbazaar list-for-sale ${artworkId} --price 100`));
  });
