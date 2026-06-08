import type { z } from "zod";
import type {
  ZStravaConnectRequest,
  ZStravaExchangeRequest,
  ZStravaSyncRequest,
  ZStravaWebhookEvent,
  ZStravaWebhookQuery,
} from "./dtos";

type StravaConnectRequest = z.infer<typeof ZStravaConnectRequest>;
type StravaExchangeRequest = z.infer<typeof ZStravaExchangeRequest>;
type StravaSyncRequest = z.infer<typeof ZStravaSyncRequest>;
type StravaWebhookQuery = z.infer<typeof ZStravaWebhookQuery>;
type StravaWebhookEvent = z.infer<typeof ZStravaWebhookEvent>;

type StravaTokenExchangeResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number;
  expires_in: number;
  athlete: {
    id: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };
};

type StravaActivityResponse = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  elapsed_time: number;
  moving_time?: number;
  distance?: number;
  average_heartrate?: number;
  suffer_score?: number;
};

export type StravaBindings = {
  STRAVA_CLIENT_ID?: string;
  STRAVA_CLIENT_SECRET?: string;
  STRAVA_WEBHOOK_VERIFY_TOKEN?: string;
  STRAVA_REDIRECT_URI?: string;
};

const STRAVA_SCOPE = "read,activity:read_all";
const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ACTIVITY_URL = "https://www.strava.com/api/v3/athlete/activities";

const getMissingConfig = (bindings: StravaBindings) => {
  return [
    !bindings.STRAVA_CLIENT_ID ? "STRAVA_CLIENT_ID" : null,
    !bindings.STRAVA_CLIENT_SECRET ? "STRAVA_CLIENT_SECRET" : null,
    !bindings.STRAVA_WEBHOOK_VERIFY_TOKEN
      ? "STRAVA_WEBHOOK_VERIFY_TOKEN"
      : null,
    !bindings.STRAVA_REDIRECT_URI ? "STRAVA_REDIRECT_URI" : null,
  ].filter((item): item is string => item !== null);
};

const resolveRedirectUri = (
  redirectUri: string | undefined,
  bindings: StravaBindings,
) => {
  return redirectUri ?? bindings.STRAVA_REDIRECT_URI ?? null;
};

export const parseUserIdFromState = (state: string | undefined) => {
  if (!state) {
    return null;
  }

  const [userId] = state.split(":");
  return userId || null;
};

export const getStravaConfigStatus = (bindings: StravaBindings) => {
  const missing = getMissingConfig(bindings);

  return {
    provider: "strava",
    configured: missing.length === 0,
    scope: STRAVA_SCOPE,
    redirectUri: bindings.STRAVA_REDIRECT_URI ?? null,
    capabilities: [
      "oauth-connect",
      "oauth-exchange",
      "historical-import",
      "incremental-sync",
      "webhook-updates",
    ],
    missing,
  };
};

