import { testClient } from "hono/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../src";

const client = testClient(app, {
  STRAVA_CLIENT_ID: "12345",
  STRAVA_CLIENT_SECRET: "secret-value",
  STRAVA_WEBHOOK_VERIFY_TOKEN: "verify-me",
  STRAVA_REDIRECT_URI: "https://example.com",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Index", () => {
  it("Returns landing text", async () => {
    const response = await client.index.$get();
    expect(response.status).toBe(200);

    const data = await response.text();
    expect(data).toBe("Workout Planner API is running.");
  });
});

describe("GET /api/health", () => {
  it("Returns service health metadata", async () => {
    const response = await client.api.health.$get();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      status: "ok",
      service: "workout-planner-api",
      runtime: "cloudflare-workers",
    });
  });
});

describe("GET /api/bootstrap", () => {
  it("Returns product metadata for the frontend shell", async () => {
    const response = await client.api.bootstrap.$get();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.app.name).toBe("Workout Planner");
    expect(data.app.mvpTarget).toBe("Milestone D");
    expect(data.app.stack.ai).toBe("Cloudflare Workers AI");
    expect(data.planning.supportedActivities).toContain("running");
    expect(data.planning.supportedEquipment).toContain("rower");
    expect(data.planning.supportedGoals).toContain("consistency");
    expect(data.coachPrompts).toHaveLength(3);
    expect(data.integrations.strava.configured).toBe(true);
    expect(data.integrations.strava.redirectUri).toBe("https://example.com");
    expect(data.roadmap.mvpTarget).toBe("milestone-d");
  });
});

describe("GET /api/roadmap", () => {
  it("Returns the sequenced delivery roadmap", async () => {
    const response = await client.api.roadmap.$get();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary.mvpTarget).toBe("milestone-d");
    expect(data.summary.releaseOrder).toHaveLength(6);
    expect(data.milestones[3].id).toBe("milestone-d");
    expect(data.milestones[3].status).toBe("current");
  });
});

