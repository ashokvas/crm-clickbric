"use node";

import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { createHmac } from "crypto";

type HousingLead = {
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  project_name?: string;
  locality?: string;
  service_type?: string;
};

export const syncLeads = internalAction({
  handler: async (ctx) => {
    const apiKey = process.env.HOUSING_API_KEY;
    const apiId = process.env.HOUSING_API_ID;

    if (!apiKey || !apiId) {
      console.error("Housing sync: HOUSING_API_KEY or HOUSING_API_ID not set in Convex env");
      return;
    }

    const syncState = await ctx.runQuery(api.syncState.get, { source: "housing" });
    const now = Math.floor(Date.now() / 1000);
    const twoDaysAgo = now - 2 * 24 * 60 * 60;
    const rawStart = syncState ? Math.floor(syncState.lastSyncAt / 1000) : twoDaysAgo;
    const startDate = Math.max(rawStart, twoDaysAgo);

    const currentTime = String(now);
    const hash = createHmac("sha256", apiKey).update(currentTime).digest("hex");

    const params = new URLSearchParams({
      start_date: String(startDate),
      end_date: String(now),
      current_time: currentTime,
      hash,
      id: apiId,
      per_page: "1000",
    });

    let housingData: { data?: HousingLead[]; apiErrors?: unknown };
    try {
      const res = await fetch(`https://pahal.housing.com/api/v0/get-broker-leads?${params}`);
      housingData = await res.json();
      if (!res.ok || housingData.apiErrors) {
        console.error("Housing sync: API error", JSON.stringify(housingData.apiErrors ?? housingData));
        return;
      }
    } catch (err) {
      console.error("Housing sync: fetch failed", err);
      return;
    }

    const leads: HousingLead[] = housingData.data ?? [];
    let created = 0;
    let skipped = 0;

    for (const lead of leads) {
      const phone = lead.lead_phone?.trim() || undefined;

      if (phone) {
        const existing = await ctx.runQuery(api.leads.getByPhone, { phone });
        if (existing) {
          skipped++;
          continue;
        }
      }

      const requirementParts = [lead.service_type, lead.project_name, lead.locality].filter(Boolean);

      await ctx.runMutation(api.leads.create, {
        name: lead.lead_name?.trim() || "Unknown",
        phone,
        email: lead.lead_email?.trim() || undefined,
        businessType: "real-estate",
        source: "housing",
        status: "new",
        requirement: requirementParts.length > 0 ? requirementParts.join(" · ") : undefined,
      });
      created++;
    }

    await ctx.runMutation(api.syncState.upsert, {
      source: "housing",
      lastSyncAt: Date.now(),
    });

    console.log(`Housing sync: ${created} new leads added, ${skipped} skipped from ${leads.length} fetched`);
  },
});
