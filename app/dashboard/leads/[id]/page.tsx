"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatPhoneForWhatsApp } from "../../../lib/whatsapp";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const STATUS_COLORS: Record<string, string> = {
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

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function toLocalDatetimeValue(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as Id<"leads">;

  const lead = useQuery(api.leads.get, { id: leadId });
  const interactions = useQuery(api.interactions.listByLead, { leadId });
  const updateLead = useMutation(api.leads.update);
  const removeLead = useMutation(api.leads.remove);
  const createInteraction = useMutation(api.interactions.create);
  const updateInteraction = useMutation(api.interactions.update);
  const removeInteraction = useMutation(api.interactions.remove);

  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [interactionEditSaving, setInteractionEditSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loggingInteraction, setLoggingInteraction] = useState(false);
  const [interactionSaving, setInteractionSaving] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const [suggestedMessage, setSuggestedMessage] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  async function handleSuggestMessage() {
    if (!lead || !interactions) return;
    const lastInteraction = interactions[0]; // interactions are ordered desc
    if (!lastInteraction) return;

    setSuggestLoading(true);
    setSuggestError(null);
    setSuggestedMessage(null);

    try {
      const res = await fetch("/api/suggest-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: lead.name,
          status: lead.status,
          requirement: lead.requirement,
          lastInteractionNotes: lastInteraction.notes,
          lastInteractionDate: new Date(lastInteraction.datetime).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuggestedMessage(data.message);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Failed to generate message");
    } finally {
      setSuggestLoading(false);
    }
  }

  function buildWhatsAppUrl(message: string) {
    if (!lead?.phone) return null;
    const phone = formatPhoneForWhatsApp(lead.phone);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  if (lead === undefined || interactions === undefined) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 text-gray-400">
        Loading...
      </div>
    );
  }

  if (lead === null) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 text-gray-400">
        Lead not found.{" "}
        <Link href="/dashboard" className="underline text-gray-900">
          Go back
        </Link>
      </div>
    );
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await updateLead({
      id: lead!._id,
      name: data.get("name") as string,
      phone: (data.get("phone") as string) || undefined,
      email: (data.get("email") as string) || undefined,
      businessType: data.get("businessType") as "real-estate" | "ai-business",
      status: data.get("status") as
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "won"
        | "lost",
      requirement: (data.get("requirement") as string) || undefined,
      nextFollowup: (data.get("nextFollowup") as string) || undefined,
      notes: (data.get("notes") as string) || undefined,
    });
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    await removeLead({ id: lead!._id });
    router.push("/dashboard");
  }

  async function handleLogInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInteractionSaving(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const datetimeStr = data.get("datetime") as string;
    const datetime = datetimeStr
      ? new Date(datetimeStr).getTime()
      : Date.now();
    await createInteraction({
      leadId: lead!._id,
      datetime,
      notes: data.get("notes") as string,
      nextFollowup: (data.get("nextFollowup") as string) || undefined,
    });
    form.reset();
    setInteractionSaving(false);
    setLoggingInteraction(false);
  }

  async function handleUpdateInteraction(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setInteractionEditSaving(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const datetimeStr = data.get("datetime") as string;
    const datetime = datetimeStr ? new Date(datetimeStr).getTime() : Date.now();
    await updateInteraction({
      id: id as Parameters<typeof updateInteraction>[0]["id"],
      datetime,
      notes: data.get("notes") as string,
      nextFollowup: (data.get("nextFollowup") as string) || undefined,
    });
    setInteractionEditSaving(false);
    setEditingInteractionId(null);
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    await updateLead({ id: lead!._id, notes: notesDraft || undefined });
    setNotesSaving(false);
    setEditingNotes(false);
  }

  if (editing) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setEditing(false)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Cancel
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Edit Lead</h1>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <Field label="Name" required>
              <input
                name="name"
                type="text"
                required
                defaultValue={lead.name}
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                name="phone"
                type="tel"
                defaultValue={lead.phone ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                name="email"
                type="email"
                defaultValue={lead.email ?? ""}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Business Type" required>
                <select
                  name="businessType"
                  required
                  defaultValue={lead.businessType}
                  className={inputClass}
                >
                  <option value="real-estate">Real Estate</option>
                  <option value="ai-business">AI Business</option>
                </select>
              </Field>
              <Field label="Status" required>
                <select
                  name="status"
                  required
                  defaultValue={lead.status}
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Requirement">
              <input
                name="requirement"
                type="text"
                defaultValue={lead.requirement ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Next Follow-up Date">
              <input
                name="nextFollowup"
                type="date"
                defaultValue={lead.nextFollowup ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Notes">
              <textarea
                name="notes"
                rows={3}
                defaultValue={lead.notes ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gray-900 text-white font-medium py-3 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{lead.name}</h1>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Edit
        </button>
      </div>

      {/* Lead info */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <Row label="Status">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}
          >
            {STATUS_OPTIONS.find((s) => s.value === lead.status)?.label}
          </span>
        </Row>
        <Row label="Business">
          {lead.businessType === "real-estate" ? "Real Estate" : "AI Business"}
        </Row>
        <Row label="Source">{SOURCE_LABELS[lead.source] ?? lead.source}</Row>
        {lead.phone && (
          <Row label="Phone">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-3">
                <span>{lead.phone}</span>
                {interactions && interactions.length > 0 && (
                  <button
                    onClick={handleSuggestMessage}
                    disabled={suggestLoading}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1 rounded-lg transition-colors"
                  >
                    {suggestLoading ? "Thinking..." : "Suggest WhatsApp message"}
                  </button>
                )}
                {interactions && interactions.length === 0 && lead.phone && (
                  <span className="text-xs text-gray-400">Log an interaction to get AI message suggestions</span>
                )}
              </div>
              {suggestError && (
                <p className="text-xs text-red-500">{suggestError}</p>
              )}
              {suggestedMessage !== null && (
                <div className="mt-1 space-y-2">
                  <textarea
                    value={suggestedMessage}
                    onChange={(e) => setSuggestedMessage(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white resize-none"
                  />
                  <div className="flex gap-2">
                    {buildWhatsAppUrl(suggestedMessage) && (
                      <a
                        href={buildWhatsAppUrl(suggestedMessage)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Open WhatsApp
                      </a>
                    )}
                    <button
                      onClick={handleSuggestMessage}
                      disabled={suggestLoading}
                      className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={() => setSuggestedMessage(null)}
                      className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Row>
        )}
        {lead.email && <Row label="Email">{lead.email}</Row>}
        {lead.requirement && (
          <Row label="Requirement">{lead.requirement}</Row>
        )}
        {lead.nextFollowup && (
          <Row label="Next Follow-up">
            <span className="font-medium text-orange-600">
              {lead.nextFollowup}
            </span>
          </Row>
        )}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Notes
            </div>
            {!editingNotes && (
              <button
                onClick={() => {
                  setNotesDraft(lead.notes ?? "");
                  setEditingNotes(true);
                }}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                {lead.notes ? "Edit" : "+ Add"}
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                autoFocus
                placeholder="Add notes about this lead..."
                className={inputClass + " resize-none"}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {notesSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingNotes(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : lead.notes ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
          ) : (
            <p className="text-sm text-gray-400">No notes yet.</p>
          )}
        </div>
      </div>

      {/* Interaction log section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Interactions
          </h2>
          {!loggingInteraction && (
            <button
              onClick={() => setLoggingInteraction(true)}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              + Log Interaction
            </button>
          )}
        </div>

        {/* Log interaction form */}
        {loggingInteraction && (
          <form
            onSubmit={handleLogInteraction}
            className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 mb-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date & Time" required>
                <input
                  name="datetime"
                  type="datetime-local"
                  defaultValue={toLocalDatetimeValue(Date.now())}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Next Follow-up">
                <input
                  name="nextFollowup"
                  type="date"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Discussion Notes" required>
              <textarea
                ref={notesRef}
                name="notes"
                rows={4}
                required
                placeholder="What was discussed in this interaction?"
                className={inputClass}
                autoFocus
              />
            </Field>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={interactionSaving}
                className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {interactionSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setLoggingInteraction(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Timeline */}
        {interactions.length === 0 && !loggingInteraction && (
          <p className="text-sm text-gray-400 text-center py-6">
            No interactions logged yet.
          </p>
        )}

        <div className="space-y-3">
          {interactions.map((interaction) =>
            editingInteractionId === interaction._id ? (
              <form
                key={interaction._id}
                onSubmit={(e) => handleUpdateInteraction(e, interaction._id)}
                className="bg-white rounded-xl border border-gray-900 p-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date & Time" required>
                    <input
                      name="datetime"
                      type="datetime-local"
                      defaultValue={toLocalDatetimeValue(interaction.datetime)}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Next Follow-up">
                    <input
                      name="nextFollowup"
                      type="date"
                      defaultValue={interaction.nextFollowup ?? ""}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Discussion Notes" required>
                  <textarea
                    name="notes"
                    rows={4}
                    required
                    defaultValue={interaction.notes}
                    className={inputClass}
                    autoFocus
                  />
                </Field>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={interactionEditSaving}
                    className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {interactionEditSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingInteractionId(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div
                key={interaction._id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs font-medium text-gray-400">
                    {formatDateTime(interaction.datetime)}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingInteractionId(interaction._id)}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeInteraction({ id: interaction._id })}
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {interaction.notes}
                </p>
                {interaction.nextFollowup && (
                  <div className="mt-2 text-xs text-orange-600 font-medium">
                    Next follow-up: {interaction.nextFollowup}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Delete */}
      <div className="pb-6">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-400 hover:text-red-600"
          >
            Delete lead
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Are you sure?</span>
            <button
              onClick={handleDelete}
              className="text-sm text-red-600 font-medium hover:text-red-800"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start px-4 py-3 gap-4">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-700">{children}</span>
    </div>
  );
}
