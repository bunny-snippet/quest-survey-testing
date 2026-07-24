const test = require("node:test");
const assert = require("node:assert/strict");
process.env.FLOW_TOKEN_SECRET = "test-secret";
process.env.FLOW_TOKEN_TTL_SECONDS = "900";
const { createPrescreenToken, createVerifiedToken, verifyFlowToken } = require("../services/flowTokenService");
const { getAllSurveys, getRandomSurvey } = require("../services/surveyCatalog");
const { shouldAllow } = require("../services/riskService");
const TEST_FLOW_ID = "test-flow-id-12345678901234567890";

test("catalog contains five unique random survey variants", () => {
    const surveys = getAllSurveys();
    assert.equal(surveys.length, 5);
    assert.equal(new Set(surveys.map((survey) => survey.id)).size, 5);
    const knownIds = new Set(surveys.map((survey) => survey.id));
    const sampledIds = new Set();
    for (let index = 0; index < 100; index += 1) {
        const selected = getRandomSurvey();
        assert.equal(knownIds.has(selected.id), true);
        sampledIds.add(selected.id);
    }
    assert.ok(sampledIds.size > 1);
});

test("encrypted flow preserves participant and assigned survey", () => {
    const token = createPrescreenToken({
        accountId: "participant-test", age: 32, gender: "female", group: "survey-a",
        flowId: TEST_FLOW_ID, surveyId: "online-shopping"
    });
    const prescreen = verifyFlowToken(token, "prescreen");
    const verified = verifyFlowToken(createVerifiedToken(prescreen), "verified");
    assert.deepEqual(
        {
            id: verified.accountId, age: verified.age, gender: verified.gender,
            group: verified.group, flowId: verified.flowId, surveyId: verified.surveyId
        },
        {
            id: "participant-test", age: 32, gender: "female", group: "survey-a",
            flowId: TEST_FLOW_ID, surveyId: "online-shopping"
        }
    );
});

test("tampered or unknown-survey tokens are rejected", () => {
    const token = createPrescreenToken({
        accountId: "p", age: 30, gender: "male", group: "a",
        flowId: TEST_FLOW_ID, surveyId: "online-shopping"
    });
    assert.throws(() => verifyFlowToken(`${token}x`, "prescreen"));
    const unknownSurvey = createPrescreenToken({
        accountId: "p", age: 30, gender: "male", group: "a",
        flowId: TEST_FLOW_ID, surveyId: "not-a-real-survey"
    });
    assert.throws(() => verifyFlowToken(unknownSurvey, "prescreen"));
});

test("risk logic blocks configured decisions and high scores", () => {
    process.env.RISK_LIMIT = "70";
    process.env.BLOCK_DECISIONS = "Suspicious,Fake";
    assert.equal(shouldAllow({ decision: "Real", account_score: 0.2 }), true);
    assert.equal(shouldAllow({ decision: "Real", account_score: 0.8 }), false);
    assert.equal(shouldAllow({ decision: "Suspicious", account_score: 0.2 }), false);
});
