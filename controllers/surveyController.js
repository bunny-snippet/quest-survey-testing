const crypto = require("crypto");
const { createPrescreenToken, verifyFlowToken } = require("../services/flowTokenService");
const {
    consumeCompletionReceipt,
    createFlowState,
    isFlowInPhase,
    issueCompletionReceipt,
    terminateFlow,
    transitionFlow
} = require("../services/flowStateService");
const { getRandomSurvey, getSurveyById } = require("../services/surveyCatalog");
const { addQueryParams } = require("../services/urlService");
const VALID_GENDERS = new Set(["male", "female"]);
const securityUrl = () => process.env.SECURITY_URL || "/security";
const terminateUrl = () => process.env.TERMINATE_URL || "/security-terminate";

function noStore(res) {
    res.set({ "Cache-Control": "no-store, no-cache, must-revalidate, private", Pragma: "no-cache", Expires: "0" });
}

function showPrescreener(req, res) {
    noStore(res);
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
    const selectedSurvey = getRandomSurvey();
    const flowId = createFlowState();
    const flow = createPrescreenToken({
        accountId: `participant-${crypto.randomUUID()}`,
        age,
        gender,
        group,
        flowId,
        surveyId: selectedSurvey.id
    });
    return res.redirect(303, addQueryParams(securityUrl(), { flow }));
}

function showSurvey(req, res) {
    const flow = String(req.query.flow || "");
    let profile;
    try { profile = verifyFlowToken(flow, "verified"); }
    catch { return res.redirect(302, terminateUrl()); }

    const survey = getSurveyById(profile.surveyId);
    if (!survey || !transitionFlow(profile.flowId, "verified", "survey-open")) {
        terminateFlow(profile.flowId);
        return res.redirect(302, terminateUrl());
    }

    noStore(res);
    return res.render("survey", {
        flow, profile, survey, errors: [], values: {}, terminateUrl: terminateUrl()
    });
}

function optionValues(options) {
    return options.map((_, index) => `option-${index + 1}`);
}

function completeSurvey(req, res) {
    let profile;
    try { profile = verifyFlowToken(String(req.body.flow || ""), "verified"); }
    catch { return res.redirect(302, terminateUrl()); }

    const survey = getSurveyById(profile.surveyId);
    if (!survey || !isFlowInPhase(profile.flowId, "survey-open")) {
        terminateFlow(profile.flowId);
        return res.redirect(303, terminateUrl());
    }
    if (String(req.body.quality_check || "") !== survey.qualityAnswer) {
        terminateFlow(profile.flowId);
        return res.redirect(303, terminateUrl());
    }

    const values = {
        name: String(req.body.name || "").trim(),
        context_answer: String(req.body.context_answer || ""),
        frequency_answer: String(req.body.frequency_answer || ""),
        channel_answer: String(req.body.channel_answer || ""),
        satisfaction: String(req.body.satisfaction || ""),
        recommendation: String(req.body.recommendation || ""),
        quality_check: String(req.body.quality_check || ""),
        feedback: String(req.body.feedback || "").trim()
    };
    const errors = [];

    if (values.name.length < 2 || values.name.length > 80) errors.push("Please enter your name.");
    if (!optionValues(survey.contextOptions).includes(values.context_answer)) {
        errors.push("Please answer the first study question.");
    }
    if (!optionValues(survey.frequencyOptions).includes(values.frequency_answer)) {
        errors.push("Please select how frequently this applies to you.");
    }
    if (!optionValues(survey.channelOptions).includes(values.channel_answer)) {
        errors.push("Please select your preferred channel or device.");
    }
    if (!["1", "2", "3", "4", "5"].includes(values.satisfaction)) {
        errors.push("Please rate your overall experience.");
    }
    if (!/^(10|[0-9])$/.test(values.recommendation)) {
        errors.push("Please select a recommendation score.");
    }
    if (values.feedback.length > 500) errors.push("Feedback must be 500 characters or fewer.");

    if (errors.length) {
        noStore(res);
        return res.status(422).render("survey", {
            flow: String(req.body.flow), profile, survey, errors, values, terminateUrl: terminateUrl()
        });
    }

    const receipt = issueCompletionReceipt(profile.flowId);
    if (!receipt) {
        terminateFlow(profile.flowId);
        return res.redirect(303, terminateUrl());
    }
    return res.redirect(303, `/complete/${encodeURIComponent(receipt)}`);
}

function showSuccess(req, res) {
    if (!consumeCompletionReceipt(req.params.receipt)) {
        return res.redirect(302, terminateUrl());
    }
    noStore(res);
    return res.render("success", {
        prescreenerUrl: process.env.PRESCREENER_URL || "/",
        terminateUrl: terminateUrl()
    });
}
module.exports = { completeSurvey, showPrescreener, showSuccess, showSurvey, submitPrescreener };
