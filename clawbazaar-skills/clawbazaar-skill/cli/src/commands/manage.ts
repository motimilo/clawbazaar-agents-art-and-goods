import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  isAuthenticated,
  setConfig,
  getConfig,
  type CliConfig,
} from "../utils/config.js";
import { listArtworks, listForSale as apiListForSale } from "../utils/api.js";
import {
  listNftForSale,
  cancelNftListing,
  getChain,
} from "../utils/blockchain.js";
import { parseEther } from "viem";
import { getSupabaseAnonKey } from "../utils/config.js";

export const listCommand = new Command("list")
  .description("List your artworks")
  .option("--status <status>", "Filter by status (pending, minted, failed)")
  .option("--for-sale", "Only show artworks for sale")
  .action(async (options) => {
    if (!isAuthenticated()) {
      console.log(chalk.red("Not logged in. Run: clawbazaar login <api-key>"));
      process.exit(1);
    }

    const spinner = ora("Fetching artworks...").start();

    try {
      const result = await listArtworks();

      if (!result.success || !result.data) {
        spinner.fail(chalk.red(`Failed to fetch artworks: ${result.error}`));
        process.exit(1);
      }

      let artworks = result.data.artworks;

      if (options.status) {
        artworks = artworks.filter((a) => a.nft_status === options.status);
      }

      if (options.forSale) {
        artworks = artworks.filter((a) => a.is_for_sale);
      }

      spinner.stop();

      if (artworks.length === 0) {
        console.log(chalk.yellow("No artworks found"));
        return;
      }

      console.log(chalk.cyan.bold(`\nYour Artworks (${artworks.length})\n`));
      console.log(chalk.gray("─".repeat(80)));

      for (const artwork of artworks) {
        const statusColor =
          artwork.nft_status === "minted"
            ? chalk.green
            : artwork.nft_status === "pending"
              ? chalk.yellow
              : chalk.red;

        console.log(`${chalk.bold(artwork.title)}`);
        console.log(`  ${chalk.gray("ID:")}      ${artwork.id}`);
        console.log(
          `  ${chalk.gray("Status:")}  ${statusColor(artwork.nft_status)}`,
        );
        if (artwork.token_id !== null) {
          console.log(`  ${chalk.gray("Token:")}   #${artwork.token_id}`);
        }
        if (artwork.is_for_sale && artwork.price_bzaar) {
          console.log(
            `  ${chalk.gray("Price:")}   ${chalk.green(`${artwork.price_bzaar} BZAAR`)}`,
          );
        }
        console.log(
          `  ${chalk.gray("Created:")} ${new Date(artwork.created_at).toLocaleDateString()}`,
        );
        console.log();
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch artworks"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const listForSaleCommand = new Command("list-for-sale")
  .description("List an artwork for sale")
  .argument("<artwork-id>", "The artwork ID to list")
  .requiredOption("--price <bzaar>", "Price in BAZAAR tokens")
  .option("--private-key <key>", "Wallet private key")
  .action(async (artworkId: string, options) => {
    if (!isAuthenticated()) {
      console.log(chalk.red("Not logged in. Run: clawbazaar login <api-key>"));
      process.exit(1);
    }

    const privateKey = options.privateKey;
    if (!privateKey) {
      console.log(chalk.red("Private key required for on-chain listing"));
      process.exit(1);
    }

    const price = parseFloat(options.price);
    if (isNaN(price) || price <= 0) {
      console.log(chalk.red("Invalid price"));
      process.exit(1);
    }

    console.log(chalk.cyan.bold("\nListing Artwork for Sale\n"));

    let spinner = ora("Loading artwork details...").start();

    try {
      const config = getConfig();
      const supabaseAnonKey = getSupabaseAnonKey();
      const detailUrl = `${config.supabaseUrl}/functions/v1/artworks-api/artwork?id=${artworkId}`;
      const detailRes = await fetch(detailUrl, {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
      });
      const detail = await detailRes.json();

      if (!detail || detail.error || !detail.artwork) {
        spinner.fail(
          chalk.red(`Failed to load artwork: ${detail.error || "not found"}`),
        );
        process.exit(1);
      }

      const tokenId = detail.artwork.token_id;
      if (tokenId === null || tokenId === undefined) {
        spinner.fail(chalk.red("Artwork is not minted yet (missing token ID)."));
        process.exit(1);
      }

      spinner.succeed(`Token ID: ${tokenId}`);

      spinner = ora("Listing on-chain...").start();
      const priceWei = parseEther(price.toString());
      const txHash = await listNftForSale(
        privateKey,
        Number(tokenId),
        priceWei,
      );
      const chain = getChain();
      const explorerUrl =
        chain.blockExplorers?.default.url || "https://basescan.org";
      spinner.succeed("On-chain listing created");
      console.log(chalk.gray(`  Transaction: ${explorerUrl}/tx/${txHash}`));

      spinner = ora("Updating database listing...").start();
      const result = await apiListForSale({
        artwork_id: artworkId,
        price_bzaar: price,
        tx_hash: txHash,
      });

      if (!result.success) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        process.exit(1);
      }

      spinner.succeed("Database updated");
    } catch (error) {
      spinner.fail(chalk.red("Failed to update database"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    console.log();
    console.log(chalk.green.bold("Listing Created!"));
    console.log(chalk.gray(`  Artwork: ${artworkId}`));
    console.log(chalk.gray(`  Price:   ${price} BZAAR`));
    console.log();
  });

export const cancelListingCommand = new Command("cancel-listing")
  .description("Cancel an artwork listing")
  .argument("<token-id>", "The token ID to cancel")
  .option("--private-key <key>", "Wallet private key")
  .action(async (tokenIdStr: string, options) => {
    const privateKey = options.privateKey;
    if (!privateKey) {
      console.log(chalk.red("Private key required"));
      process.exit(1);
    }

    const tokenId = parseInt(tokenIdStr, 10);
    if (isNaN(tokenId)) {
      console.log(chalk.red("Invalid token ID"));
      process.exit(1);
    }

    const spinner = ora("Cancelling listing on-chain...").start();

    try {
      const hash = await cancelNftListing(privateKey, tokenId);
      const chain = getChain();
      const explorerUrl =
        chain.blockExplorers?.default.url || "https://basescan.org";

      spinner.succeed("Listing cancelled");
      console.log(chalk.gray(`  Transaction: ${explorerUrl}/tx/${hash}`));
    } catch (error) {
      spinner.fail(chalk.red("Failed to cancel listing"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const configCommand = new Command("config").description(
  "Manage CLI configuration",
);

configCommand
  .command("set <key> <value>")
  .description("Set a configuration value")
  .action((key: string, value: string) => {
    const validKeys = [
      "apiUrl",
      "rpcUrl",
      "nftContractAddress",
      "bzaarTokenAddress",
      "editionsContractAddress",
      "supabaseUrl",
      "supabaseAnonKey",
      "ipfsGateway",
    ];

    if (!validKeys.includes(key)) {
      console.log(
        chalk.red(`Invalid key. Valid keys: ${validKeys.join(", ")}`),
      );
      process.exit(1);
    }

    setConfig(key as keyof CliConfig, value);
    console.log(
      chalk.green(
        `${key} = ${key.includes("Secret") || key.includes("Key") ? "***" : value}`,
      ),
    );
  });

configCommand
  .command("get [key]")
  .description("Get configuration value(s)")
  .action((key?: string) => {
    const config = getConfig();

    if (key) {
      const value = config[key as keyof typeof config];
      if (value === undefined) {
        console.log(chalk.yellow("Not set"));
      } else if (key.includes("Secret") || key.includes("Key")) {
        console.log(value ? "***" : chalk.yellow("Not set"));
      } else {
        console.log(value);
      }
    } else {
      console.log(chalk.cyan.bold("\nConfiguration\n"));
      console.log(`${chalk.gray("API URL:")}     ${config.apiUrl}`);
      console.log(`${chalk.gray("RPC URL:")}     ${config.rpcUrl}`);
      console.log(`${chalk.gray("Contract:")}    ${config.nftContractAddress}`);
      console.log(`${chalk.gray("BAZAAR Token:")} ${config.bzaarTokenAddress}`);
      console.log(
        `${chalk.gray("Editions:")}    ${config.editionsContractAddress || "Not set"}`,
      );
      console.log(`${chalk.gray("Supabase:")}    ${config.supabaseUrl}`);
      console.log(`${chalk.gray("IPFS Gateway:")} ${config.ipfsGateway}`);
      console.log(`${chalk.gray("IPFS Upload:")} ${chalk.green("Supabase")}`);
    }
  });

configCommand
  .command("reset")
  .description("Reset configuration to defaults")
  .action(() => {
    const { clearConfig } = require("../utils/config.js");
    clearConfig();
    console.log(chalk.green("Configuration reset to defaults"));
  });
