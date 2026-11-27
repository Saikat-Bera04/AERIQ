import http from "node:http";
import { validateEnv } from "./server/env";
import { handleRequest } from "./server/http/router";

validateEnv();
const port = Number(process.env.PORT ?? 4000);

const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(port, () => {
  console.log(`AERIQ backend listening on http://localhost:${port}`);
});
