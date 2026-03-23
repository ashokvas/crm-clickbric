"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function NewLeadPage() {
  const router = useRouter();
  const createLead = useMutation(api.leads.create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await createLead({
        name: data.get("name") as string,
        phone: (data.get("phone") as string) || undefined,
        email: (data.get("email") as string) || undefined,
        businessType: data.get("businessType") as
          | "real-estate"
          | "ai-business",
        source: data.get("source") as "housing" | "google-ads" | "manual",
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
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Back
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Add New Lead</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <Field label="Name" required>
            <input
              name="name"
              type="text"
              required
              placeholder="Full name"
              className={inputClass}
            />
          </Field>

          <Field label="Phone">
            <input
              name="phone"
              type="tel"
              placeholder="+91 98765 43210"
              className={inputClass}
            />
          </Field>

          <Field label="Email">
            <input
              name="email"
              type="email"
              placeholder="email@example.com"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Business Type" required>
              <select name="businessType" required className={inputClass}>
                <option value="real-estate">Real Estate</option>
                <option value="ai-business">AI Business</option>
              </select>
            </Field>

            <Field label="Source" required>
              <select name="source" required className={inputClass}>
                <option value="manual">Manual</option>
                <option value="housing">Housing.com</option>
                <option value="google-ads">Google Ads</option>
              </select>
            </Field>
          </div>

          <Field label="Status" required>
            <select name="status" required className={inputClass}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </Field>

          <Field label="Requirement">
            <input
              name="requirement"
              type="text"
              placeholder="e.g. 3BHK in Banjara Hills, budget 1.5Cr"
              className={inputClass}
            />
          </Field>

          <Field label="Next Follow-up Date">
            <input name="nextFollowup" type="date" className={inputClass} />
          </Field>

          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              placeholder="Any additional notes..."
              className={inputClass}
            />
          </Field>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gray-900 text-white font-medium py-3 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Lead"}
        </button>
      </form>
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
