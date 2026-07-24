const axios = require("axios");

const isMockMode = () => String(process.env.MOCK_MODE).toLowerCase() === "true";

function apiBaseUrl() {
    const configured = String(process.env.VERISOUL_API_BASE_URL || "").trim().replace(/\/+$/, "");
    if (configured) return configured;
    return String(process.env.VERISOUL_ENV).toLowerCase() === "prod"
        ? "https://api.prod.verisoul.ai"
        : "https://api.sandbox.verisoul.ai";
}

async function authenticateSession({ sessionId, account }) {
    if (isMockMode()) {
        const denied = sessionId.toLowerCase().includes("fake");
        return { decision: denied ? "Fake" : "Real", account_score: denied ? 0.95 : 0.1 };
    }

    const apiKey = String(process.env.VERISOUL_API_KEY || "").trim();
    if (!apiKey) throw new Error("VERISOUL_API_KEY is not configured");

    const response = await axios.post(
        `${apiBaseUrl()}/session/authenticate`,
        { session_id: sessionId, account },
        {
            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
            timeout: Number(process.env.VERISOUL_TIMEOUT_MS) || 10000,
            validateStatus: (status) => status >= 200 && status < 300
        }
    );

    if (!response.data || typeof response.data.decision !== "string" ||
        typeof response.data.account_score !== "number") {
        throw new Error("Verisoul returned an invalid response");
    }
    return response.data;
}

function configuredRiskLimit() {
    const raw = Number(process.env.RISK_LIMIT);
    if (!Number.isFinite(raw)) return 0.7;
    const normalized = raw > 1 ? raw / 100 : raw;
    return Math.min(Math.max(normalized, 0), 1);
}

function shouldAllow(result) {
    const blocked = new Set(String(process.env.BLOCK_DECISIONS || "Suspicious,Fake")
        .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
    const decision = String(result.decision || "").trim().toLowerCase();
    const score = Number(result.account_score);
    if (!decision || !Number.isFinite(score)) return false;
    return !blocked.has(decision) && score < configuredRiskLimit();
}

module.exports = { authenticateSession, configuredRiskLimit, shouldAllow };
