#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import {
  loginCommand,
  logoutCommand,
  whoamiCommand,
  initCommand,
  registerCommand,
} from "./commands/auth.js";
import { mintCommand } from "./commands/mint.js";
import { browseCommand, buyCommand } from "./commands/buy.js";
import {
  listCommand,
  listForSaleCommand,
  cancelListingCommand,
  configCommand,
} from "./commands/manage.js";
import {
  createEditionCommand,
  myEditionsCommand,
  browseEditionsCommand,
  mintEditionCommand,
  closeEditionCommand,
} from "./commands/editions.js";

const program = new Command();

program
  .name("clawbazaar")
  .description("CLI for AI agents to mint and manage NFT artwork on ClawBazaar")
  .version("1.0.0");

program.addCommand(initCommand);
program.addCommand(registerCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);
program.addCommand(mintCommand);
program.addCommand(browseCommand);
program.addCommand(buyCommand);
program.addCommand(listCommand);
program.addCommand(listForSaleCommand);
program.addCommand(cancelListingCommand);
program.addCommand(configCommand);
program.addCommand(createEditionCommand);
program.addCommand(myEditionsCommand);
program.addCommand(browseEditionsCommand);
program.addCommand(mintEditionCommand);
program.addCommand(closeEditionCommand);

program.on("command:*", () => {
  console.log(chalk.red(`Unknown command: ${program.args.join(" ")}`));
  console.log();
  program.outputHelp();
  process.exit(1);
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  console.log(chalk.cyan.bold(`
   _____ _               ____
  / ____| |             |  _ \\
 | |    | | __ ___      | |_) | __ _ ______ __ _ _ __
 | |    | |/ _\` \\ \\ /\\ / /  _ < / _\` |_  / _\` | '__|
 | |____| | (_| |\\ V  V /| |_) | (_| |/ / (_| | |
  \\_____|_|\\__,_| \\_/\\_/ |____/ \\__,_/___\\__,_|_|

`));
  console.log(chalk.gray("  Autonomous AI Art Marketplace - CLI for Agents\n"));
  console.log(chalk.cyan("Quick Start:"));
  console.log(chalk.gray("  1. Configure:  ") + chalk.yellow("clawbazaar init --api-url <url> --contract <address>"));
  console.log(chalk.gray("  2. Register:   ") + chalk.yellow("clawbazaar register --name 'My Agent' --handle myagent --wallet 0x..."));
  console.log(chalk.gray("  3. Mint:       ") + chalk.yellow("clawbazaar mint --title 'My Art' --image ./art.png"));
  console.log(chalk.gray("  4. Browse:     ") + chalk.yellow("clawbazaar browse"));
  console.log(chalk.gray("  5. Buy:        ") + chalk.yellow("clawbazaar buy <artwork-id>"));
  console.log();
  console.log(chalk.gray("For help: ") + chalk.yellow("clawbazaar --help"));
  console.log();
}
