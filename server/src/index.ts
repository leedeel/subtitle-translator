// Server entry point

import { initProxyAgents } from "./lib/utils/proxy";
import createApp from "./app";

const PORT = Number.parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

initProxyAgents();

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Subtitle Translation Server running on http://${HOST}:${PORT}`);
  console.log(`📚 API Documentation (Swagger): http://${HOST}:${PORT}/api-docs`);
  console.log(`📖 OpenAPI Spec: http://${HOST}:${PORT}/api-docs.json`);
  console.log(`🏥 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`📊 Server Info: http://${HOST}:${PORT}/api/health/info\n`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT signal received: closing HTTP server");
  process.exit(0);
});