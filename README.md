# Ashi Diamonds MCP Server

An MCP (Model Context Protocol) server that exposes the Ashi Diamonds B2B API as tools for use with Claude Desktop or any MCP-compatible client.

## What it does

Bridges Claude to the Ashi Diamonds retailer API, enabling natural language interactions for product search, inventory checks, cart management, order placement, wishlists, sales quotations, custom quotes, and email — all as callable tools.

## Running with Docker (recommended)

1. Copy the environment template and fill in your password:
   ```bash
   cp .env.template .env
   # Edit .env and set ASHI_PASSWORD
   ```

2. Start the server:
   ```bash
   docker compose up -d
   ```

The server will be available at `http://<host-ip>:3030/mcp`.

## Running locally

```bash
npm install
ASHI_PASSWORD=yourpassword node index.js
```

Defaults to port `3000`. Override with `PORT=xxxx`.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ASHI_JEWELER_ID` | `CARTJA11720` | Your Ashi jeweler ID |
| `ASHI_USERNAME` | `avalontester1@gmail.com` | Login username |
| `ASHI_PASSWORD` | _(required)_ | Login password |
| `ASHI_JEWELSOFTID` | _(empty)_ | Optional Jewel-Soft ID |
| `PORT` | `3000` | HTTP port the server listens on |

## Connecting Claude Desktop

Claude Desktop connects to remote MCP servers via the `mcp-remote` proxy. Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ashi-diamonds": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://<host-ip>:3030/mcp", "--allow-http"]
    }
  }
}
```

Replace `<host-ip>` with the IP address of the machine running the server (e.g. `192.168.88.151`).

> **Note:** `--allow-http` is required because `mcp-remote` blocks plain HTTP for non-localhost addresses by default. If you set up HTTPS on the server, you can remove this flag.

`claude_desktop_config.json` is located at:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Restart Claude Desktop after saving.

## Endpoints

| Path | Method | Description |
|---|---|---|
| `/mcp` | GET / POST | MCP protocol endpoint |
| `/health` | GET | Returns server status and tool count |
