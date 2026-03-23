import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByLead = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interactions")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    leadId: v.id("leads"),
    datetime: v.number(),
    notes: v.string(),
    nextFollowup: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("interactions", args);
    // Keep the lead's nextFollowup in sync with the latest interaction
    if (args.nextFollowup) {
      await ctx.db.patch(args.leadId, { nextFollowup: args.nextFollowup });
    }
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("interactions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
