const test = require("node:test");
const assert = require("node:assert/strict");
process.env.MOCK_MODE = "true";
process.env.FLOW_TOKEN_SECRET = "http-test-secret";
const app = require("../app");

test("prescreener, allow, deny and bypass protection work end to end", async (t) => {
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;

    const invalid = await fetch(`${base}/prescreener`, {
        method: "POST", redirect: "manual",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "age=17&gender=male"
    });
    assert.equal(invalid.status, 422);

    const start = await fetch(`${base}/prescreener`, {
        method: "POST", redirect: "manual",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "age=30&gender=female"
    });
    assert.equal(start.status, 303);
    const securityPath = start.headers.get("location");
    assert.match(securityPath, /^\/security\?flow=/);
    const flow = new URL(securityPath, base).searchParams.get("flow");

    const bridge = await fetch(base + securityPath);
    assert.equal(bridge.status, 200);
    assert.match(await bridge.text(), /data-flow=/);

    const check = (sessionId) => fetch(`${base}/api/check-risk`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flow, sessionId })
    });
    const allow = await check("mock-real");
    const allowBody = await allow.json();
    assert.match(allowBody.redirect, /^\/survey\?flow=/);

    const survey = await fetch(base + allowBody.redirect, { redirect: "manual" });
    assert.equal(survey.status, 200);
    assert.match(await survey.text(), /Verified participant/);

    const deny = await check("mock-fake");
    assert.equal((await deny.json()).redirect, "/security-terminate");

    const bypass = await fetch(`${base}/survey`, { redirect: "manual" });
    assert.equal(bypass.status, 302);
    assert.equal(bypass.headers.get("location"), "/security-terminate");
});
