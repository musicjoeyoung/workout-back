export const roadmapMilestones = [
  {
    id: "milestone-a",
    label: "Milestone A",
    title: "Foundation and deployment setup",
    status: "completed",
    goal: "Boot the frontend and backend, configure Neon/Cloudflare, and establish the app contract.",
    deliverables: [
      "Vite/React frontend scaffold",
      "HONC backend scaffold",
      "Shared product bootstrap metadata",
    ],
  },
  {
    id: "milestone-b",
    label: "Milestone B",
    title: "Profile, goals, and planning inputs",
    status: "completed",
    goal: "Capture the user attributes the planner must understand before training can be generated.",
    deliverables: [
      "Training domain schema for profiles, goals, availability, equipment, and preferences",
      "Onboarding context represented in the frontend",
      "Adaptive week preview input contract",
    ],
  },
  {
    id: "milestone-c",
    label: "Milestone C",
    title: "Strava connection and sync lifecycle",
    status: "completed",
    goal: "Connect activity data so the system can react to real workouts instead of static assumptions.",
    deliverables: [
      "Strava status endpoint",
      "OAuth connect URL endpoint",
      "Webhook verification and event intake endpoints",
    ],
  },
  {
    id: "milestone-d",
    label: "Milestone D",
    title: "Adaptive weekly planner MVP",
    status: "current",
    goal: "Ship a usable adaptive planner that can generate structured workouts with rationale.",
    deliverables: [
      "Deterministic weekly plan preview",
      "Workout rationale generation",
      "Frontend preview for the first adaptive week",
    ],
  },
  {
    id: "milestone-e",
    label: "Milestone E",
    title: "Conversational coach integration",
    status: "in-progress",
    goal: "Handle day-of questions and structured workout adjustments through a stable coach contract.",
    deliverables: [
      "Coach response endpoint",
      "Structured workout adjustment schema",
      "Workers AI integration target contract",
    ],
  },
  {
    id: "milestone-f",
    label: "Milestone F",
    title: "Persistent sync and production orchestration",
    status: "next",
    goal: "Persist Strava activity sync, queue recalculations, and connect the roadmap into a production-ready rollout.",
    deliverables: [
      "Stored activity imports",
      "Queued sync and replan jobs",
      "Release-ready milestone sequencing",
    ],
  },
] as const;

export const roadmapSummary = {
  mvpTarget: "milestone-d",
  releaseOrder: roadmapMilestones.map((milestone) => milestone.id),
};
