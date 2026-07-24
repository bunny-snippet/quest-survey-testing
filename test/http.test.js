const test = require("node:test");
const assert = require("node:assert/strict");
process.env.MOCK_MODE = "true";
process.env.FLOW_TOKEN_SECRET = "http-test-secret";
const app = require("../app");
const { resetFlowStatesForTests } = require("../services/flowStateService");

const formHeaders = { "content-type": "application/x-www-form-urlencoded" };

test("protected URLs are single-use and manual success access is rejected", async (t) => {
    resetFlowStatesForTests();
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;

    async function beginSecurity() {
        const start = await fetch(`${base}/prescreener`, {
            method: "POST", redirect: "manual", headers: formHeaders,
            body: "age=30&gender=female"
        });
        assert.equal(start.status, 303);
        const securityPath = start.headers.get("location");
        return {
            securityPath,
            prescreenFlow: new URL(securityPath, base).searchParams.get("flow")
        };
    }

    async function openSurvey() {
        const started = await beginSecurity();
        const bridge = await fetch(base + started.securityPath, { redirect: "manual" });
        assert.equal(bridge.status, 200);
        const risk = await fetch(`${base}/api/check-risk`, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ flow: started.prescreenFlow, sessionId: "mock-real" })
        });
        const decision = await risk.json();
        assert.match(decision.redirect, /^\/survey\?flow=/);
        const survey = await fetch(base + decision.redirect, { redirect: "manual" });
        assert.equal(survey.status, 200);
        return {
            surveyPath: decision.redirect,
            verifiedFlow: new URL(decision.redirect, base).searchParams.get("flow")
        };
    }

    function validAnswers(flow) {
        return new URLSearchParams({
            flow,
            name: "Test Participant",
            context_answer: "option-1",
            frequency_answer: "option-2",
            channel_answer: "option-1",
            satisfaction: "4",
            recommendation: "8",
            quality_check: "slightly-disagree",
            feedback: "Faster checkout would help."
        });
    }

    const invalidAge = await fetch(`${base}/prescreener`, {
        method: "POST", redirect: "manual", headers: formHeaders,
        body: "age=17&gender=male"
    });
    assert.equal(invalidAge.status, 422);

    for (const path of ["/success", "/success/fake", "/complete", "/complete/fake-receipt"]) {
        const manual = await fetch(base + path, { redirect: "manual" });
        assert.equal(manual.status, 302);
        assert.equal(manual.headers.get("location"), "/security-terminate");
    }

    const valid = await openSurvey();
    const completed = await fetch(`${base}/survey/complete`, {
        method: "POST", redirect: "manual", headers: formHeaders,
        body: validAnswers(valid.verifiedFlow)
    });
    assert.equal(completed.status, 303);
    const completionPath = completed.headers.get("location");
    assert.match(completionPath, /^\/complete\/[A-Za-z0-9_-]+$/);

    const success = await fetch(base + completionPath, { redirect: "manual" });
    assert.equal(success.status, 200);
    assert.match(await success.text(), /Thanks for your time/);

    const refreshedSuccess = await fetch(base + completionPath, { redirect: "manual" });
    assert.equal(refreshedSuccess.status, 302);
    assert.equal(refreshedSuccess.headers.get("location"), "/security-terminate");

    const oldSurvey = await fetch(base + valid.surveyPath, { redirect: "manual" });
    assert.equal(oldSurvey.status, 302);
    assert.equal(oldSurvey.headers.get("location"), "/security-terminate");

    const wrong = await openSurvey();
    const wrongQuality = validAnswers(wrong.verifiedFlow);
    wrongQuality.set("quality_check", "strongly-agree");
    const terminated = await fetch(`${base}/survey/complete`, {
        method: "POST", redirect: "manual", headers: formHeaders, body: wrongQuality
    });
    assert.equal(terminated.status, 303);
    assert.equal(terminated.headers.get("location"), "/security-terminate");

    const refreshedSurvey = await openSurvey();
    const refreshAttempt = await fetch(base + refreshedSurvey.surveyPath, { redirect: "manual" });
    assert.equal(refreshAttempt.status, 302);
    assert.equal(refreshAttempt.headers.get("location"), "/security-terminate");
    const submitAfterRefresh = await fetch(`${base}/survey/complete`, {
        method: "POST", redirect: "manual", headers: formHeaders,
        body: validAnswers(refreshedSurvey.verifiedFlow)
    });
    assert.equal(submitAfterRefresh.status, 303);
    assert.equal(submitAfterRefresh.headers.get("location"), "/security-terminate");

    const securityRefresh = await beginSecurity();
    const firstSecurityLoad = await fetch(base + securityRefresh.securityPath, { redirect: "manual" });
    assert.equal(firstSecurityLoad.status, 200);
    const secondSecurityLoad = await fetch(base + securityRefresh.securityPath, { redirect: "manual" });
    assert.equal(secondSecurityLoad.status, 302);
    assert.equal(secondSecurityLoad.headers.get("location"), "/security-terminate");

    const directSurvey = await fetch(`${base}/survey`, { redirect: "manual" });
    assert.equal(directSurvey.status, 302);
    assert.equal(directSurvey.headers.get("location"), "/security-terminate");
});
