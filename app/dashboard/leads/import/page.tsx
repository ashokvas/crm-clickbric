"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Papa from "papaparse";

const FIELD_LABELS: Record<string, string> = {
  name: "Name *",
  phone: "Phone",
  email: "Email",
  requirement: "Requirement",
};

const REQUIRED_FIELDS = ["name"];
const ALL_FIELDS = ["name", "phone", "email", "requirement"];

type Row = Record<string, string>;
type Mapping = Record<string, string>; // field -> csv column

export default function ImportPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const createLead = useMutation(api.leads.create);
  const allLeads = useQuery(api.leads.list, {});

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError(null);

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvHeaders = results.meta.fields ?? [];
        setHeaders(csvHeaders);
        setRows(results.data);

        // Auto-map columns by guessing from header names
        const autoMapping: Mapping = {};
        for (const field of ALL_FIELDS) {
          const match = csvHeaders.find((h) =>
            h.toLowerCase().includes(field) ||
            (field === "name" && h.toLowerCase().includes("contact")) ||
            (field === "phone" && (h.toLowerCase().includes("mobile") || h.toLowerCase().includes("number"))) ||
            (field === "requirement" && (h.toLowerCase().includes("req") || h.toLowerCase().includes("property") || h.toLowerCase().includes("looking")))
          );
          if (match) autoMapping[field] = match;
        }
        setMapping(autoMapping);
      },
      error: (err) => setError(`Could not parse file: ${err.message}`),
    });
  }

  async function handleImport() {
    if (!mapping.name) {
      setError("Please map the Name column before importing.");
      return;
    }

    setImporting(true);
    setError(null);

    const existingPhones = new Set(
      (allLeads ?? []).map((l) => l.phone).filter(Boolean)
    );

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = row[mapping.name]?.trim();
      if (!name) { skipped++; continue; }

      const phone = mapping.phone ? row[mapping.phone]?.trim() || undefined : undefined;

      // Deduplicate by phone
      if (phone && existingPhones.has(phone)) { skipped++; continue; }

      const email = mapping.email ? row[mapping.email]?.trim() || undefined : undefined;
      const requirement = mapping.requirement ? row[mapping.requirement]?.trim() || undefined : undefined;

      await createLead({
        name,
        phone,
        email,
        requirement,
        businessType: "real-estate",
        source: "manual",
        status: "new",
      });

      if (phone) existingPhones.add(phone);
      created++;
    }

    setImporting(false);
    setResult({ created, skipped });
  }

  function reset() {
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Import Leads from CSV</h1>
      </div>

      {/* Step 1: Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">1. Upload CSV file</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-700 cursor-pointer"
        />
        {rows.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">{rows.length} rows detected</p>
        )}
      </div>

      {/* Step 2: Map columns */}
      {headers.length > 0 && !result && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">2. Map columns</h2>
          <div className="space-y-3">
            {ALL_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-4">
                <span className="text-sm text-gray-700 w-32 shrink-0">{FIELD_LABELS[field]}</span>
                <select
                  value={mapping[field] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [field]: e.target.value }))
                  }
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">-- skip --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {rows.length > 0 && mapping.name && !result && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            3. Preview (first 5 rows)
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {ALL_FIELDS.filter((f) => mapping[f]).map((f) => (
                  <th key={f} className="text-left px-2 py-1 font-medium text-gray-500 uppercase tracking-wide">
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {ALL_FIELDS.filter((f) => mapping[f]).map((f) => (
                    <td key={f} className="px-2 py-1.5 text-gray-700">
                      {row[mapping[f]] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && (
            <p className="text-xs text-gray-400 mt-2">...and {rows.length - 5} more rows</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Import button */}
      {rows.length > 0 && mapping.name && !result && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full bg-gray-900 text-white font-medium py-3 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {importing ? `Importing ${rows.length} rows...` : `Import ${rows.length} leads`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-lg font-semibold text-green-800 mb-1">
            {result.created} lead{result.created !== 1 ? "s" : ""} imported
          </p>
          {result.skipped > 0 && (
            <p className="text-sm text-green-600 mb-4">
              {result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped (duplicates or missing name)
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard"
              className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              View leads
            </Link>
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700 px-5 py-2"
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
