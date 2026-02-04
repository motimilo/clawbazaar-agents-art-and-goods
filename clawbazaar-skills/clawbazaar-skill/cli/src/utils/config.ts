import Conf from "conf";
import fs from "fs";
import os from "os";
import path from "path";

export interface CliConfig {
  apiKey?: string;
  apiUrl: string;
  rpcUrl: string;
  nftContractAddress: string;
  bzaarTokenAddress: string;
  editionsContractAddress?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  ipfsGateway: string;
}

const defaults: CliConfig = {
  apiUrl: "https://lwffgjkzqvbxqlvtkcex.supabase.co/functions/v1",
  rpcUrl: "https://mainnet.base.org",
  // v2 contracts (production-ready with OpenZeppelin best practices)
  nftContractAddress: "0x345590cF5B3E7014B5c34079e7775F99DE3B4642",
  bzaarTokenAddress: "0xda15854df692c0c4415315909e69d44e54f76b07",
  editionsContractAddress: "0x20380549d6348f456e8718b6D83b48d0FB06B29a",
  supabaseUrl: "https://lwffgjkzqvbxqlvtkcex.supabase.co",
  supabaseAnonKey: "sb_publishable_w0enBaYGJ1jx8w2FNwpj4g_qDSYc5Oq",
  ipfsGateway: "https://ipfs.io/ipfs",
};

const config = new Conf<CliConfig>({
  projectName: "clawbazaar-cli",
  defaults,
});

const sharedEnvPath =
  process.env.CLAWBAZAAR_SHARED_ENV_PATH ||
  path.join(os.homedir(), ".openclaw", "skills", "clawbazaar", ".env");

let sharedEnvCache: Record<string, string> | null = null;

function readSharedEnv(): Record<string, string> {
  if (sharedEnvCache) return sharedEnvCache;
  if (!fs.existsSync(sharedEnvPath)) {
    sharedEnvCache = {};
    return sharedEnvCache;
  }

  const content = fs.readFileSync(sharedEnvPath, "utf8");
  const env: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  sharedEnvCache = env;
  return env;
}

function writeSharedEnvKey(key: string, value: string): void {
  const dir = path.dirname(sharedEnvPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines = fs.existsSync(sharedEnvPath)
    ? fs.readFileSync(sharedEnvPath, "utf8").split(/\r?\n/)
    : [];

  let found = false;
  const updated = lines.map((line) => {
    if (line.trim().startsWith("#") || !line.includes("=")) return line;
    const [existingKey] = line.split("=");
    if (existingKey.trim() !== key) return line;
    found = true;
    return `${key}=${value}`;
  });

  if (!found) {
    updated.push(`${key}=${value}`);
  }

  fs.writeFileSync(sharedEnvPath, updated.filter(Boolean).join("\n") + "\n", {
    mode: 0o600,
  });

  sharedEnvCache = null;
}

function deleteSharedEnvKey(key: string): void {
  if (!fs.existsSync(sharedEnvPath)) return;
  const lines = fs.readFileSync(sharedEnvPath, "utf8").split(/\r?\n/);
  const updated = lines.filter((line) => {
    if (line.trim().startsWith("#") || !line.includes("=")) return true;
    const [existingKey] = line.split("=");
    return existingKey.trim() !== key;
  });
  fs.writeFileSync(sharedEnvPath, updated.filter(Boolean).join("\n") + "\n", {
    mode: 0o600,
  });
  sharedEnvCache = null;
}

export function getConfig(): CliConfig {
  const envApiUrl = process.env.CLAWBAZAAR_API_URL;
  const envRpcUrl = process.env.CLAWBAZAAR_RPC_URL || process.env.RPC_URL;
  const envNftAddress =
    process.env.CLAWBAZAAR_NFT_CONTRACT_ADDRESS ||
    process.env.NFT_CONTRACT_ADDRESS;
  const envTokenAddress =
    process.env.CLAWBAZAAR_BAZAAR_TOKEN_ADDRESS ||
    process.env.BAZAAR_TOKEN_ADDRESS;
  const envEditionsAddress =
    process.env.CLAWBAZAAR_EDITIONS_CONTRACT_ADDRESS ||
    process.env.EDITIONS_CONTRACT_ADDRESS;
  const envSupabaseUrl =
    process.env.CLAWBAZAAR_SUPABASE_URL || process.env.SUPABASE_URL;
  const envSupabaseAnonKey =
    process.env.CLAWBAZAAR_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const sharedEnv = readSharedEnv();
  return {
    apiKey: getApiKey(),
    apiUrl: envApiUrl || config.get("apiUrl"),
    rpcUrl: envRpcUrl || config.get("rpcUrl"),
    nftContractAddress: envNftAddress || config.get("nftContractAddress"),
    bzaarTokenAddress: envTokenAddress || config.get("bzaarTokenAddress"),
    editionsContractAddress:
      envEditionsAddress || config.get("editionsContractAddress"),
    supabaseUrl:
      envSupabaseUrl ||
      sharedEnv.CLAWBAZAAR_SUPABASE_URL ||
      sharedEnv.SUPABASE_URL ||
      config.get("supabaseUrl"),
    supabaseAnonKey:
      envSupabaseAnonKey ||
      sharedEnv.CLAWBAZAAR_SUPABASE_ANON_KEY ||
      sharedEnv.SUPABASE_ANON_KEY ||
      config.get("supabaseAnonKey") ||
      "",
    ipfsGateway: config.get("ipfsGateway"),
  };
}

export function setConfig<K extends keyof CliConfig>(
  key: K,
  value: CliConfig[K],
): void {
  config.set(key, value);
}

export function clearConfig(): void {
  config.clear();
}

export function getApiKey(): string | undefined {
  const envKey = process.env.CLAWBAZAAR_API_KEY;
  if (envKey) return envKey;
  const sharedEnv = readSharedEnv();
  if (sharedEnv.CLAWBAZAAR_API_KEY) return sharedEnv.CLAWBAZAAR_API_KEY;
  return config.get("apiKey");
}

export function setApiKey(key: string): void {
  config.set("apiKey", key);
  writeSharedEnvKey("CLAWBAZAAR_API_KEY", key);
}

export function clearApiKey(): void {
  config.delete("apiKey");
  deleteSharedEnvKey("CLAWBAZAAR_API_KEY");
}

export function isAuthenticated(): boolean {
  return !!getApiKey();
}

export function getSupabaseAnonKey(): string {
  const envKey =
    process.env.CLAWBAZAAR_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (envKey) {
    return envKey;
  }
  const sharedEnv = readSharedEnv();
  if (sharedEnv.CLAWBAZAAR_SUPABASE_ANON_KEY) {
    return sharedEnv.CLAWBAZAAR_SUPABASE_ANON_KEY;
  }
  if (sharedEnv.SUPABASE_ANON_KEY) {
    return sharedEnv.SUPABASE_ANON_KEY;
  }
  const configKey = config.get("supabaseAnonKey");
  if (configKey) {
    return configKey;
  }
  throw new Error(
    "Missing Supabase anon key. Set CLAWBAZAAR_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) or configure supabaseAnonKey.",
  );
}
