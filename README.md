# Verisoul survey gate

This Express app provides a prescreener, a blank Verisoul security bridge, a server-side `/session/authenticate` check, and allow/terminate redirects. The Verisoul score is never written to a database, file, session, token, log, or browser response.

## Configure

Copy the values from `.env.example` into `.env`. Set `VERISOUL_API_KEY` (private, server only), `VERISOUL_PROJECT_ID` (public browser SDK project ID), `VERISOUL_ENV`, a long random `FLOW_TOKEN_SECRET`, and the four public URLs. Set `MOCK_MODE=false` for real checks.

With mock mode enabled, the normal flow is allowed. Add `&mock=fake` to the blank security URL to test termination.

## Account ID and group

Every prescreener submission creates `participant-<uuid>`. The backend sends:

```json
{
  "session_id": "<from-browser-sdk>",
  "account": {
    "id": "participant-<uuid>",
    "group": "survey-batch-a",
    "metadata": {
      "source": "prescreener",
      "survey_id": "survey-batch-a"
    }
  }
}
```

`group` is included only when `VERISOUL_USE_GROUPS=true`. Groups must already be enabled for the Verisoul project. They isolate multi-account detection per survey batch. Once Groups are enabled for a project they cannot be disabled, and an account cannot be moved to another group.

Age and gender remain only in the encrypted, authenticated, short-lived application flow token and are not sent to Verisoul.
