const crypto = require("crypto");
const { getSurveyById } = require("./surveyCatalog");
const TOKEN_VERSION = 1;
function tokenSecret() {
    const value = String(process.env.FLOW_TOKEN_SECRET || "").trim();
    if (value) return value;
    if (process.env.NODE_ENV === "production") throw new Error("FLOW_TOKEN_SECRET is required in production");
    return "development-only-secret-change-before-production";
}
const encryptionKey = () => crypto.createHash("sha256").update(tokenSecret()).digest();
function seal(payload) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
    return [iv, ciphertext, cipher.getAuthTag()].map((part) => part.toString("base64url")).join(".");
}
function open(token) {
    if (typeof token !== "string" || token.length > 4096) throw new Error("Invalid flow token");
    const [iv, ciphertext, tag, extra] = token.split(".");
    if (!iv || !ciphertext || !tag || extra) throw new Error("Invalid flow token");
    try {
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
        decipher.setAuthTag(Buffer.from(tag, "base64url"));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()
        ]).toString("utf8");
        return JSON.parse(plaintext);
    } catch { throw new Error("Invalid flow token"); }
}
function createPrescreenToken({ accountId, age, gender, group, flowId, surveyId }) {
    return seal({
        version: TOKEN_VERSION, kind: "prescreen", accountId, age, gender,
        group, flowId, surveyId, issuedAt: Date.now()
    });
}
function createVerifiedToken(profile) {
    return seal({
        version: TOKEN_VERSION, kind: "verified", accountId: profile.accountId,
        age: profile.age, gender: profile.gender, group: profile.group,
        flowId: profile.flowId, surveyId: profile.surveyId,
        issuedAt: profile.issuedAt, verifiedAt: Date.now()
    });
}
function verifyFlowToken(token, expectedKind) {
    const payload = open(token);
    const maxAgeMs = (Number(process.env.FLOW_TOKEN_TTL_SECONDS) || 900) * 1000;
    const referenceTime = expectedKind === "verified" ? payload.verifiedAt : payload.issuedAt;
    if (payload.version !== TOKEN_VERSION || payload.kind !== expectedKind ||
        typeof payload.accountId !== "string" || typeof payload.group !== "string" ||
        typeof payload.flowId !== "string" || payload.flowId.length < 20 ||
        !getSurveyById(payload.surveyId) ||
        !Number.isInteger(payload.age) || !["male", "female"].includes(payload.gender) ||
        !Number.isFinite(referenceTime) || referenceTime > Date.now() + 30000 ||
        Date.now() - referenceTime > maxAgeMs) {
        throw new Error("Expired or invalid flow token");
    }
    return payload;
}
module.exports = { createPrescreenToken, createVerifiedToken, verifyFlowToken };
