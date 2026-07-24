(function lockProtectedHistory() {
    const terminateUrl = document.body.dataset.terminateUrl || "/security-terminate";
    let leaving = false;

    function expirePage() {
        if (leaving) return;
        leaving = true;
        window.location.replace(terminateUrl);
    }

    window.addEventListener("pageshow", (event) => {
        if (event.persisted) expirePage();
    });

    if (window.history && window.history.pushState) {
        window.history.replaceState({ protectedSurveyPage: true }, document.title, window.location.href);
        window.history.pushState({ protectedSurveyGuard: true }, document.title, window.location.href);
        window.addEventListener("popstate", expirePage);
    }
})();
