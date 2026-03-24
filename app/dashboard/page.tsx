"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { useState, useMemo } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { generateWhatsAppUrl } from "../lib/whatsapp";

type BusinessType = "real-estate" | "ai-business";
type Status = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
type FollowupFilter = "today" | "tomorrow" | "next7" | "";

const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const STATUS_COLORS: Record<Status, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  proposal: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

const SOURCE_LABELS: Record<string, string> = {
  housing: "Housing.com",
  "google-ads": "Google Ads",
  manual: "Manual",
};

function dateStr(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const [businessFilter, setBusinessFilter] = useState<BusinessType | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Status | undefined>(undefined);
  const [followupFilter, setFollowupFilter] = useState<FollowupFilter>("");

  const leads = useQuery(api.leads.list, {
    businessType: businessFilter,
    status: statusFilter,
  });

  // All leads (unfiltered) for the Today's Follow-ups panel
  const allLeads = useQuery(api.leads.list, {});

  const todayLeads = useMemo(() => {
    if (!allLeads) return [];
    const today = dateStr(0);
    return allLeads
      .filter((l) => l.nextFollowup && l.nextFollowup <= today && l.status !== "won" && l.status !== "lost")
      .sort((a, b) => (a.nextFollowup ?? "").localeCompare(b.nextFollowup ?? ""));
  }, [allLeads]);

  const filteredLeads = useMemo(() => {
    if (!leads) return leads;
    if (!followupFilter) return leads;

    const today = dateStr(0);
    const tomorrow = dateStr(1);
    const in7Days = dateStr(7);

    let result = leads.filter((l) => {
      if (!l.nextFollowup) return false;
      if (followupFilter === "today") return l.nextFollowup === today;
      if (followupFilter === "tomorrow") return l.nextFollowup === tomorrow;
      if (followupFilter === "next7") return l.nextFollowup >= today && l.nextFollowup <= in7Days;
      return true;
    });

    result = [...result].sort((a, b) =>
      (a.nextFollowup ?? "").localeCompare(b.nextFollowup ?? "")
    );

    return result;
  }, [leads, followupFilter]);

  const hasActiveFilter = businessFilter || statusFilter || followupFilter;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Today's Follow-ups panel */}
      {todayLeads.length > 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-orange-200 flex items-center gap-2">
            <span className="text-sm font-semibold text-orange-800">
              Follow-ups due
            </span>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {todayLeads.length}
            </span>
          </div>
          <div className="divide-y divide-orange-100">
            {todayLeads.map((lead) => {
              const waUrl = generateWhatsAppUrl(lead);
              const today = dateStr(0);
              const isOverdue = (lead.nextFollowup ?? "") < today;
              return (
                <div key={lead._id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/leads/${lead._id}`}
                      className="font-medium text-gray-900 text-sm hover:underline"
                    >
                      {lead.name}
                    </Link>
                    <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                      {lead.phone && <span>{lead.phone}</span>}
                      {lead.requirement && (
                        <>
                          <span>·</span>
                          <span className="truncate">{lead.requirement}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-orange-600"}`}>
                      {isOverdue ? `Overdue (${lead.nextFollowup})` : "Today"}
                    </span>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">All Leads</h1>
        <Link
          href="/dashboard/leads/new"
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + Add Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={businessFilter ?? ""}
          onChange={(e) =>
            setBusinessFilter(e.target.value ? (e.target.value as BusinessType) : undefined)
          }
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Businesses</option>
          <option value="real-estate">Real Estate</option>
          <option value="ai-business">AI Business</option>
        </select>

        <select
          value={statusFilter ?? ""}
          onChange={(e) =>
            setStatusFilter(e.target.value ? (e.target.value as Status) : undefined)
          }
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>

        <select
          value={followupFilter}
          onChange={(e) => setFollowupFilter(e.target.value as FollowupFilter)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Follow-ups</option>
          <option value="today">Due Today</option>
          <option value="tomorrow">Due Tomorrow</option>
          <option value="next7">Due in Next 7 Days</option>
        </select>

        {hasActiveFilter && (
          <button
            onClick={() => {
              setBusinessFilter(undefined);
              setStatusFilter(undefined);
              setFollowupFilter("");
            }}
            className="text-sm text-gray-500 hover:text-gray-900 px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Lead count */}
      {filteredLeads !== undefined && (
        <p className="text-sm text-gray-500 mb-3">
          {filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"}
        </p>
      )}

      {/* Loading */}
      {filteredLeads === undefined && (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      )}

      {/* Empty state */}
      {filteredLeads !== undefined && filteredLeads.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No leads found</p>
          {!hasActiveFilter && (
            <p className="text-sm">
              <Link href="/dashboard/leads/new" className="text-gray-900 underline">
                Add your first lead
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Desktop table */}
      {filteredLeads && filteredLeads.length > 0 && (
        <>
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <LeadRow key={lead._id} lead={lead} followupFilter={followupFilter} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filteredLeads.map((lead) => (
              <LeadCard key={lead._id} lead={lead} followupFilter={followupFilter} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function followupLabel(date: string | undefined, filter: FollowupFilter): { text: string; urgent: boolean } {
  if (!date) return { text: "-", urgent: false };
  const today = dateStr(0);
  const tomorrow = dateStr(1);
  if (date < today) return { text: `Overdue (${date})`, urgent: true };
  if (date === today) return { text: "Today", urgent: true };
  if (date === tomorrow) return { text: "Tomorrow", urgent: false };
  return { text: date, urgent: false };
}

function LeadRow({ lead, followupFilter }: { lead: Doc<"leads">; followupFilter: FollowupFilter }) {
  const fu = followupLabel(lead.nextFollowup, followupFilter);
  const waUrl = generateWhatsAppUrl(lead);
  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => (window.location.href = `/dashboard/leads/${lead._id}`)}
    >
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{lead.name}</div>
        {lead.email && <div className="text-gray-400 text-xs">{lead.email}</div>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{lead.phone ?? "-"}</span>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-2 py-0.5 rounded transition-colors"
            >
              WA
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {lead.businessType === "real-estate" ? "Real Estate" : "AI Business"}
      </td>
      <td className="px-4 py-3 text-gray-600">
        {SOURCE_LABELS[lead.source] ?? lead.source}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status as Status]}`}
        >
          {STATUS_LABELS[lead.status as Status]}
        </span>
      </td>
      <td className={`px-4 py-3 text-sm font-medium ${fu.urgent ? "text-red-600" : "text-gray-600"}`}>
        {fu.text}
      </td>
    </tr>
  );
}

function LeadCard({ lead, followupFilter }: { lead: Doc<"leads">; followupFilter: FollowupFilter }) {
  const fu = followupLabel(lead.nextFollowup, followupFilter);
  const waUrl = generateWhatsAppUrl(lead);
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50"
      onClick={() => (window.location.href = `/dashboard/leads/${lead._id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-gray-900">{lead.name}</div>
          {lead.phone && <div className="text-sm text-gray-500">{lead.phone}</div>}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status as Status]}`}
        >
          {STATUS_LABELS[lead.status as Status]}
        </span>
      </div>
      <div className="flex gap-3 text-xs text-gray-400">
        <span>{lead.businessType === "real-estate" ? "Real Estate" : "AI Business"}</span>
        <span>·</span>
        <span>{SOURCE_LABELS[lead.source] ?? lead.source}</span>
        {lead.nextFollowup && (
          <>
            <span>·</span>
            <span className={fu.urgent ? "text-red-600 font-medium" : ""}>
              {fu.text}
            </span>
          </>
        )}
      </div>
      {lead.requirement && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{lead.requirement}</p>
      )}
      {waUrl && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
