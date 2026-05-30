/**
 * example-claude-with-mcp.js
 * 
 * Shows how to call Claude API from another container,
 * pointing it at your local ashi-mcp server via MCP URL.
 * 
 * Run: node example-claude-with-mcp.js
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// When running in Docker, use the service name: http://ashi-mcp:3000/sse
// When running locally:                          http://localhost:3000/sse
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3000/sse";

async function chat(userMessage) {
  console.log(`\nUser: ${userMessage}`);
  console.log(`Connecting to MCP at: ${MCP_SERVER_URL}\n`);

  const response = await client.beta.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: userMessage }],
    mcp_servers: [
      {
        type: "url",
        url: MCP_SERVER_URL,
        name: "ashi-diamonds",
      },
    ],
    betas: ["mcp-client-2025-04-04"],
  });

  // Extract text from response
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  console.log(`Claude: ${text}`);
  return text;
}

// Test it
await chat("Search for yellow gold rings under $3000");
