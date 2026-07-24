const crypto = require("crypto");
const { createPrescreenToken, verifyFlowToken } = require("../services/flowTokenService");
const { addQueryParams } = require("../services/urlService");
const VALID_GENDERS = new Set(["male", "female"]);
const securityUrl = () => process.env.SECURITY_URL || "/security";
const terminateUrl = () => process.env.TERMINATE_URL || "/security-terminate";

function showPrescreener(req, res) {
    res.set("Cache-Control", "no-store");
    return res.render("prescreener", { errors: [], values: { age: "", gender: "" } });
}

function submitPrescreener(req, res) {
    const age = Number(req.body.age);
    const gender = String(req.body.gender || "").toLowerCase();
    const errors = [];
    if (!Number.isInteger(age) || age < 18 || age > 99) errors.push("Enter an age between 18 and 99.");
    if (!VALID_GENDERS.has(gender)) errors.push("Select a gender.");
    if (errors.length) {
        return res.status(422).render("prescreener", {
            errors,
            values: { age: Number.isFinite(age) ? String(age) : "", gender }
        });
    }
    const group = String(process.env.SURVEY_GROUP || "survey-batch-a")
        .trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "survey-batch-a";
    const flow = createPrescreenToken({
        accountId: `participant-${crypto.randomUUID()}`, age, gender, group
    });
    return res.redirect(303, addQueryParams(securityUrl(), { flow }));
}

function showSurvey(req, res) {
    try {
        const profile = verifyFlowToken(String(req.query.flow || ""), "verified");
        res.set("Cache-Control", "no-store");
        return res.render("survey", { flow: String(req.query.flow), profile });
    } catch { return res.redirect(302, terminateUrl()); }
}

function completeSurvey(req, res) {
    try {
        verifyFlowToken(String(req.body.flow || ""), "verified");
        return res.redirect(303, "/success");
    } catch { return res.redirect(302, terminateUrl()); }
}

function showSuccess(req, res) {
    return res.render("success", { prescreenerUrl: process.env.PRESCREENER_URL || "/" });
}
module.exports = { completeSurvey, showPrescreener, showSuccess, showSurvey, submitPrescreener };
