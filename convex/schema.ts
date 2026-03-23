import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  leads: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    businessType: v.union(v.literal("real-estate"), v.literal("ai-business")),
    source: v.union(
      v.literal("housing"),
      v.literal("google-ads"),
      v.literal("manual")
    ),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("proposal"),
      v.literal("won"),
      v.literal("lost")
    ),
    requirement: v.optional(v.string()),
    nextFollowup: v.optional(v.string()),
    notes: v.optional(v.string()),
    conversationLog: v.optional(v.string()),
  })
    .index("by_business_type", ["businessType"])
    .index("by_status", ["status"])
    .index("by_business_type_status", ["businessType", "status"]),

  interactions: defineTable({
    leadId: v.id("leads"),
    datetime: v.number(),
    notes: v.string(),
    nextFollowup: v.optional(v.string()),
  }).index("by_lead", ["leadId"]),

  emailLogs: defineTable({
    leadId: v.id("leads"),
    subject: v.string(),
    body: v.string(),
    sentAt: v.number(),
    status: v.union(v.literal("sent"), v.literal("failed")),
  }).index("by_lead", ["leadId"]),
});
