const test = require("node:test");
const assert = require("node:assert/strict");
process.env.FLOW_TOKEN_SECRET = "test-secret";
process.env.FLOW_TOKEN_TTL_SECONDS = "900";
const { createPrescreenToken, createVerifiedToken, verifyFlowToken } = require("../services/flowTokenService");
const { shouldAllow } = require("../services/riskService");

test("signed flow preserves the participant profile", () => {
    const token = createPrescreenToken({ accountId: "participant-test", age: 32, gender: "female", group: "survey-a" });
    const prescreen = verifyFlowToken(token, "prescreen");
    const verified = verifyFlowToken(createVerifiedToken(prescreen), "verified");
    assert.deepEqual(
        { id: verified.accountId, age: verified.age, gender: verified.gender, group: verified.group },
        { id: "participant-test", age: 32, gender: "female", group: "survey-a" }
    );
});

test("tampered tokens are rejected", () => {
    const token = createPrescreenToken({ accountId: "p", age: 30, gender: "male", group: "a" });
    assert.throws(() => verifyFlowToken(`${token}x`, "prescreen"));
});

test("risk logic blocks configured decisions and high scores", () => {
    process.env.RISK_LIMIT = "70";
    process.env.BLOCK_DECISIONS = "Suspicious,Fake";
    assert.equal(shouldAllow({ decision: "Real", account_score: 0.2 }), true);
    assert.equal(shouldAllow({ decision: "Real", account_score: 0.8 }), false);
    assert.equal(shouldAllow({ decision: "Suspicious", account_score: 0.2 }), false);
});
