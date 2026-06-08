import type { z } from "zod";
import type { ZCoachPreviewRequest } from "./dtos";

type CoachPreviewRequest = z.infer<typeof ZCoachPreviewRequest>;

const buildUpdatedWorkout = (input: CoachPreviewRequest) => {
  const { currentWorkout } = input;

  if (
    input.soreness ||
    (input.sleepHours !== undefined && input.sleepHours <= 5)
  ) {
    return {
      title: "Recovery mobility and easy movement",
      activityType: "mobility",
      durationMinutes: Math.min(input.availableMinutes ?? 25, 25),
      intensity: "Easy",
      rationale:
        "Recovery replaces the original session because soreness or limited sleep increases the risk of low-quality training.",
    };
  }

  if (
    input.availableMinutes !== undefined &&
    input.availableMinutes < currentWorkout.durationMinutes
  ) {
    return {
      ...currentWorkout,
      durationMinutes: input.availableMinutes,
      intensity:
        currentWorkout.intensity === "Moderate to hard"
          ? "Moderate"
          : currentWorkout.intensity,
      rationale:
        "The session is shortened to fit the available time while preserving the workout's main purpose.",
    };
  }

  return {
    ...currentWorkout,
    rationale:
      "Conditions look manageable, so the original workout stays in place with the same intended training effect.",
  };
};

export const buildCoachPreview = (input: CoachPreviewRequest) => {
  const updatedWorkout = buildUpdatedWorkout(input);
  const changedWorkout =
    updatedWorkout.title !== input.currentWorkout.title ||
    updatedWorkout.durationMinutes !== input.currentWorkout.durationMinutes ||
    updatedWorkout.intensity !== input.currentWorkout.intensity;

  const decision =
    updatedWorkout.activityType === "mobility"
      ? "swap_for_recovery"
      : changedWorkout
        ? "shorten_or_reduce"
        : "keep_as_planned";

  const rationale = [
    input.sleepHours !== undefined
      ? `Sleep context: ${input.sleepHours} hours reported.`
      : "Sleep context: not provided.",
    input.availableMinutes !== undefined
      ? `Time context: ${input.availableMinutes} minutes available today.`
      : "Time context: no reduction reported.",
    input.soreness
      ? "Recovery context: soreness reported."
      : "Recovery context: no soreness reported.",
  ];

  return {
    decision,
    responseMessage:
      decision === "swap_for_recovery"
        ? `${input.athleteName}, today should shift to recovery instead of forcing the planned session.`
        : decision === "shorten_or_reduce"
          ? `${input.athleteName}, keep the workout purpose but shorten it to match today's time and recovery constraints.`
          : `${input.athleteName}, today's workout can stay on track as planned.`,
    updatedWorkout,
    rationale,
    aiContract: {
      provider: "cloudflare-workers-ai",
      mode: "schema-first",
      nextStep:
        "Use Workers AI to generate tone and richer coaching explanation while preserving this structured decision format.",
    },
  };
};
