import type { z } from "zod";
import type {
  ZStravaConnectRequest,
  ZStravaWebhookEvent,
  ZStravaWebhookQuery,
} from "./dtos";

type StravaConnectRequest = z.infer<typeof ZStravaConnectRequest>;
type StravaWebhookQuery = z.infer<typeof ZStravaWebhookQuery>;
type StravaWebhookEvent = z.infer<typeof ZStravaWebhookEvent>;

export type StravaBindings = {
  STRAVA_CLIENT_ID?: string;
  STRAVA_CLIENT_SECRET?: string;
  STRAVA_WEBHOOK_VERIFY_TOKEN?: string;
};

const STRAVA_SCOPE = "read,activity:read_all";
const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";

export const getStravaConfigStatus = (bindings: StravaBindings) => {
  const hasClientId = Boolean(bindings.STRAVA_CLIENT_ID);
  const hasClientSecret = Boolean(bindings.STRAVA_CLIENT_SECRET);
  const hasWebhookToken = Boolean(bindings.STRAVA_WEBHOOK_VERIFY_TOKEN);

  return {
    provider: "strava",
    configured: hasClientId && hasClientSecret && hasWebhookToken,
    scope: STRAVA_SCOPE,
    capabilities: [
      "oauth-connect",
      "historical-import",
      "incremental-sync",
      "webhook-updates",
    ],
    missing: [
      !hasClientId ? "STRAVA_CLIENT_ID" : null,
      !hasClientSecret ? "STRAVA_CLIENT_SECRET" : null,
      !hasWebhookToken ? "STRAVA_WEBHOOK_VERIFY_TOKEN" : null,
    ].filter((item): item is string => item !== null),
  };
};

export const buildStravaAuthUrl = (
  request: StravaConnectRequest,
  bindings: StravaBindings,
) => {
  if (!bindings.STRAVA_CLIENT_ID) {
    return null;
  }

  const state = `${request.userId}:${Date.now()}`;
  const url = new URL(STRAVA_AUTHORIZE_URL);
  url.searchParams.set("client_id", bindings.STRAVA_CLIENT_ID);
  url.searchParams.set("redirect_uri", request.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", STRAVA_SCOPE);
  url.searchParams.set("state", state);

  return {
    authUrl: url.toString(),
    state,
    scope: STRAVA_SCOPE,
  };
};

export const verifyStravaWebhook = (
  query: StravaWebhookQuery,
  bindings: StravaBindings,
) => {
  if (!bindings.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return {
      ok: false,
      status: 503,
      body: {
        message: "Strava webhook verification is not configured.",
      },
    };
  }

  if (
    query["hub.mode"] !== "subscribe" ||
    query["hub.verify_token"] !== bindings.STRAVA_WEBHOOK_VERIFY_TOKEN
  ) {
    return {
      ok: false,
      status: 403,
      body: {
        message: "Invalid Strava webhook verification request.",
      },
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      "hub.challenge": query["hub.challenge"],
    },
  };
};

export const summarizeStravaWebhookEvent = (event: StravaWebhookEvent) => {
  return {
    accepted: true,
    queued: true,
    summary: `Queued ${event.aspect_type} event for ${event.object_type} ${event.object_id}.`,
    syncHint:
      event.object_type === "activity"
        ? "Trigger activity fetch and adaptive plan reevaluation."
        : "Refresh athlete context before the next import.",
  };
};
