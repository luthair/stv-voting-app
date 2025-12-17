import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily sync of Discord members at 2 AM UTC
crons.daily(
  "syncDiscordMembers",
  {
    hourUTC: 2,
    minuteUTC: 0,
  },
  internal.discord.syncMembers
);

// Check for phase transitions and deadline reminders every hour at minute 0
crons.hourly(
  "checkPhaseTransitions",
  {
    minuteUTC: 0,
  },
  internal.cycles.checkAndAdvancePhases
);

export default crons;

