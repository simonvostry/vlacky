import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { encode } from "next-auth/jwt";

// Run after `npm run build`. A separate server uses disposable auth settings.
// The database URL deliberately points to an unreachable local endpoint so a
// regression in an API guard can never write to the real collection.
test("production server protects pages, images, API methods and session integrity", { timeout: 90_000 }, async () => {
  const port = 3107;
  const origin = `http://localhost:${port}`;
  const secret = randomBytes(48).toString("base64url");
  const owner = "auth-test@example.com";
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    env: {
      ...process.env, NODE_ENV: "production", AUTH_SECRET: secret,
      AUTH_ALLOWED_EMAIL: owner, AUTH_GOOGLE_ID: "test-client", AUTH_GOOGLE_SECRET: "test-secret",
      AUTH_TRUST_HOST: "true", AUTH_URL: origin,
      TURSO_DATABASE_URL: "http://127.0.0.1:1", TURSO_AUTH_TOKEN: "test-only",
    },
    stdio: "pipe",
  });
  let logs = "";
  server.stdout.on("data", chunk => { logs += chunk; });
  server.stderr.on("data", chunk => { logs += chunk; });
  const request = (path: string, options: RequestInit = {}) => fetch(origin + path, { redirect: "manual", ...options });
  const cookie = async (email: string, verified: boolean, signingSecret = secret, maxAge = 3600) => {
    const salt = "authjs.session-token";
    const token = await encode({ secret: signingSecret, salt, maxAge, token: { sub: "test-user", email, googleEmailVerified: verified } });
    return `${salt}=${token}`;
  };
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (server.exitCode !== null) throw new Error(`Test server exited: ${logs}`);
      try { ready = (await request("/prihlaseni")).status === 200; } catch { /* starting */ }
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, "Test server did not start");
    for (const [path, contentType] of [["/favicon.ico", "image/"], ["/icon.png", "image/png"], ["/apple-icon.png", "image/png"]]) {
      const response = await request(path);
      assert.equal(response.status, 200, `${path} must load before login`);
      assert.ok(response.headers.get("content-type")?.startsWith(contentType));
      assert.ok((await response.arrayBuffer()).byteLength > 0);
    }
    for (const path of ["/icon.png/private", "/img/icon.png", "/apple-icon.png/private", "/faviconXico"]) {
      const response = await request(path);
      assert.equal(new URL(response.headers.get("location")!, origin).pathname, "/prihlaseni", `${path} must remain protected`);
    }
    for (const path of ["/", "/katalog", "/katalog/1", "/lokomotivy", "/lokomotivy/1", "/lokomotivy/1/upravit", "/lokomotivy/novy", "/nakladni-vozy", "/nakladni-vozy/1", "/nakladni-vozy/1/upravit", "/nakladni-vozy/novy", "/vozy", "/vozy/1", "/vozy/1/upravit", "/vozy/novy", "/soupravy", "/soupravy/1", "/soupravy/1/upravit", "/soupravy/novy", "/vozidla", "/vozidla/1", "/vozidla/1/upravit", "/vozidla/novy", "/dcc", "/img/cd-bmee.gif"]) {
      const response = await request(path);
      assert.ok([302, 303, 307].includes(response.status), `${path}: ${response.status}`);
      const location = new URL(response.headers.get("location")!, origin);
      assert.equal(location.pathname, "/prihlaseni");
      assert.equal(location.searchParams.get("callbackUrl"), path);
    }
    for (const [path, methods] of [
      ["/api/varianty-vozu/1", ["PUT"]],
      ["/api/vozidla/1/dekodery", ["GET", "PUT"]],
      ["/api/vozidla", ["GET", "POST"]], ["/api/vozidla/1", ["GET", "PUT", "DELETE"]],
      ["/api/vlaky", ["GET", "POST"]], ["/api/vlaky/1", ["GET", "PUT", "DELETE"]],
      ["/api/vlaky/1/vozidla", ["POST", "PUT", "DELETE"]],
    ] as const) {
      for (const method of methods) {
        const response = await request(path, { method, headers: { "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" } });
        assert.equal(response.status, 401, `${method} ${path}`);
        assert.deepEqual(await response.json(), { error: "Unauthorized" });
      }
    }
    for (const invalid of [
      await cookie("stranger@example.com", true), await cookie(owner, false),
      await cookie(owner, true, "wrong-secret"), await cookie(owner, true, secret, -3600),
    ]) {
      assert.equal((await request("/api/vozidla", { headers: { cookie: invalid } })).status, 401);
      assert.equal(await (await request("/api/auth/session", { headers: { cookie: invalid } })).json(), null);
    }
    const valid = await cookie(owner, true);
    const session = await (await request("/api/auth/session", { headers: { cookie: valid } })).json();
    assert.equal(session.user.email, owner);
    assert.equal((await request("/img/cd-bmee.gif", { headers: { cookie: valid } })).status, 200);
    const login = await request("/prihlaseni?callbackUrl=%2Fsoupravy%2F1", { headers: { cookie: valid } });
    assert.equal(new URL(login.headers.get("location")!, origin).pathname, "/soupravy/1");
    const oauth = await request("/api/auth/callback/google?code=fake&state=fake");
    assert.ok([302, 303].includes(oauth.status));
    assert.equal(new URL(oauth.headers.get("location")!, origin).pathname, "/prihlaseni");
    const html = await (await request("/prihlaseni")).text();
    assert.ok(html.includes('rel="icon"') && html.includes('/icon.png'));
    assert.ok(html.includes('rel="apple-touch-icon"') && html.includes('/apple-icon.png'));
    assert.ok(html.includes("Přihlásit se přes Google"));
    assert.ok(!html.includes(owner));
    assert.ok(!html.includes(secret));
  } finally {
    server.kill("SIGTERM");
    await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once("exit", () => resolve()); });
  }
});
