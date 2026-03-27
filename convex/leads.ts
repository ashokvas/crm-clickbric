import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const statusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("proposal"),
  v.literal("won"),
  v.literal("lost")
);

const businessTypeValidator = v.union(
  v.literal("real-estate"),
  v.literal("ai-business")
);

export const list = query({
  args: {
    businessType: v.optional(businessTypeValidator),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    if (args.businessType && args.status) {
      return await ctx.db
        .query("leads")
        .withIndex("by_business_type_status", (q) =>
          q.eq("businessType", args.businessType!).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }

    if (args.businessType) {
      return await ctx.db
        .query("leads")
        .withIndex("by_business_type", (q) =>
          q.eq("businessType", args.businessType!)
        )
        .order("desc")
        .collect();
    }

    if (args.status) {
      return await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("leads").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("leads").collect();
    return all.find((l) => l.phone === args.phone) ?? null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    businessType: businessTypeValidator,
    source: v.union(
      v.literal("housing"),
      v.literal("google-ads"),
      v.literal("manual")
    ),
    status: statusValidator,
    requirement: v.optional(v.string()),
    nextFollowup: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("leads"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    businessType: v.optional(businessTypeValidator),
    status: v.optional(statusValidator),
    requirement: v.optional(v.string()),
    nextFollowup: v.optional(v.string()),
    notes: v.optional(v.string()),
    conversationLog: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
