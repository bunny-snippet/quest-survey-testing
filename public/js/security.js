(async function runSecurityCheck() {
    const config = document.body.dataset;
    const terminate = () => window.location.replace(config.terminateUrl);
    try {
        let sessionId;
        if (config.mockMode === "true") {
            const result = new URLSearchParams(window.location.search).get("mock");
            sessionId = result === "fake" ? "mock-fake" : "mock-real";
        } else {
            const session = await Promise.race([
                window.Verisoul.session(),
                new Promise((_, reject) => window.setTimeout(
                    () => reject(new Error("Verisoul SDK timed out")), 12000
                ))
            ]);
            sessionId = session.session_id;
        }
        const response = await fetch("/api/check-risk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            body: JSON.stringify({ flow: config.flow, sessionId })
        });
        const payload = await response.json();
        if (!payload.redirect) return terminate();
        return window.location.replace(payload.redirect);
    } catch {
        return terminate();
    }
})();
