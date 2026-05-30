#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import http from "http";

const BASE_URL = "https://aichatbot.ashidiamonds.com";
const PORT = process.env.PORT || 3000;

const CREDENTIALS = {
  jewelerid:   process.env.ASHI_JEWELER_ID  || "CARTJA11720",
  userName:    process.env.ASHI_USERNAME    || "avalontester1@gmail.com",
  password:    process.env.ASHI_PASSWORD    || "",
  jewelsoftid: process.env.ASHI_JEWELSOFTID || "",
};

// ── Token cache ───────────────────────────────────────────────────────────────
let cachedToken = null;

async function getToken() {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${BASE_URL}/api/authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CREDENTIALS),
  });
  const data = await res.json();
  const token =
    data?.responseData?.token ||
    data?.responseData?.accessToken ||
    data?.responseData ||
    data?.token;
  if (!token || typeof token !== "string") {
    throw new Error(`Login failed: ${data?.responseMessage || JSON.stringify(data)}`);
  }
  cachedToken = token;
  return token;
}

async function apiFetch(path, method = "GET", body = undefined) {
  console.error(`[API] ${method} ${path}`);
  const token = await getToken();
  const opts = {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (res.status === 401) {
    cachedToken = null;
    opts.headers.Authorization = `Bearer ${await getToken()}`;
    return (await fetch(`${BASE_URL}${path}`, opts)).json();
  }
  return res.json();
}

// ── Tools ─────────────────────────────────────────────────────────────────────
const TOOLS = [
  { name: "login", description: "Login to Ashi Diamonds API and refresh the JWT token.", inputSchema: { type: "object", properties: {} } },
  { name: "search_products", description: "Search and filter products by keyword, price range, and sort order.", inputSchema: { type: "object", properties: { keywords: { type: "string" }, pricemin: { type: "number" }, pricemax: { type: "number" }, orderby: { type: "integer" }, pagesize: { type: "integer" } } } },
  { name: "get_product_details", description: "Get detailed info for a single product by style ID.", inputSchema: { type: "object", required: ["style_id"], properties: { style_id: { type: "string" } } } },
  { name: "get_product_details_bulk", description: "Get details for multiple products by comma-separated style IDs.", inputSchema: { type: "object", required: ["style_ids"], properties: { style_ids: { type: "string" } } } },
  { name: "get_product_specifications", description: "Get metal color, karat, diamond weight, quality specs by style ID.", inputSchema: { type: "object", required: ["style_id"], properties: { style_id: { type: "string" } } } },
  { name: "get_product_measurements", description: "Get product measurements by style ID.", inputSchema: { type: "object", required: ["style_id"], properties: { style_id: { type: "string" } } } },
  { name: "get_product_variants", description: "Get available variants of a style.", inputSchema: { type: "object", required: ["style_id"], properties: { style_id: { type: "string" } } } },
  { name: "get_related_products", description: "Get related products for a style ID.", inputSchema: { type: "object", required: ["style_id"], properties: { style_id: { type: "string" } } } },
  { name: "get_similar_styles", description: "Get visually similar products to a given style ID.", inputSchema: { type: "object", required: ["style_id"], properties: { style_id: { type: "string" } } } },
  { name: "get_style_history", description: "Get full order/memo/stock history of a style ID.", inputSchema: { type: "object", required: ["style_id"], properties: { style_id: { type: "string" } } } },
  { name: "check_inventory_status", description: "Check inventory availability for a product.", inputSchema: { type: "object", required: ["style_id"], properties: { style_id: { type: "string" }, quantity: { type: "integer" } } } },
  { name: "get_recently_viewed", description: "Get recently viewed products for the logged-in user.", inputSchema: { type: "object", properties: {} } },
  { name: "get_cart", description: "Retrieve all items in the order cart.", inputSchema: { type: "object", properties: {} } },
  { name: "add_to_cart", description: "Add one or more products to the order cart.", inputSchema: { type: "object", required: ["items"], properties: { items: { type: "array", items: { type: "object", properties: { style_id: { type: "string" }, quantity: { type: "integer" } } } } } } },
  { name: "get_order_fields", description: "Get required fields needed to place an order.", inputSchema: { type: "object", properties: {} } },
  { name: "submit_order_fields", description: "Submit PO number, shipping details to prepare the order.", inputSchema: { type: "object", properties: { poNumber: { type: "string" }, poShipDate: { type: "string" }, poCancelDate: { type: "string" }, shippingMethod: { type: "string" }, shippingDBA: { type: "string" }, orderComment: { type: "string" } } } },
  { name: "place_order", description: "Finalize and submit the order.", inputSchema: { type: "object", properties: {} } },
  { name: "get_order_status", description: "Check order status by PO, Ashi order number, date range, or status.", inputSchema: { type: "object", properties: { ashi_order_no: { type: "string" }, po_no: { type: "string" }, web_ref_no: { type: "string" }, order_status: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" } } } },
  { name: "get_wishlist", description: "Get all wishlist items.", inputSchema: { type: "object", properties: {} } },
  { name: "add_to_wishlist", description: "Add style IDs to the wishlist.", inputSchema: { type: "object", required: ["items"], properties: { items: { type: "array", items: { type: "object", properties: { style_id: { type: "string" }, quantity: { type: "integer" } } } } } } },
  { name: "wishlist_to_cart", description: "Move all wishlist items to the order cart.", inputSchema: { type: "object", properties: {} } },
  { name: "get_sales_quotations", description: "Get all sales quotations for the user.", inputSchema: { type: "object", properties: {} } },
  { name: "get_sales_quotation_detail", description: "Get detail of a specific sales quotation.", inputSchema: { type: "object", required: ["sqid"], properties: { sqid: { type: "string" } } } },
  { name: "create_sales_quotation", description: "Create a new sales quotation.", inputSchema: { type: "object", properties: { quotationName: { type: "string" }, products: { type: "array", items: { type: "object", properties: { style_id: { type: "string" }, quantity: { type: "integer" } } } } } } },
  { name: "add_items_to_quotation", description: "Add style IDs to an existing sales quotation.", inputSchema: { type: "object", required: ["quotationid", "products"], properties: { quotationid: { type: "integer" }, products: { type: "array", items: { type: "object", properties: { style_id: { type: "string" }, quantity: { type: "integer" } } } }, comment: { type: "string" } } } },
  { name: "remove_items_from_quotation", description: "Remove style IDs from a sales quotation.", inputSchema: { type: "object", required: ["quotationid", "products"], properties: { quotationid: { type: "integer" }, products: { type: "array", items: { type: "object", properties: { style_id: { type: "string" } } } } } } },
  { name: "quotation_to_cart", description: "Move a sales quotation to the order cart.", inputSchema: { type: "object", required: ["quotationid"], properties: { quotationid: { type: "integer" } } } },
  { name: "get_custom_quote_options", description: "Get customization options for a custom quote.", inputSchema: { type: "object", properties: { style_id: { type: "string" } } } },
  { name: "create_custom_quote", description: "Submit a custom quote request.", inputSchema: { type: "object", properties: { style_id: { type: "string" }, customization_type: { type: "array", items: { type: "string" } }, selected_options: { type: "object" }, costBudget: { type: "number" }, comments: { type: "string" } } } },
  { name: "get_special_order_options", description: "Get special order options for a style.", inputSchema: { type: "object", properties: { style_id: { type: "string" } } } },
  { name: "check_special_order_variant", description: "Check availability of a special order variant.", inputSchema: { type: "object", properties: { base_style_id: { type: "string" }, size: { type: "number" }, metal_color: { type: "string" }, metal_karat: { type: "string" }, comments: { type: "string" } } } },
  { name: "add_special_order_to_cart", description: "Add special order items to the cart.", inputSchema: { type: "object", required: ["spoOrderProductdata"], properties: { spoOrderProductdata: { type: "array", items: { type: "object" } } } } },
  { name: "get_email_fields", description: "Get required fields for sending style details via email.", inputSchema: { type: "object", properties: {} } },
  { name: "send_style_email", description: "Send product style details to a customer via email.", inputSchema: { type: "object", properties: { style_id: { type: "string" }, customerName: { type: "string" }, customerEmail: { type: "string" }, subjectLine: { type: "string" }, comments: { type: "string" } } } },
  { name: "get_ppcc_id", description: "Retrieve Catalog, POS, and Program data.", inputSchema: { type: "object", properties: {} } },
  { name: "get_products_by_ppcc", description: "Fetch products by PPCC ID.", inputSchema: { type: "object", required: ["ppcc_id"], properties: { ppcc_id: { type: "string" } } } },
];

async function handleTool(name, args) {
  console.error(`[TOOL] ${name}`);
  switch (name) {
    case "login": cachedToken = null; await getToken(); return { success: true, message: "Login successful." };
    case "search_products": return apiFetch("/api/products/search", "POST", args);
    case "get_product_details": return apiFetch(`/api/products/${args.style_id}/details`);
    case "get_product_details_bulk": return apiFetch("/api/products/details", "POST", { style_ids: args.style_ids });
    case "get_product_specifications": return apiFetch(`/api/products/${args.style_id}/specifications`);
    case "get_product_measurements": return apiFetch(`/api/products/${args.style_id}/measurement`);
    case "get_product_variants": return apiFetch(`/api/products/${args.style_id}/variants`);
    case "get_related_products": return apiFetch(`/api/products/${args.style_id}/related`);
    case "get_similar_styles": return apiFetch(`/api/products/${args.style_id}/similarstyles`);
    case "get_style_history": return apiFetch(`/api/products/${args.style_id}/stylehistory`);
    case "check_inventory_status": return apiFetch("/api/products/inventory-status", "POST", { style_id: args.style_id, quantity: args.quantity ?? 1 });
    case "get_recently_viewed": return apiFetch("/api/products/recentlyviewed");
    case "get_cart": return apiFetch("/api/cart");
    case "add_to_cart": return apiFetch("/api/cart/add", "POST", args.items);
    case "get_order_fields": return apiFetch("/api/cart/placeorder/getfields");
    case "submit_order_fields": return apiFetch("/api/cart/placeorder/postfields", "POST", args);
    case "place_order": return apiFetch("/api/cart/placeorder", "POST");
    case "get_order_status": return apiFetch("/api/orderstatus", "POST", args);
    case "get_wishlist": return apiFetch("/api/wishlist");
    case "add_to_wishlist": return apiFetch("/api/wishlist/add", "POST", args.items);
    case "wishlist_to_cart": return apiFetch("/api/wishlist/movetocart", "POST");
    case "get_sales_quotations": return apiFetch("/api/salesquotation");
    case "get_sales_quotation_detail": return apiFetch(`/api/${args.sqid}/salesquotation`);
    case "create_sales_quotation": return apiFetch("/api/salesquotation/create", "POST", args);
    case "add_items_to_quotation": return apiFetch("/api/salesquotation/additem", "POST", args);
    case "remove_items_from_quotation": return apiFetch("/api/salesquotation/removeitems", "POST", args);
    case "quotation_to_cart": return apiFetch("/api/salesquotation/movetocart", "POST", { quotationid: args.quotationid });
    case "get_custom_quote_options": return args.style_id ? apiFetch(`/api/${args.style_id}/customquote`) : apiFetch("/api/customquote");
    case "create_custom_quote": return args.style_id ? apiFetch(`/api/${args.style_id}/customquote/create`, "POST", args) : apiFetch("/api/customquote/create", "POST", args);
    case "get_special_order_options": return apiFetch(`/api/specialorder/special_order_options${args.style_id ? `?style_id=${args.style_id}` : ""}`);
    case "check_special_order_variant": return apiFetch("/api/specialorder/checkspovariant", "POST", args);
    case "add_special_order_to_cart": return apiFetch("/api/specialorder/cart/add", "POST", args);
    case "get_email_fields": return apiFetch("/api/email/style-details/getfields");
    case "send_style_email": return apiFetch("/api/email/style-details", "POST", args);
    case "get_ppcc_id": return apiFetch("/api/get_ppcc_id");
    case "get_products_by_ppcc": return apiFetch(`/api/products/${args.ppcc_id}`);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ── MCP server factory ────────────────────────────────────────────────────────
function createMCPServer() {
  const server = new Server(
    { name: "ashi-diamonds", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
      const result = await handleTool(name, args ?? {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  });
  return server;
}

// ── Body parser helper ────────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve(null); }
    });
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "ashi-diamonds-mcp", tools: TOOLS.length }));
    return;
  }

  if (pathname === "/mcp") {
    console.error(`[MCP] ${req.method} from ${req.socket.remoteAddress}`);
    const body = req.method === "POST" ? await parseBody(req) : undefined;
    const server = createMCPServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => server.close().catch(() => {}));
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.error(`Ashi Diamonds MCP server listening on http://0.0.0.0:${PORT}`);
  console.error(`  MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.error(`  Health check: http://0.0.0.0:${PORT}/health`);
});