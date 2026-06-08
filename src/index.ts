import { createFiberplane, createOpenAPISpec } from "@fiberplane/hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { buildCoachPreview } from "./coach";
import {
  ZCoachPreviewRequest,
  ZPlanPreviewRequest,
  ZStravaConnectRequest,
  ZStravaExchangeRequest,
  ZStravaWebhookEvent,
  ZStravaWebhookQuery,
} from "./dtos";
import { zodValidator } from "./middleware/validator";
import { buildPlanPreview } from "./planner";
import { roadmapMilestones, roadmapSummary } from "./roadmap";
import {
  buildStravaAuthUrl,
  exchangeStravaCode,
  getStravaConfigStatus,
  summarizeStravaWebhookEvent,
  verifyStravaWebhook,
} from "./strava";

const supportedActivities = [
  "running",
  "cycling",
  "rowing",
  "strength",
  "mobility",
  "recovery",
  "cross_training",
] as const;

const supportedEquipment = [
  "outdoor_running",
  "track",
  "gym",
  "dumbbells",
  "barbell",
  "peloton",
  "bike",
  "rower",
  "treadmill",
  "bodyweight",
  "mobility",
] as const;

const supportedGoals = [
  "race",
  "pace",
  "consistency",
  "weight_loss",
  "general_fitness",
] as const;

const coachPrompts = [
  "I only slept five hours last night. Should I still do today's workout?",
  "I have 30 minutes today instead of an hour. What should I change?",
  "I added an unplanned long run yesterday. How should the rest of the week adapt?",
] as const;

type AppBindings = {
  STRAVA_CLIENT_ID?: string;
  STRAVA_CLIENT_SECRET?: string;
  STRAVA_WEBHOOK_VERIFY_TOKEN?: string;
  STRAVA_REDIRECT_URI?: string;
};

const api = new Hono<{ Bindings: AppBindings }>()
  .get("/health", (c) => {
    return c.json({
      status: "ok",
      service: "workout-planner-api",
      runtime: "cloudflare-workers",
    });
  })
  .get("/bootstrap", (c) => {
    return c.json({
      app: {
        name: "Workout Planner",
        mvpTarget: "Milestone D",
        stack: {
          frontend: "Vite + React",
          backend: "HONC (Hono + Drizzle + Neon + Cloudflare)",
          ai: "Cloudflare Workers AI",
        },
      },
      planning: {
        supportedActivities,
        supportedEquipment,
        supportedGoals,
      },
      roadmap: {
        completed: [
          "Frontend and backend foundations created",
          "Initial adaptive training domain model defined",
          "Bootstrap metadata endpoint added",
          "Adaptive week preview endpoint added",
          "Strava integration contract endpoints added",
        ],
        next: [
          "Connect Workers AI to the coach contract",
          "Persist imported Strava activities and sync jobs",
          "Sequence MVP delivery milestones for implementation",
        ],
        releaseOrder: roadmapSummary.releaseOrder,
        mvpTarget: roadmapSummary.mvpTarget,
      },
      coachPrompts,
      integrations: {
        strava: getStravaConfigStatus(c.env),
      },
    });
  })
  .get("/roadmap", (c) => {
    return c.json({
      summary: roadmapSummary,
      milestones: roadmapMilestones,
    });
  })
  .post("/plan-preview", zodValidator("json", ZPlanPreviewRequest), (c) => {
    const input = c.req.valid("json");
    const preview = buildPlanPreview(input);

    return c.json(preview);
  })
  .post("/coach/respond", zodValidator("json", ZCoachPreviewRequest), (c) => {
    const input = c.req.valid("json");

    return c.json(buildCoachPreview(input));
  })
  .get("/strava/status", (c) => {
    return c.json(getStravaConfigStatus(c.env));
  })
  .post(
    "/strava/connect-url",
    zodValidator("json", ZStravaConnectRequest),
    (c) => {
      const input = c.req.valid("json");
      const auth = buildStravaAuthUrl(input, c.env);

      if (!auth) {
        return c.json(
          {
            message: "Strava OAuth is not configured.",
            missing: getStravaConfigStatus(c.env).missing,
          },
          503,
        );
      }

      return c.json(auth);
    },
  )
  .post(
    "/strava/exchange",
    zodValidator("json", ZStravaExchangeRequest),
    async (c) => {
      const input = c.req.valid("json");
      const result = await exchangeStravaCode(input, c.env);

      return c.json(result.body, result.status);
    },
  )
  .get("/strava/webhook", zodValidator("query", ZStravaWebhookQuery), (c) => {
    const query = c.req.valid("query");
    const verification = verifyStravaWebhook(query, c.env);

    return c.json(verification.body, verification.status);
  })
  .post("/strava/webhook", zodValidator("json", ZStravaWebhookEvent), (c) => {
    const event = c.req.valid("json");

    return c.json(summarizeStravaWebhookEvent(event), 202);
  });

const app = new Hono<{ Bindings: AppBindings }>()
  .get("/", (c) => {
    return c.text("Workout Planner API is running.");
  })
  .route("/api", api);

app.onError((error, c) => {
  console.error(error);
  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
      },
      error.status,
    );
  }

  return c.json(
    {
      message: "Something went wrong",
    },
    500,
  );
});

/**
 * Serve a simplified api specification for your API
 * As of writing, this is just the list of routes and their methods.
 */
app.get("/openapi.json", (c) => {
  return c.json(
    createOpenAPISpec(app, {
      info: {
        title: "Workout Planner API",
        version: "1.0.0",
        description:
          "Foundation API for an adaptive workout planning application.",
      },
    }),
  );
});

/**
 * Mount the Fiberplane api explorer to be able to make requests against your API.
 *
 * Visit the explorer at `/fp`
 */
app.use(
  "/fp/*",
  createFiberplane({
    app,
    openapi: { url: "/openapi.json" },
  }),
);

export default app;
