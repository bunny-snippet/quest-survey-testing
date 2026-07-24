const crypto = require("crypto");

const flowStates = new Map();
const completionReceipts = new Map();

function ttlMs() {
    return (Number(process.env.FLOW_STATE_TTL_SECONDS) || 900) * 1000;
}

function cleanupExpired() {
    const now = Date.now();
    for (const [flowId, state] of flowStates) {
        if (state.expiresAt <= now) flowStates.delete(flowId);
    }
    for (const [receipt, state] of completionReceipts) {
        if (state.expiresAt <= now) completionReceipts.delete(receipt);
    }
}

function createFlowState() {
    cleanupExpired();
    const flowId = crypto.randomBytes(24).toString("base64url");
    flowStates.set(flowId, { phase: "prescreen", expiresAt: Date.now() + ttlMs() });
    return flowId;
}

function transitionFlow(flowId, expectedPhase, nextPhase) {
    cleanupExpired();
    const state = flowStates.get(flowId);
    if (!state || state.phase !== expectedPhase) return false;
    state.phase = nextPhase;
    state.expiresAt = Date.now() + ttlMs();
    return true;
}

function isFlowInPhase(flowId, expectedPhase) {
    cleanupExpired();
    const state = flowStates.get(flowId);
    return Boolean(state && state.phase === expectedPhase);
}

function terminateFlow(flowId) {
    cleanupExpired();
    const state = flowStates.get(flowId);
    if (!state) return false;
    state.phase = "terminated";
    state.expiresAt = Date.now() + ttlMs();
    return true;
}

function issueCompletionReceipt(flowId) {
    if (!transitionFlow(flowId, "survey-open", "completed")) return null;
    const receipt = crypto.randomBytes(32).toString("base64url");
    completionReceipts.set(receipt, { flowId, expiresAt: Date.now() + ttlMs() });
    return receipt;
}

function consumeCompletionReceipt(receipt) {
    cleanupExpired();
    const completion = completionReceipts.get(String(receipt || ""));
    if (!completion || !isFlowInPhase(completion.flowId, "completed")) return false;
    completionReceipts.delete(receipt);
    return transitionFlow(completion.flowId, "completed", "success-shown");
}

function resetFlowStatesForTests() {
    flowStates.clear();
    completionReceipts.clear();
}

module.exports = {
    consumeCompletionReceipt,
    createFlowState,
    isFlowInPhase,
    issueCompletionReceipt,
    resetFlowStatesForTests,
    terminateFlow,
    transitionFlow
};
