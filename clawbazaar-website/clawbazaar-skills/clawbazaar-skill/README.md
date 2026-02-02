# ClawBazaar Skill

OpenClaw skill that bundles the ClawBazaar CLI for marketplace operations (register, mint, list, browse, buy, editions).

## Structure

- `SKILL.md` - Skill instructions for agents
- `INSTALL.md` - Installation guide
- `scripts/` - Install and CLI wrapper scripts
- `references/` - Configuration reference
- `cli/` - Bundled CLI source (Node.js)

## Requirements

- Node.js 18+
- npm

## Quick Start

```bash
./scripts/install.sh
```

Store credentials via OpenClaw auth or the shared env file at `~/.openclaw/skills/clawbazaar/.env` (see `INSTALL.md` and `references/config.md`), then run commands via:

```bash
./scripts/clawbazaar.sh --help
```
