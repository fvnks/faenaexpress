// Puente TLS para la CLI de Prisma.
//
// El motor de Prisma en Windows usa schannel, que solo negocia TLS 1.2 y falla
// contra el certificado ECDSA de PostgreSQL gestionado por Coolify. Node, en
// cambio, negocia TLS 1.3 y valida la CA sin problemas (igual que el driver
// `pg` que usa la app en tiempo de ejecución).
//
// Este proceso escucha en localhost y, por cada conexión, abre una conexión TLS
// *verificada* contra el servidor real y reenvía el protocolo de PostgreSQL.
// Así la CLI se conecta en claro a 127.0.0.1 y, hacia Internet, todo va
// cifrado y verificado.
import net from "node:net";
import tls from "node:tls";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SSL_REQUEST = Buffer.from([0, 0, 0, 8, 0x04, 0xd2, 0x16, 0x2f]);
const isIp = (host) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

function parseTarget(connectionString) {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode") ?? "prefer";
  const caRelative = url.searchParams.get("sslrootcert");
  const ca = caRelative ? fs.readFileSync(path.resolve(ROOT, caRelative)) : undefined;

  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    ca,
    // Verificamos siempre que tengamos la CA; si no, el TLS sería inseguro.
    rejectUnauthorized: Boolean(ca) || sslmode === "verify-full" || sslmode === "verify-ca",
    servername: isIp(url.hostname) ? undefined : url.hostname,
  };
}

function handleClient(client, target) {
  const upstream = net.connect(target.port, target.host);
  const pending = [];
  let tlsUpstream = null;
  let ready = false;
  let inspected = false;

  const cleanup = () => {
    client.destroy();
    upstream.destroy();
    tlsUpstream?.destroy();
  };

  client.on("error", cleanup);
  upstream.on("error", cleanup);
  client.on("close", cleanup);

  const send = (chunk) => {
    if (!ready) {
      pending.push(chunk);
      return;
    }
    if (!inspected) {
      // Si el cliente pide SSL, le decimos "no" y seguimos en claro por localhost.
      pending.push(chunk);
      const buffer = Buffer.concat(pending);
      pending.length = 0;
      inspected = true;
      if (buffer.length >= 8 && buffer.readUInt32BE(0) === 8 && buffer.readUInt32BE(4) === 80877103) {
        client.write(Buffer.from("N"));
        if (buffer.length > 8) tlsUpstream.write(buffer.subarray(8));
      } else {
        tlsUpstream.write(buffer);
      }
      return;
    }
    tlsUpstream.write(chunk);
  };

  client.on("data", send);
  client.on("end", () => tlsUpstream?.end());

  upstream.once("connect", () => upstream.write(SSL_REQUEST));

  upstream.once("data", (chunk) => {
    if (chunk[0] !== 0x53) {
      // El servidor no ofrece TLS.
      cleanup();
      return;
    }
    if (chunk.length > 1) upstream.unshift(chunk.subarray(1));

    tlsUpstream = tls.connect(
      {
        socket: upstream,
        host: target.host,
        servername: target.servername,
        ca: target.ca,
        rejectUnauthorized: target.rejectUnauthorized,
      },
      () => {
        ready = true;
        tlsUpstream.on("data", (data) => client.write(data));
        tlsUpstream.on("error", cleanup);
        tlsUpstream.on("close", () => client.destroy());
        const buffered = pending.splice(0);
        for (const part of buffered) send(part);
      },
    );
    tlsUpstream.on("error", cleanup);
  });
}

export function createBridge({ connectionString, host = "127.0.0.1", port = 6433 }) {
  const target = parseTarget(connectionString);
  const server = net.createServer((client) => handleClient(client, target));
  
  server.on("error", (err) => {
    console.error("Server error:", err);
  });

  return {
    host,
    port,
    listen() {
      return new Promise((resolve, reject) => {
        server.once("error", (err) => {
          console.error("Server error:", err);
          reject(err);
        });
        server.listen(port, host, () => {
          console.error(`Server listening on ${host}:${port}`);
          console.error(`Server address:`, server.address());
          server.removeListener("error", reject);
          resolve();
        });
      });
    },
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

// Uso directo: `node scripts/pg-tls-bridge.mjs` para depurar.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta DATABASE_URL");
    process.exit(1);
  }
  const bridge = createBridge({
    connectionString,
    port: Number(process.env.PG_BRIDGE_PORT || 15433),
  });
  bridge.listen().then(() => {
    console.error(`Puente TLS escuchando en ${bridge.host}:${bridge.port}`);
  }).catch(err => {
    console.error("Failed to start bridge:", err);
    process.exit(1);
  });
  
  // Keep process alive when run directly
  const shutdown = async (code) => {
    console.error("Cerrando puente...");
    await bridge.close();
    process.exit(code ?? 0);
  };
  process.on("SIGINT", () => shutdown(130));
  process.on("SIGTERM", () => shutdown(143));
  
  // Handle unhandled rejections
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });
  
  // Keep the process alive
  await new Promise(() => {});
}
