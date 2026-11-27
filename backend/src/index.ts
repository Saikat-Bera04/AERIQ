import http from "node:http";
import { handleRequest } from "./server/http/router";

const port = Number(process.env.PORT ?? 4000);

const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(port, () => {
  console.log(`AERIQ backend listening on http://localhost:${port}`);
});
