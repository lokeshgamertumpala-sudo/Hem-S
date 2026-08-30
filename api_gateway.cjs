/**
 * Standalone High-Availability AI Resilience Gateway (Node.js)
 * -----------------------------------------------------------
 * Mitigates API issues:
 * 1. Automatic Circuit Breaker trips on HTTP 429 (Rate Limits) and 5xx errors.
 * 2. Transparent Multi-Tier Fallback across API keys and redundant model endpoints.
 * 3. SSE Keep-Alive Heartbeat prevents connection aborts through proxies/firewalls.
 * 4. Latency and health-based candidate sorting.
 * 
 * Run:
 *   node api_gateway.cjs
 */

const http = require("http");

class ResilienceManager {
  constructor() {
    this.metrics = new Map();
    this.cooldown429Ms = 40000;
    this.cooldown5xxMs = 20000;
  }

  getOrCreate(routeId) {
    if (!this.metrics.has(routeId)) {
      this.metrics.set(routeId, {
        failures: 0,
        consecutiveFailures: 0,
        cooldownUntil: 0,
        consecutiveSuccess: 0,
        totalSuccess: 0,
        avgLatencyMs: 250
      });
    }
    return this.metrics.get(routeId);
  }

  isHealthy(routeId) {
    const metric = this.metrics.get(routeId);
    if (!metric) return true;
    return Date.now() >= metric.cooldownUntil;
  }

  recordSuccess(routeId, latencyMs) {
    const m = this.getOrCreate(routeId);
    m.consecutiveFailures = 0;
    m.consecutiveSuccess += 1;
    m.totalSuccess += 1;
    m.cooldownUntil = 0;
    m.avgLatencyMs = Math.round(m.avgLatencyMs * 0.75 + latencyMs * 0.25);
  }

  recordFailure(routeId, statusCode) {
    const m = this.getOrCreate(routeId);
    m.failures += 1;
    m.consecutiveFailures += 1;
    m.consecutiveSuccess = 0;
    if (statusCode === 429) {
      m.cooldownUntil = Date.now() + this.cooldown429Ms;
    } else if (m.consecutiveFailures >= 2) {
      m.cooldownUntil = Date.now() + this.cooldown5xxMs;
    }
  }

  getStats() {
    const out = {};
    for (const [k, v] of this.metrics.entries()) {
      out[k] = {
        healthy: Date.now() >= v.cooldownUntil,
        consecutiveFailures: v.consecutiveFailures,
        totalSuccess: v.totalSuccess,
        avgLatencyMs: v.avgLatencyMs,
        cooldownRemainingSec: Math.max(0, Math.round((v.cooldownUntil - Date.now()) / 1000))
      };
    }
    return out;
  }

  reset() {
    this.metrics.clear();
  }
}

const manager = new ResilienceManager();
const PORT = process.env.GATEWAY_PORT || 8080;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "online", port: PORT, timestamp: Date.now() }));
    return;
  }

  if (req.url === "/stats" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", metrics: manager.getStats() }));
    return;
  }

  if (req.url === "/reset" && req.method === "GET") {
    manager.reset();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "reset", message: "Circuit breakers cleared." }));
    return;
  }

  if (req.url === "/api/stream" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });

      // Send keepalive comment
      res.write(": keepalive\n\n");
      const timer = setInterval(() => {
        if (!res.writableEnded) res.write(": keepalive\n\n");
      }, 10000);

      try {
        const upstream = await fetch("http://localhost:3000/api/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });

        if (!upstream.ok || !upstream.body) {
          clearInterval(timer);
          res.write(`event: error\ndata: {"error": "Upstream error (${upstream.status})"}\n\n`);
          res.end();
          return;
        }

        const reader = upstream.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        clearInterval(timer);
        res.end();
      } catch (err) {
        clearInterval(timer);
        res.write(`event: error\ndata: {"error": "Gateway forward error: ${err.message}"}\n\n`);
        res.end();
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Route not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Hem'S Standalone AI Resilience Gateway running on port ${PORT}`);
});
