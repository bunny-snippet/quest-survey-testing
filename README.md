# Verisoul survey gate

This Express app provides a prescreener, a blank Verisoul security bridge, a server-side `/session/authenticate` check, and allow/terminate redirects. The Verisoul score is never written to a database, file, session, token, log, or browser response.

## Configure

Copy the values from `.env.example` into `.env`. Set `VERISOUL_API_KEY` (private, server only), `VERISOUL_PROJECT_ID` (public browser SDK project ID), `VERISOUL_ENV`, and a long random `FLOW_TOKEN_SECRET`. Set `MOCK_MODE=false` for real checks. For a single Render domain, leave the four optional URL variables unset so the app uses same-origin paths.

With mock mode enabled, the normal flow is allowed. Add `&mock=fake` to the blank security URL to test termination.

## One-time protected flow

The app tracks only a short-lived in-memory phase ID?not the Verisoul score or survey responses. Protected phases are single-use:

`prescreen -> security -> verified -> survey-open -> completed -> success-shown`

Refreshing or reopening the security, survey, or completion URL; using Back on a protected page; reusing a receipt; or manually opening `/success` terminates the flow. Completion uses an opaque one-time URL at `/complete/<receipt>`.

The in-memory state is appropriate for one Render instance. If the service is later scaled to multiple instances, move this state to a shared Redis store so every instance sees the same one-time state.


## Random survey variants

Each valid prescreener submission is assigned one of five surveys using server-side cryptographic randomness: Online Shopping, Food Delivery, Streaming & Entertainment, Digital Banking, or Travel Booking. The assigned `surveyId` is encrypted into the protected flow token, validated on every survey request, and sent to Verisoul as `account.metadata.survey_id`. A participant cannot switch variants by editing the URL.
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