export const buildStravaAuthUrl = (
  request: StravaConnectRequest,
  bindings: StravaBindings,
) => {
  const redirectUri = resolveRedirectUri(request.redirectUri, bindings);
  if (!bindings.STRAVA_CLIENT_ID || !redirectUri) {
    return null;
  }

  const state = `${request.userId}:${Date.now()}`;
  const url = new URL(STRAVA_AUTHORIZE_URL);
  url.searchParams.set("client_id", bindings.STRAVA_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", STRAVA_SCOPE);
  url.searchParams.set("state", state);

  return {
    authUrl: url.toString(),
    state,
    scope: STRAVA_SCOPE,
    redirectUri,
  };
};

export const exchangeStravaCode = async (
  request: StravaExchangeRequest,
  bindings: StravaBindings,
) => {
  const redirectUri = resolveRedirectUri(request.redirectUri, bindings);
  if (
    !bindings.STRAVA_CLIENT_ID ||
    !bindings.STRAVA_CLIENT_SECRET ||
    !redirectUri
  ) {
    return {
      ok: false as const,
      status: 503,
      body: {
        message: "Strava OAuth exchange is not configured.",
        missing: getMissingConfig(bindings),
      },
    };
  }

  const body = new URLSearchParams({
    client_id: bindings.STRAVA_CLIENT_ID,
    client_secret: bindings.STRAVA_CLIENT_SECRET,
    code: request.code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      body: {
        message: "Strava token exchange failed.",
        details: await response.text(),
      },
    };
  }

  const data = (await response.json()) as StravaTokenExchangeResponse;
  const userId = parseUserIdFromState(request.state);

  return {
    ok: true as const,
    status: 200,
    body: {
      connected: true,
      provider: "strava",
      userId,
      redirectUri,
      scope: request.scope ?? STRAVA_SCOPE,
      athlete: {
        id: data.athlete.id,
        username: data.athlete.username ?? null,
        firstname: data.athlete.firstname ?? null,
        lastname: data.athlete.lastname ?? null,
      },
      tokenType: data.token_type,
      expiresAt: data.expires_at,
      expiresIn: data.expires_in,
      persistence: "not_yet_persisted",
      nextAction:
        "Persist the Strava token payload and create or update the user connection record in Neon.",
    },
    connection: userId
      ? {
          userId,
          stravaAthleteId: String(data.athlete.id),
          athleteUsername: data.athlete.username ?? null,
          athleteFirstName: data.athlete.firstname ?? null,
          athleteLastName: data.athlete.lastname ?? null,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenType: data.token_type,
          expiresAt: new Date(data.expires_at * 1000),
          redirectUri,
          scope: request.scope ?? STRAVA_SCOPE,
        }
      : null,
  };
};

const mapStravaActivityType = (activity: StravaActivityResponse) => {
  const sourceType = (activity.sport_type ?? activity.type ?? "").toLowerCase();

  if (sourceType.includes("run")) {
    return "running";
  }

  if (sourceType.includes("ride") || sourceType.includes("cycle")) {
    return "cycling";
  }

  if (sourceType.includes("row")) {
    return "rowing";
  }

  if (sourceType.includes("weight") || sourceType.includes("strength")) {
    return "strength";
  }

  return "cross_training";
};

export const normalizeStravaActivity = (
  activity: StravaActivityResponse,
  userId: string,
) => {
  return {
    userId,
    stravaActivityId: String(activity.id),
    activityType: mapStravaActivityType(activity),
    title: activity.name,
    startedAt: new Date(activity.start_date),
    durationMinutes: Math.max(1, Math.round(activity.elapsed_time / 60)),
    distanceMeters: activity.distance ? Math.round(activity.distance) : null,
    movingTimeMinutes: activity.moving_time
      ? Math.max(1, Math.round(activity.moving_time / 60))
      : null,
    averageHeartRate: activity.average_heartrate
      ? Math.round(activity.average_heartrate)
      : null,
    perceivedEffort: activity.suffer_score
      ? Math.round(activity.suffer_score)
      : null,
    summary: {
      sportType: activity.sport_type ?? activity.type ?? null,
    },
  };
};

const fetchStravaActivities = async (
  accessToken: string,
  after: string | undefined,
) => {
  const url = new URL(STRAVA_ACTIVITY_URL);
  url.searchParams.set("per_page", "30");
  if (after) {
    url.searchParams.set(
      "after",
      String(Math.floor(new Date(after).getTime() / 1000)),
    );
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Strava activity fetch failed with status ${response.status}`,
    );
  }

  return (await response.json()) as StravaActivityResponse[];
};

export const buildStravaImportBatch = async (
  request: StravaSyncRequest,
  accessToken: string,
) => {
  const activities = await fetchStravaActivities(accessToken, request.after);

  return activities.map((activity) =>
    normalizeStravaActivity(activity, request.userId),
  );
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
