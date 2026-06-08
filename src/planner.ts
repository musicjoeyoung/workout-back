import type { z } from "zod";
import type {
  ZPlanPreviewAvailabilityWindow,
  ZPlanPreviewGoal,
  ZPlanPreviewProfile,
  ZPlanPreviewRequest,
} from "./dtos";

type PlanPreviewProfile = z.infer<typeof ZPlanPreviewProfile>;
type PlanPreviewGoal = z.infer<typeof ZPlanPreviewGoal>;
type PlanPreviewAvailabilityWindow = z.infer<
  typeof ZPlanPreviewAvailabilityWindow
>;
type PlanPreviewRequest = z.infer<typeof ZPlanPreviewRequest>;

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const baseDurations = {
  quality: 45,
  endurance: 75,
  strength: 35,
  recovery: 25,
} as const;

const getDurationMinutes = (
  baseDuration: number,
  window: PlanPreviewAvailabilityWindow,
) => {
  const availableDuration = window.endMinute - window.startMinute;
  return Math.max(20, Math.min(baseDuration, availableDuration));
};

const formatTime = (minute: number) => {
  const hour = Math.floor(minute / 60);
  const minutes = minute % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
};

const formatWindow = (window: PlanPreviewAvailabilityWindow) => {
  return `${dayLabels[window.dayOfWeek]} ${formatTime(window.startMinute)}-${formatTime(window.endMinute)}`;
};

const inferPrimaryActivity = (input: PlanPreviewRequest) => {
  if (input.goal.activityType) {
    return input.goal.activityType;
  }

  const lovedPreference = input.preferences.find(
    (preference) => preference.preferenceLevel === "love",
  );
  if (lovedPreference) {
    return lovedPreference.activityType;
  }

  if (input.equipment.includes("rower")) {
    return "rowing";
  }

  if (input.equipment.includes("peloton") || input.equipment.includes("bike")) {
    return "cycling";
  }

  return "running";
};

const getWorkoutTemplates = (
  primaryActivity: string,
  profile: PlanPreviewProfile,
  goal: PlanPreviewGoal,
) => {
  const beginner = profile.fitnessExperience === "beginner";
  const qualityWorkout =
    primaryActivity === "cycling"
      ? {
          title: "Structured bike intervals",
          intensity: "Moderate to hard",
          baseDuration: baseDurations.quality,
        }
      : primaryActivity === "rowing"
        ? {
            title: "Threshold rowing session",
            intensity: "Moderate to hard",
            baseDuration: baseDurations.quality,
          }
        : {
            title: beginner ? "Intro quality run" : "Interval run",
            intensity: "Moderate to hard",
            baseDuration: baseDurations.quality,
          };

  const enduranceWorkout =
    primaryActivity === "cycling"
      ? {
          title: "Long aerobic ride",
          intensity: "Easy to moderate",
          baseDuration: baseDurations.endurance,
        }
      : primaryActivity === "rowing"
        ? {
            title: "Steady aerobic row",
            intensity: "Easy to moderate",
            baseDuration: 60,
          }
        : {
            title: "Long run",
            intensity: "Easy",
            baseDuration: baseDurations.endurance,
          };

  return [
    {
      kind: "quality",
      ...qualityWorkout,
      rationale: `Builds toward ${goal.summary.toLowerCase()} with a focused quality session.`,
    },
    {
      kind: "recovery",
      title: "Mobility and recovery",
      intensity: "Easy",
      baseDuration: baseDurations.recovery,
      rationale:
        "Protects consistency by adding low-stress recovery work between harder days.",
    },
    {
      kind: "strength",
      title: "Strength support session",
      intensity: "Steady",
      baseDuration: baseDurations.strength,
      rationale:
        "Improves durability and supports sustainable progress across the training block.",
    },
    {
      kind: "endurance",
      ...enduranceWorkout,
      rationale:
        "Extends aerobic capacity while keeping the week realistic around schedule limits.",
    },
  ];
};

export const buildPlanPreview = (input: PlanPreviewRequest) => {
  const sortedAvailability = [...input.availability].sort((left, right) => {
    if (left.dayOfWeek === right.dayOfWeek) {
      return left.startMinute - right.startMinute;
    }

    return left.dayOfWeek - right.dayOfWeek;
  });

  const primaryActivity = inferPrimaryActivity(input);
  const preferredCount = Math.min(
    input.profile.weeklyWorkoutTarget,
    sortedAvailability.length,
  );
  const workoutTemplates = getWorkoutTemplates(
    primaryActivity,
    input.profile,
    input.goal,
  );

  const workouts = sortedAvailability
    .slice(0, preferredCount)
    .map((window, index) => {
      const template =
        workoutTemplates[index] ??
        workoutTemplates[workoutTemplates.length - 1];
      const durationMinutes = getDurationMinutes(template.baseDuration, window);

      return {
        dayLabel: dayLabels[window.dayOfWeek],
        timeWindow: formatWindow(window),
        title: template.title,
        activityType:
          template.kind === "strength" || template.kind === "recovery"
            ? template.kind === "strength"
              ? "strength"
              : "mobility"
            : primaryActivity,
        durationMinutes,
        intensity: template.intensity,
        rationale: `${template.rationale} Scheduled in the ${window.partOfDay} window to fit ${input.profile.displayName}'s current availability.`,
      };
    });

  const focusSummary = `${input.profile.displayName}'s first adaptive week emphasizes ${primaryActivity} with ${workouts.length} planned sessions based on ${input.goal.summary.toLowerCase()}.`;

  return {
    focusSummary,
    primaryActivity,
    recoveryGuidance:
      input.profile.averageSleepHours && input.profile.averageSleepHours < 6
        ? "Average sleep is low, so the plan keeps recovery volume visible and avoids stacking multiple hard sessions."
        : "Recovery capacity looks manageable, so the plan alternates quality and lower-stress sessions.",
    workouts,
  };
};
