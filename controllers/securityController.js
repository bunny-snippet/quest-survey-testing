const { createVerifiedToken, verifyFlowToken } = require("../services/flowTokenService");
const { terminateFlow, transitionFlow } = require("../services/flowStateService");
const { authenticateSession, shouldAllow } = require("../services/riskService");
const { addQueryParams } = require("../services/urlService");

const isTrue = (value) => String(value).toLowerCase() === "true";
const terminateUrl = () => process.env.TERMINATE_URL || "/security-terminate";
const surveyUrl = () => process.env.SURVEY_URL || "/survey";

function sdkUrl() {
    const hostname = String(process.env.VERISOUL_CUSTOM_HOSTNAME || "")
        .trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (hostname) return `https://${hostname}/bundle.js`;
    const env = String(process.env.VERISOUL_ENV).toLowerCase() === "prod" ? "prod" : "sandbox";
    return `https://js.verisoul.ai/${env}/bundle.js`;
}

function showSecurityBridge(req, res) {
    const flow = String(req.query.flow || "");
    let profile;
    try { profile = verifyFlowToken(flow, "prescreen"); }
    catch { return res.redirect(302, terminateUrl()); }

    if (!transitionFlow(profile.flowId, "prescreen", "security-open")) {
        terminateFlow(profile.flowId);
        return res.redirect(302, terminateUrl());
    }

    const mockMode = isTrue(process.env.MOCK_MODE);
    const projectId = String(process.env.VERISOUL_PROJECT_ID || "").trim();
    if (!mockMode && !projectId) {
        terminateFlow(profile.flowId);
        return res.redirect(302, terminateUrl());
    }
    res.set({ "Cache-Control": "no-store, no-cache, must-revalidate, private", Pragma: "no-cache", Expires: "0" });
    return res.render("security", { flow, mockMode, projectId, sdkUrl: sdkUrl(), terminateUrl: terminateUrl() });
}

async function checkRisk(req, res) {
    res.set("Cache-Control", "no-store");
    const flow = String(req.body.flow || "");
    const sessionId = String(req.body.sessionId || "");
    let profile;
    try { profile = verifyFlowToken(flow, "prescreen"); }
    catch { return res.status(400).json({ redirect: terminateUrl() }); }

    if (!transitionFlow(profile.flowId, "security-open", "checking")) {
        terminateFlow(profile.flowId);
        return res.status(409).json({ redirect: terminateUrl() });
    }
    if (!sessionId || sessionId.length > 200) {
        terminateFlow(profile.flowId);
        return res.status(400).json({ redirect: terminateUrl() });
    }

    const account = {
        id: profile.accountId,
        metadata: { source: "prescreener", survey_id: profile.surveyId, survey_group: profile.group }
    };
    if (isTrue(process.env.VERISOUL_USE_GROUPS)) account.group = profile.group;

    try {
        const result = await authenticateSession({ sessionId, account });
        if (!shouldAllow(result)) {
            terminateFlow(profile.flowId);
            return res.json({ redirect: terminateUrl() });
        }
        if (!transitionFlow(profile.flowId, "checking", "verified")) {
            terminateFlow(profile.flowId);
            return res.json({ redirect: terminateUrl() });
        }
        const verifiedFlow = createVerifiedToken(profile);
        return res.json({ redirect: addQueryParams(surveyUrl(), { flow: verifiedFlow }) });
    } catch (error) {
        // Never log or persist Verisoul scores or the full API response.
        terminateFlow(profile.flowId);
        console.error("Verisoul check failed:", error.message);
        return res.json({ redirect: terminateUrl() });
    }
}

function showTerminated(req, res) {
    res.set({ "Cache-Control": "no-store, no-cache, must-revalidate, private", Pragma: "no-cache", Expires: "0" });
    return res.status(403).render("terminated");
}
module.exports = { checkRisk, showSecurityBridge, showTerminated };
