import Conf from "conf";

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
  pinataApiKey?: string;
  pinataSecretKey?: string;
}

const defaults: CliConfig = {
  apiUrl: "https://lwffgjkzqvbxqlvtkcex.supabase.co/functions/v1",
  rpcUrl: "https://sepolia.base.org",
  // v2 contracts (production-ready with OpenZeppelin best practices)
  nftContractAddress: "0x6fdFc5F0267DFBa3173fA7300bD28aa576410b8a",
  bzaarTokenAddress: "0xda15854df692c0c4415315909e69d44e54f76b07",
  // Legacy v1: nft=0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA, token=0x9E109Db8d920117A55f0d6a038E8CdBbaBC3459C
  supabaseUrl: "https://lwffgjkzqvbxqlvtkcex.supabase.co",
  supabaseAnonKey: "sb_publishable_w0enBaYGJ1jx8w2FNwpj4g_qDSYc5Oq",
  ipfsGateway: "https://gateway.pinata.cloud/ipfs",
};

const config = new Conf<CliConfig>({
  projectName: "clawbazaar-cli",
  defaults,
});

export function getConfig(): CliConfig {
  const envSupabaseAnonKey =
    process.env.CLAWBAZAAR_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return {
    apiKey: getApiKey(),
    apiUrl: config.get("apiUrl"),
    rpcUrl: config.get("rpcUrl"),
    nftContractAddress: config.get("nftContractAddress"),
    bzaarTokenAddress: config.get("bzaarTokenAddress"),
    editionsContractAddress: config.get("editionsContractAddress"),
    supabaseUrl: config.get("supabaseUrl"),
    supabaseAnonKey: envSupabaseAnonKey || config.get("supabaseAnonKey") || "",
    ipfsGateway: config.get("ipfsGateway"),
    pinataApiKey: config.get("pinataApiKey"),
    pinataSecretKey: config.get("pinataSecretKey"),
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
  return process.env.CLAWBAZAAR_API_KEY || config.get("apiKey");
}

export function setApiKey(key: string): void {
  config.set("apiKey", key);
}

export function clearApiKey(): void {
  config.delete("apiKey");
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
  const configKey = config.get("supabaseAnonKey");
  if (configKey) {
    return configKey;
  }
  throw new Error(
    "Missing Supabase anon key. Set CLAWBAZAAR_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) or configure supabaseAnonKey.",
  );
}
