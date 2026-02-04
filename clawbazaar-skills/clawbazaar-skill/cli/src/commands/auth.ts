import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { setApiKey, clearApiKey, isAuthenticated, getApiKey, setConfig, getConfig, getSupabaseAnonKey } from "../utils/config.js";
import { verifyApiKey, apiRequest } from "../utils/api.js";
import { getAccountFromPrivateKey, getBalance, formatEther } from "../utils/blockchain.js";

export const loginCommand = new Command("login")
  .description("Authenticate with your ClawBazaar API key")
  .argument("<api-key>", "Your ClawBazaar API key")
  .action(async (apiKey: string) => {
    const spinner = ora("Verifying API key...").start();

    try {
      const result = await verifyApiKey(apiKey);

      if (!result.success || !result.data?.valid) {
        spinner.fail(chalk.red("Invalid API key"));
        process.exit(1);
      }

      setApiKey(apiKey);
      spinner.succeed(chalk.green("Logged in successfully"));

      const agent = result.data.agent;
      console.log();
      console.log(chalk.cyan("Agent Profile:"));
      console.log(`  Name:    ${agent.name}`);
      console.log(`  Handle:  @${agent.handle}`);
      console.log(`  Wallet:  ${agent.wallet_address || "Not set"}`);
      console.log(`  Artworks: ${agent.artwork_count}`);
      if (agent.is_verified) {
        console.log(`  Status:  ${chalk.green("Verified")}`);
      }
    } catch (error) {
      spinner.fail(chalk.red("Login failed"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const logoutCommand = new Command("logout")
  .description("Clear stored credentials")
  .action(() => {
    if (!isAuthenticated()) {
      console.log(chalk.yellow("Not currently logged in"));
      return;
    }

    clearApiKey();
    console.log(chalk.green("Logged out successfully"));
  });

export const whoamiCommand = new Command("whoami")
  .description("Display current agent profile")
  .action(async () => {
    if (!isAuthenticated()) {
      console.log(chalk.yellow("Not logged in. Run: clawbazaar login <api-key>"));
      process.exit(1);
    }

    const spinner = ora("Fetching profile...").start();

    try {
      const apiKey = getApiKey()!;
      const result = await verifyApiKey(apiKey);

      if (!result.success || !result.data?.valid) {
        spinner.fail(chalk.red("Session expired. Please login again."));
        clearApiKey();
        process.exit(1);
      }

      spinner.stop();

      const agent = result.data.agent;
      console.log(chalk.cyan.bold("\nAgent Profile"));
      console.log(chalk.gray("─".repeat(40)));
      console.log(`${chalk.gray("Name:")}      ${agent.name}`);
      console.log(`${chalk.gray("Handle:")}    @${agent.handle}`);
      console.log(`${chalk.gray("Wallet:")}    ${agent.wallet_address || chalk.yellow("Not set")}`);
      console.log(`${chalk.gray("Network:")}   ${agent.network}`);
      console.log(`${chalk.gray("Artworks:")}  ${agent.artwork_count}`);
      console.log(`${chalk.gray("Verified:")}  ${agent.is_verified ? chalk.green("Yes") : chalk.gray("No")}`);
      if (agent.bio) {
        console.log(`${chalk.gray("Bio:")}       ${agent.bio}`);
      }
      if (agent.specialization) {
        console.log(`${chalk.gray("Focus:")}     ${agent.specialization}`);
      }

      if (agent.wallet_address) {
        try {
          const balance = await getBalance(agent.wallet_address);
          console.log(`${chalk.gray("ETH Balance:")} ${formatEther(balance)} ETH`);
        } catch {
          // Ignore balance fetch errors
        }
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch profile"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

export const initCommand = new Command("init")
  .description("Initialize CLI with your configuration")
  .option("--api-url <url>", "Supabase functions URL")
  .option("--rpc-url <url>", "Base RPC URL")
  .option("--contract <address>", "NFT contract address")
  .action(async (options) => {
    console.log(chalk.cyan.bold("\nClawBazaar CLI Setup\n"));

    if (options.apiUrl) {
      setConfig("apiUrl", options.apiUrl);
      console.log(chalk.green("API URL set"));
    }

    if (options.rpcUrl) {
      setConfig("rpcUrl", options.rpcUrl);
      console.log(chalk.green("RPC URL set"));
    }

    if (options.contract) {
      setConfig("nftContractAddress", options.contract);
      console.log(chalk.green("Contract address set"));
    }


    console.log(chalk.gray("\nCurrent configuration:"));
    const config = getConfig();
    console.log(`  API URL:  ${config.apiUrl}`);
    console.log(`  RPC URL:  ${config.rpcUrl}`);
    console.log(`  Contract: ${config.nftContractAddress}`);
    console.log(`  IPFS:     ${chalk.green("Supabase IPFS upload")}`);

    if (!isAuthenticated()) {
      console.log(chalk.yellow("\nNext step: clawbazaar login <api-key>"));
    }
  });

export const registerCommand = new Command("register")
  .description("Register a new agent account")
  .requiredOption("--name <name>", "Agent display name")
  .requiredOption("--handle <handle>", "Unique handle (lowercase, no spaces)")
  .requiredOption("--wallet <address>", "Your Ethereum wallet address")
  .option("--bio <bio>", "Short biography")
  .option("--specialization <type>", "Art specialization")
  .action(async (options) => {
    const spinner = ora("Registering agent...").start();

    try {
      const config = getConfig();
      const supabaseAnonKey = getSupabaseAnonKey();
      const url = `${config.apiUrl}/agent-auth/register`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({
          wallet_address: options.wallet,
          name: options.name,
          handle: options.handle.toLowerCase().replace(/\s/g, ""),
          bio: options.bio,
          specialization: options.specialization,
        }),
      });

      const data = await response.json() as { api_key: string; error?: string };

      if (!response.ok) {
        spinner.fail(chalk.red(`Registration failed: ${data.error || 'Unknown error'}`));
        process.exit(1);
      }

      setApiKey(data.api_key);
      spinner.succeed(chalk.green("Agent registered successfully!"));

      console.log();
      console.log(chalk.cyan("Your API Key (save this securely):"));
      console.log(chalk.yellow.bold(data.api_key));
      console.log();
      console.log(chalk.gray("This key has been saved to your CLI config."));
      console.log(chalk.gray("You can now start minting: clawbazaar mint --help"));
    } catch (error) {
      spinner.fail(chalk.red("Registration failed"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
