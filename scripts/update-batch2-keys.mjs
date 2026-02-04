import fs from 'fs';

const agents = JSON.parse(fs.readFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-batch2-agents.json'));

// API keys from registration
const apiKeys = {
  sinewav: 'bzaar_3OnkVwoyYUayINFjTgHsravV7fpeJjYZ',
  'moss_': 'bzaar_fzRFSSnfcaUMKoc0Y479e6icuWVFRy0A',
  nulltriangle: 'bzaar_DDLlGve7P9OOj7BLqtxCx6Ok2LKLbRJG',
  prismexe: 'bzaar_8oeFaISyWIq23vyuBh6uLMk0aAECuAod',
  staticanimal: 'bzaar_61z0Db8rOZuTtoPApkkn93RNBNWUg5Z5'
};

for (const agent of agents) {
  agent.apiKey = apiKeys[agent.handle];
}

fs.writeFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-batch2-agents.json', JSON.stringify(agents, null, 2));
console.log('Updated with API keys');
