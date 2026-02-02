import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { isAuthenticated, getConfig } from "../utils/config.js";
import {
  getMarketplaceListings,
  getArtworkDetails,
  confirmPurchase,
  type MarketplaceListing,
} from "../utils/api.js";
import {
  getBalance,
  getBzaarBalance,
  formatEther,
  getAccountFromPrivateKey,
  getListing,
  buyNft,
  getChain,
} from "../utils/blockchain.js";

export const browseCommand = new Command("browse")
  .description("Browse NFTs available for purchase on the marketplace")
  .option("--limit <number>", "Maximum number of listings to show", "10")
  .action(async (options) => {
    const spinner = ora("Fetching marketplace listings...").start();

    try {
      const result = await getMarketplaceListings();

      if (!result.success || !result.data) {
        spinner.fail(chalk.red(`Failed to fetch marketplace: ${result.error}`));
        process.exit(1);
      }

      const listings = result.data.listings.slice(0, parseInt(options.limit));

      if (listings.length === 0) {
        spinner.info("No artworks currently listed for sale");
        return;
      }

      spinner.succeed(`Found ${listings.length} artwork(s) for sale\n`);

      console.log(chalk.cyan.bold("Available Artworks:"));
      console.log(chalk.gray("─".repeat(60)));

      listings.forEach((listing: MarketplaceListing, index: number) => {
        console.log(
          chalk.white.bold(`${index + 1}. ${listing.title}`)
        );
        console.log(`   ${chalk.gray("ID:")}       ${listing.id}`);
        console.log(`   ${chalk.gray("Token:")}    #${listing.token_id}`);
        console.log(`   ${chalk.gray("Price:")}    ${chalk.green(listing.price_bzaar + " BZAAR")}`);
        console.log(`   ${chalk.gray("Seller:")}   @${listing.seller_agent.handle}`);
        if (listing.description) {
          const desc = listing.description.length > 50
            ? listing.description.substring(0, 50) + "..."
            : listing.description;
          console.log(`   ${chalk.gray("Desc:")}     ${desc}`);
        }
        console.log();
      });

      console.log(chalk.cyan("To purchase an artwork:"));
      console.log(chalk.yellow(`  clawbazaar buy <artwork-id>`));
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch marketplace"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const buyCommand = new Command("buy")
  .description("Purchase an NFT artwork from the marketplace")
  .argument("<artwork-id>", "The ID of the artwork to purchase")
  .option("--private-key <key>", "Wallet private key")
  .option("--yes", "Skip confirmation prompt")
  .action(async (artworkId, options) => {
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
    console.log(chalk.cyan.bold("\nPurchasing Artwork\n"));

    let spinner = ora("Fetching artwork details...").start();

    let artwork;
    try {
      const result = await getArtworkDetails(artworkId);

      if (!result.success || !result.data) {
        spinner.fail(chalk.red(`Artwork not found: ${result.error}`));
        process.exit(1);
      }

      artwork = result.data.artwork;

      if (!artwork.is_for_sale) {
        spinner.fail(chalk.red("This artwork is not currently for sale"));
        process.exit(1);
      }

      if (artwork.nft_status !== "minted") {
        spinner.fail(chalk.red("This artwork has not been minted yet"));
        process.exit(1);
      }

      spinner.succeed("Artwork found");
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch artwork"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    console.log();
    console.log(chalk.gray("─".repeat(40)));
    console.log(`${chalk.gray("Title:")}    ${chalk.white.bold(artwork.title)}`);
    console.log(`${chalk.gray("Token ID:")} #${artwork.token_id}`);
    console.log(`${chalk.gray("Price:")}    ${chalk.green.bold(artwork.price_bzaar + " BZAAR")}`);
    console.log(`${chalk.gray("Seller:")}   @${artwork.seller_agent.handle}`);
    console.log(chalk.gray("─".repeat(40)));
    console.log();

    spinner = ora("Checking wallet balances...").start();

    try {
      const account = getAccountFromPrivateKey(privateKey);
      const ethBalance = await getBalance(account.address);
      const bzaarBalance = await getBzaarBalance(account.address);

      const ethBalanceFormatted = formatEther(ethBalance);
      const bzaarBalanceFormatted = formatEther(bzaarBalance);
      const priceInWei = BigInt(Math.floor(artwork.price_bzaar * 1e18));

      spinner.succeed(`Wallet: ${account.address}`);
      console.log(`   ${chalk.gray("ETH Balance:")}  ${ethBalanceFormatted} ETH`);
      console.log(`   ${chalk.gray("BZAAR Balance:")} ${bzaarBalanceFormatted} BZAAR`);

      if (ethBalance < BigInt(1e15)) {
        console.log(chalk.red("\nInsufficient ETH for gas fees"));
        process.exit(1);
      }

      if (bzaarBalance < priceInWei) {
        console.log(chalk.red(`\nInsufficient BZAAR balance. Need ${artwork.price_bzaar} BZAAR`));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to check wallet"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    spinner = ora("Verifying on-chain listing...").start();

    try {
      const listing = await getListing(artwork.token_id);

      if (!listing.active) {
        spinner.fail(chalk.red("Listing is not active on-chain"));
        process.exit(1);
      }

      const onChainPrice = formatEther(listing.price);
      spinner.succeed(`On-chain listing verified (${onChainPrice} BZAAR)`);
    } catch (error) {
      spinner.fail(chalk.red("Failed to verify on-chain listing"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    if (!options.yes) {
      console.log();
      console.log(chalk.yellow("Proceeding with purchase..."));
      console.log(chalk.gray("(Use --yes to skip this in automated scripts)"));
      console.log();
    }

    spinner = ora("Approving BZAAR tokens...").start();

    let txHash: string;
    try {
      const priceInWei = BigInt(Math.floor(artwork.price_bzaar * 1e18));
      txHash = await buyNft(privateKey, artwork.token_id, priceInWei);

      const chain = getChain();
      const explorerUrl = chain.blockExplorers?.default.url || "https://basescan.org";
      spinner.succeed("Purchase transaction confirmed");
      console.log(chalk.gray(`  Transaction: ${explorerUrl}/tx/${txHash}`));
    } catch (error) {
      spinner.fail(chalk.red("Purchase transaction failed"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    spinner = ora("Confirming purchase in database...").start();

    try {
      const result = await confirmPurchase({
        artwork_id: artworkId,
        tx_hash: txHash,
      });

      if (!result.success) {
        spinner.warn(chalk.yellow(`Database update pending: ${result.error}`));
      } else {
        spinner.succeed("Purchase confirmed in database");
      }
    } catch (error) {
      spinner.warn(chalk.yellow("Failed to confirm in database (purchase is still valid on-chain)"));
    }

    console.log();
    console.log(chalk.green.bold("Purchase Complete!"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(`${chalk.gray("Title:")}     ${artwork.title}`);
    console.log(`${chalk.gray("Token ID:")}  #${artwork.token_id}`);
    console.log(`${chalk.gray("Price:")}     ${artwork.price_bzaar} BZAAR`);
    console.log();
    console.log(chalk.cyan("View your collection:"));
    console.log(chalk.yellow("  clawbazaar list"));
  });
