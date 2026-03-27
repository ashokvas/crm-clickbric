import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type HousingLead = {
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  flat_id?: number;
  project_id?: number;
  project_name?: string;
  locality?: string;
  lead_date?: string;
  service_type?: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.HOUSING_API_KEY;
  const apiId = process.env.HOUSING_API_ID;

  if (!apiKey || !apiId) {
    return NextResponse.json(
      { error: "HOUSING_API_KEY and HOUSING_API_ID are not configured" },
      { status: 500 }
    );
  }

  // Determine time range: last sync time → now
  // Default to last 7 days if no prior sync
  const syncState = await convex.query(api.syncState.get, { source: "housing" });
  const now = Math.floor(Date.now() / 1000);
  const twoDaysAgo = now - 2 * 24 * 60 * 60;
  // Housing.com restricts date range to max 2 days -- cap start_date accordingly
  const rawStart = syncState ? Math.floor(syncState.lastSyncAt / 1000) : twoDaysAgo;
  const startDate = Math.max(rawStart, twoDaysAgo);

  // Generate HMAC SHA256 hash of current_time using the API key
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

  const housingUrl = `https://pahal.housing.com/api/v0/get-broker-leads?${params}`;

  let housingData: { data?: HousingLead[]; apiErrors?: unknown };
  try {
    const res = await fetch(housingUrl);
    const rawText = await res.text();
    console.log("Housing.com raw response:", rawText);
    try {
      housingData = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: `Housing.com returned non-JSON: ${rawText.slice(0, 300)}` },
        { status: 502 }
      );
    }
    if (!res.ok || housingData.apiErrors) {
      const details = JSON.stringify(housingData.apiErrors ?? housingData);
      console.error("Housing.com API error:", details);
      return NextResponse.json(
        { error: `Housing.com error: ${details}` },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("Housing.com fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach Housing.com API" }, { status: 502 });
  }

  const leads: HousingLead[] = housingData.data ?? [];
  let created = 0;
  let skipped = 0;

  for (const lead of leads) {
    const name = lead.lead_name?.trim() || "Unknown";
    const phone = lead.lead_phone?.trim() || undefined;

    // Deduplicate by phone number
    if (phone) {
      const existing = await convex.query(api.leads.getByPhone, { phone });
      if (existing) {
        skipped++;
        continue;
      }
    }

    // Build requirement string from available fields
    const requirementParts = [
      lead.service_type,
      lead.project_name,
      lead.locality,
    ].filter(Boolean);
    const requirement = requirementParts.length > 0 ? requirementParts.join(" · ") : undefined;

    await convex.mutation(api.leads.create, {
      name,
      phone,
      email: lead.lead_email?.trim() || undefined,
      businessType: "real-estate",
      source: "housing",
      status: "new",
      requirement,
    });
    created++;
  }

  // Update last sync time
  await convex.mutation(api.syncState.upsert, {
    source: "housing",
    lastSyncAt: Date.now(),
  });

  return NextResponse.json({
    success: true,
    fetched: leads.length,
    created,
    skipped,
    syncedFrom: new Date(startDate * 1000).toISOString(),
    syncedTo: new Date(now * 1000).toISOString(),
  });
}
