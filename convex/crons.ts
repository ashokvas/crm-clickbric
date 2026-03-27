import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync housing.com leads",
  { minutes: 15 },
  internal.housing.syncLeads
);

export default crons;