describe("POST /api/plan-preview", () => {
  it("Builds an adaptive week preview from onboarding inputs", async () => {
    const response = await client.api["plan-preview"].$post({
      json: {
        profile: {
          displayName: "Jordan",
          email: "jordan@example.com",
          fitnessExperience: "intermediate",
          lifestyleActivityLevel: "desk_job",
          averageSleepHours: 7,
          weeklyWorkoutTarget: 4,
        },
        goal: {
          goalType: "race",
          activityType: "running",
          summary: "Run a half marathon in October",
          targetDate: "2026-10-12",
        },
        availability: [
          {
            label: "Early Tuesday",
            dayOfWeek: 2,
            startMinute: 390,
            endMinute: 450,
            partOfDay: "morning",
          },
          {
            label: "Thursday lunch",
            dayOfWeek: 4,
            startMinute: 720,
            endMinute: 780,
            partOfDay: "midday",
          },
          {
            label: "Saturday long session",
            dayOfWeek: 6,
            startMinute: 480,
            endMinute: 600,
            partOfDay: "morning",
          },
          {
            label: "Sunday recovery",
            dayOfWeek: 0,
            startMinute: 540,
            endMinute: 600,
            partOfDay: "morning",
          },
        ],
        equipment: ["outdoor_running", "dumbbells", "mobility"],
        preferences: [
          {
            activityType: "running",
            preferenceLevel: "love",
          },
        ],
      },
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.primaryActivity).toBe("running");
    expect(data.focusSummary).toContain("Jordan");
    expect(data.workouts).toHaveLength(4);
    expect(data.workouts[0].dayLabel).toBe("Sun");
    expect(data.workouts.some((workout) => workout.title === "Long run")).toBe(
      true,
    );
  });
});

describe("POST /api/coach/respond", () => {
  it("Returns a structured coaching adjustment when recovery is limited", async () => {
    const response = await client.api.coach.respond.$post({
      json: {
        athleteName: "Jordan",
        message:
          "I only slept five hours and my legs feel sore. Should I still do today's workout?",
        sleepHours: 5,
        availableMinutes: 30,
        soreness: true,
        currentWorkout: {
          title: "Interval run",
          activityType: "running",
          durationMinutes: 45,
          intensity: "Moderate to hard",
          rationale: "Targets half-marathon speed development.",
        },
      },
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.decision).toBe("swap_for_recovery");
    expect(data.updatedWorkout.activityType).toBe("mobility");
    expect(data.updatedWorkout.durationMinutes).toBe(25);
    expect(data.aiContract.provider).toBe("cloudflare-workers-ai");
  });
});

describe("GET /api/strava/status", () => {
  it("Returns Strava integration readiness", async () => {
    const response = await client.api.strava.status.$get();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.provider).toBe("strava");
    expect(data.configured).toBe(true);
    expect(data.capabilities).toContain("oauth-connect");
    expect(data.capabilities).toContain("oauth-exchange");
  });
});

describe("POST /api/strava/connect-url", () => {
  it("Builds a Strava OAuth URL", async () => {
    const response = await client.api.strava["connect-url"].$post({
      json: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.authUrl).toContain("https://www.strava.com/oauth/authorize");
    expect(data.authUrl).toContain("client_id=12345");
    expect(data.authUrl).toContain(encodeURIComponent("https://example.com"));
    expect(data.scope).toBe("read,activity:read_all");
    expect(data.state).toContain("550e8400-e29b-41d4-a716-446655440000");
  });
});

describe("POST /api/strava/exchange", () => {
  it("Exchanges a Strava code for a connection summary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access-token",
          refresh_token: "refresh-token",
          token_type: "Bearer",
          expires_at: 1730000000,
          expires_in: 21600,
          athlete: {
            id: 999,
            username: "jordan-runs",
            firstname: "Jordan",
            lastname: "Runner",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const response = await client.api.strava.exchange.$post({
      json: {
        code: "temporary-code",
        state: "550e8400-e29b-41d4-a716-446655440000:123456789",
        scope: "read,activity:read_all",
      },
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.connected).toBe(true);
    expect(data.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(data.athlete.username).toBe("jordan-runs");
    expect(data.persistence).toBe("not_yet_persisted");
  });
});

describe("POST /api/strava/sync", () => {
  it("Requires database configuration for Strava sync", async () => {
    const response = await client.api.strava.sync.$post({
      json: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.message).toContain("Database configuration is required");
  });
});

describe("Strava normalization helpers", () => {
  it("Normalizes imported activities into training records", async () => {
    const { normalizeStravaActivity } = await import("../src/strava");

    const activity = normalizeStravaActivity(
      {
        id: 123,
        name: "Lunch Run",
        sport_type: "Run",
        start_date: "2026-06-08T12:00:00Z",
        elapsed_time: 3600,
        moving_time: 3300,
        distance: 10123,
        average_heartrate: 151.2,
        suffer_score: 72,
      },
      "550e8400-e29b-41d4-a716-446655440000",
    );

    expect(activity.activityType).toBe("running");
    expect(activity.durationMinutes).toBe(60);
    expect(activity.movingTimeMinutes).toBe(55);
    expect(activity.distanceMeters).toBe(10123);
    expect(activity.averageHeartRate).toBe(151);
  });
});

describe("GET /api/strava/webhook", () => {
  it("Verifies the Strava webhook handshake", async () => {
    const response = await client.api.strava.webhook.$get({
      query: {
        "hub.mode": "subscribe",
        "hub.challenge": "challenge-token",
        "hub.verify_token": "verify-me",
      },
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data["hub.challenge"]).toBe("challenge-token");
  });
});

describe("POST /api/strava/webhook", () => {
  it("Acknowledges a Strava webhook event for later sync", async () => {
    const response = await client.api.strava.webhook.$post({
      json: {
        aspect_type: "create",
        event_time: 1710000000,
        object_id: 987654321,
        object_type: "activity",
        owner_id: 123456,
        subscription_id: 654321,
        updates: {
          title: "Morning Run",
        },
      },
    });
    expect(response.status).toBe(202);

    const data = await response.json();
    expect(data.accepted).toBe(true);
    expect(data.queued).toBe(true);
    expect(data.syncHint).toContain("adaptive plan reevaluation");
  });
});
