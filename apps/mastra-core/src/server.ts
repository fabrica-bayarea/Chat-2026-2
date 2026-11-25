import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadServerConfig } from "./config/server.config.js";
import { closeMcpClient } from "./mcp/client.js";

const config = loadServerConfig();

const server = serve({ fetch: createApp().fetch, port: config.port }, (info) => {
  console.log(`Servidor ouvindo em http://localhost:${info.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close();
    void closeMcpClient().finally(() => process.exit(0));
  });
}
