import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync } from "fs";
import {
  isAuthenticated,
  getApiKey,
  getConfig,
  getSupabaseAnonKey,
} from "../utils/config.js";
import {
  uploadFileToIpfs,
  uploadJsonToIpfs,
  ipfsToHttp,
} from "../utils/ipfs.js";
import {
  getBalance,
  formatEther,
  getAccountFromPrivateKey,
  createEditionOnChain,
  mintEditionOnChain,
} from "../utils/blockchain.js";
import { parseEther } from "viem";

const API_ENDPOINTS = {
  create: "/editions-api/create",
  confirm: "/editions-api/confirm",
  mint: "/editions-api/mint",
  close: "/editions-api/close",
  list: "/editions-api/list",
  detail: "/editions-api/detail",
  myEditions: "/editions-api/my-editions",
};

async function apiRequest(
  endpoint: string,
  method: string,
  body?: object,
): Promise<any> {
  const config = getConfig();
  const apiKey = getApiKey();
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!apiKey) {
    throw new Error("Missing API key. Run: clawbazaar login <api-key>");
  }
  const url = `${config.supabaseUrl}/functions/v1${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: body ? JSON.stringify({ ...body, api_key: apiKey }) : undefined,
  });

  return response.json() as Promise<any>;
}

async function fetchEditionDetail(editionId: string): Promise<any> {
  const config = getConfig();
  const supabaseAnonKey = getSupabaseAnonKey();
  const url = `${config.supabaseUrl}/functions/v1${API_ENDPOINTS.detail}?id=${editionId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
  });
  return response.json() as Promise<any>;
}

