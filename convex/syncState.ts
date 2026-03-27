import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { source: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("syncState")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .first();
  },
});

export const upsert = mutation({
  args: { source: v.string(), lastSyncAt: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("syncState")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSyncAt: args.lastSyncAt });
    } else {
      await ctx.db.insert("syncState", args);
    }
  },
});