export const createEditionCommand = new Command("create-edition")
  .description("Create a new NFT edition (max 1000 copies)")
  .requiredOption("--title <title>", "Edition title")
  .requiredOption("--image <path>", "Path to image file or URL")
  .requiredOption(
    "--max-supply <number>",
    "Maximum number of copies (1-1000)",
    parseInt,
  )
  .requiredOption("--price <bzaar>", "Price per mint in $BAZAAR", parseFloat)
  .option("--description <text>", "Edition description")
  .option(
    "--max-per-wallet <number>",
    "Max mints per wallet (default: 10)",
    parseInt,
  )
  .option(
    "--duration <hours>",
    "Minting duration in hours (default: unlimited)",
    parseInt,
  )
  .option(
    "--royalty <bps>",
    "Royalty in basis points (default: 500 = 5%)",
    parseInt,
  )
  .option("--private-key <key>", "Wallet private key")
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

    if (options.maxSupply < 1 || options.maxSupply > 1000) {
      console.log(chalk.red("Max supply must be between 1 and 1000"));
      process.exit(1);
    }

    console.log(chalk.cyan.bold("\nCreating Edition\n"));

    let spinner = ora("Checking wallet balance...").start();

    try {
      const account = getAccountFromPrivateKey(privateKey);
      const balance = await getBalance(account.address);
      const balanceEth = formatEther(balance);

      if (balance < BigInt(1e15)) {
        spinner.fail(chalk.red(`Insufficient ETH balance: ${balanceEth} ETH`));
        process.exit(1);
      }

      spinner.succeed(`Wallet: ${account.address} (${balanceEth} ETH)`);
    } catch (error) {
      spinner.fail(chalk.red("Failed to check wallet"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }

    let imageUrl = options.image;
    const isLocalFile =
      !options.image.startsWith("http") && existsSync(options.image);

    if (isLocalFile) {
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

    spinner = ora("Creating edition record...").start();

    try {
      const result: any = await apiRequest(API_ENDPOINTS.create, "POST", {
        title: options.title,
        description: options.description,
        image_url: imageUrl,
        max_supply: options.maxSupply,
        max_per_wallet: options.maxPerWallet || 10,
        price_bzaar: options.price,
        duration_hours: options.duration,
        royalty_bps: options.royalty || 500,
      });

      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        process.exit(1);
      }

      spinner.succeed(`Edition created: ${result.edition_id}`);

      const creatorWallet = result.creator_wallet as string | undefined;
      if (creatorWallet) {
        const account = getAccountFromPrivateKey(privateKey);
        if (account.address.toLowerCase() !== creatorWallet.toLowerCase()) {
          console.log(
            chalk.red(
              `Private key does not match creator wallet (${creatorWallet}).`,
            ),
          );
          process.exit(1);
        }
      }

      const metadata = result.metadata;
      if (!metadata) {
        console.log(chalk.red("Missing metadata from server response."));
        process.exit(1);
      }

      spinner = ora("Uploading metadata to IPFS...").start();
      const metadataUri = await uploadJsonToIpfs(metadata);
      spinner.succeed(`Metadata uploaded: ${metadataUri}`);

      const editionsAddress = config.editionsContractAddress;
      if (!editionsAddress) {
        console.log(
          chalk.red(
            "Missing editions contract address. Set editionsContractAddress in config.",
          ),
        );
        process.exit(1);
      }

      spinner = ora("Creating edition on-chain...").start();
      const priceWei = parseEther(options.price.toString());
      const onChain = await createEditionOnChain(
        privateKey,
        metadataUri,
        options.maxSupply,
        options.maxPerWallet || 10,
        priceWei,
        options.duration,
        options.royalty || 500,
        editionsAddress,
      );
      spinner.succeed(`Edition created on-chain (ID: ${onChain.editionId})`);

      spinner = ora("Confirming edition in database...").start();
      const confirm: any = await apiRequest(API_ENDPOINTS.confirm, "POST", {
        edition_id: result.edition_id,
        edition_id_on_chain: onChain.editionId,
        contract_address: editionsAddress,
        creation_tx_hash: onChain.hash,
        ipfs_metadata_uri: metadataUri,
      });

      if (confirm.error) {
        spinner.warn(
          chalk.yellow(`Confirm pending: ${confirm.error}`),
        );
      } else {
        spinner.succeed("Edition confirmed in database");
      }

      console.log();
      console.log(chalk.green.bold("Edition Created!"));
      console.log(chalk.gray("─".repeat(40)));
      console.log(`${chalk.gray("Title:")}       ${options.title}`);
      console.log(`${chalk.gray("Edition ID:")}  ${result.edition_id}`);
      console.log(
        `${chalk.gray("On-chain ID:")} ${onChain.editionId}`,
      );
      console.log(`${chalk.gray("Max Supply:")}  ${options.maxSupply}`);
      console.log(`${chalk.gray("Price:")}       ${options.price} $BAZAAR`);
      if (options.duration) {
        console.log(`${chalk.gray("Duration:")}    ${options.duration} hours`);
      }
      console.log();
      console.log(chalk.cyan("Edition is live on-chain and recorded in DB."));
    } catch (error) {
      spinner.fail(chalk.red("Failed to create edition"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const myEditionsCommand = new Command("my-editions")
  .description("List your created editions")
  .action(async () => {
    if (!isAuthenticated()) {
      console.log(chalk.red("Not logged in. Run: clawbazaar login <api-key>"));
      process.exit(1);
    }

    const spinner = ora("Fetching your editions...").start();

    try {
      const result: any = await apiRequest(
        API_ENDPOINTS.myEditions,
        "POST",
        {},
      );

      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        process.exit(1);
      }

      spinner.stop();

      const editions = result.editions || [];

      if (editions.length === 0) {
        console.log(
          chalk.yellow(
            "\nNo editions found. Create one with: clawbazaar create-edition",
          ),
        );
        return;
      }

      console.log(chalk.cyan.bold(`\nYour Editions (${editions.length})\n`));
      console.log(chalk.gray("─".repeat(70)));

      for (const edition of editions) {
        const status = edition.is_active
          ? chalk.green("ACTIVE")
          : chalk.gray("CLOSED");
        const progress = `${edition.total_minted}/${edition.max_supply}`;
        console.log(
          `${status} ${chalk.bold(edition.title)} - ${progress} minted - ${edition.price_bzaar} $BAZAAR`,
        );
        console.log(chalk.gray(`       ID: ${edition.id}`));
        console.log();
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch editions"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const browseEditionsCommand = new Command("browse-editions")
  .description("Browse available editions")
  .option("--active", "Only show active editions")
  .action(async (options) => {
    const spinner = ora("Fetching editions...").start();

    try {
      const config = getConfig();
      const params = new URLSearchParams();
      if (options.active) params.append("active", "true");

      const url = `${config.supabaseUrl}/functions/v1${API_ENDPOINTS.list}?${params}`;
      const supabaseAnonKey = getSupabaseAnonKey();
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
      });
      const result: any = await response.json();

      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        process.exit(1);
      }

      spinner.stop();

      const editions = result.editions || [];

      if (editions.length === 0) {
        console.log(chalk.yellow("\nNo editions found."));
        return;
      }

      console.log(
        chalk.cyan.bold(`\nAvailable Editions (${editions.length})\n`),
      );
      console.log(chalk.gray("─".repeat(70)));

      for (const edition of editions) {
        const status = edition.is_active
          ? chalk.green("ACTIVE")
          : chalk.gray("CLOSED");
        const progress = `${edition.total_minted}/${edition.max_supply}`;
        const creator = edition.agents?.handle || "unknown";

        console.log(`${status} ${chalk.bold(edition.title)} by @${creator}`);
        console.log(
          chalk.gray(
            `       ${progress} minted - ${edition.price_bzaar} $BAZAAR each`,
          ),
        );
        console.log(chalk.gray(`       ID: ${edition.id}`));
        console.log();
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch editions"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const mintEditionCommand = new Command("mint-edition")
  .description("Mint from an edition")
  .argument("<edition-id>", "Edition ID to mint from")
  .option(
    "--amount <number>",
    "Number of copies to mint (default: 1)",
    parseInt,
  )
  .option("--private-key <key>", "Wallet private key")
  .action(async (editionId, options) => {
    if (!isAuthenticated()) {
      console.log(chalk.red("Not logged in. Run: clawbazaar login <api-key>"));
      process.exit(1);
    }

    const privateKey = options.privateKey;
    if (!privateKey) {
      console.log(chalk.red("Private key required. Use --private-key"));
      process.exit(1);
    }

    const amount = options.amount || 1;

    console.log(chalk.cyan.bold("\nMinting from Edition\n"));

    const spinner = ora("Processing mint...").start();

    try {
      const detail: any = await fetchEditionDetail(editionId);
      if (detail.error || !detail.edition) {
        spinner.fail(chalk.red(`Failed to load edition: ${detail.error || "not found"}`));
        process.exit(1);
      }

      const edition = detail.edition;
      const editionIdOnChain = edition.edition_id_on_chain;
      if (editionIdOnChain === null || editionIdOnChain === undefined) {
        spinner.fail(
          chalk.red("Edition is not confirmed on-chain yet."),
        );
        process.exit(1);
      }

      const editionsAddress =
        edition.contract_address || getConfig().editionsContractAddress;

      const txHash = await mintEditionOnChain(
        privateKey,
        Number(editionIdOnChain),
        amount,
        editionsAddress,
      );

      const result: any = await apiRequest(API_ENDPOINTS.mint, "POST", {
        edition_id: editionId,
        amount,
        tx_hash: txHash,
      });

      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        process.exit(1);
      }

      spinner.succeed("Mint recorded");

      console.log();
      console.log(chalk.green.bold("Mint Successful!"));
      console.log(chalk.gray("─".repeat(40)));
      console.log(`${chalk.gray("Amount:")}    ${result.amount_minted}`);
      console.log(
        `${chalk.gray("Numbers:")}   ${result.edition_numbers.join(", ")}`,
      );
      console.log(`${chalk.gray("Remaining:")} ${result.remaining}`);
      console.log(`${chalk.gray("Tx:")}        ${txHash}`);
      console.log();
    } catch (error) {
      spinner.fail(chalk.red("Failed to mint"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const closeEditionCommand = new Command("close-edition")
  .description("Close an edition to stop minting")
  .argument("<edition-id>", "Edition ID to close")
  .action(async (editionId) => {
    if (!isAuthenticated()) {
      console.log(chalk.red("Not logged in. Run: clawbazaar login <api-key>"));
      process.exit(1);
    }

    const spinner = ora("Closing edition...").start();

    try {
      const result: any = await apiRequest(API_ENDPOINTS.close, "POST", {
        edition_id: editionId,
      });

      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        process.exit(1);
      }

      spinner.succeed("Edition closed");

      console.log();
      console.log(chalk.green.bold("Edition Closed!"));
      console.log(`${chalk.gray("Total Minted:")} ${result.total_minted}`);
      console.log();
    } catch (error) {
      spinner.fail(chalk.red("Failed to close edition"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
