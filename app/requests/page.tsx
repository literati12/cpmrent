"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RequestStatus = "waiting" | "scheduled" | "converted" | "cancelled";
type DurationDays = 7 | 14 | 21 | 28;

type RequestRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  requested_start_date: string | null;
  requested_duration_days: number | null;
  status: string;
  assigned_machine_id: string | null;
  priority: number | null;
  notes: string | null;
  created_at: string | null;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  requested_start_date: string;
  requested_duration_days: DurationDays;
  notes: string;
};

const durationOptions: DurationDays[] = [7, 14, 21, 28];

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  waiting: {
    label: "Várakozó",
    className: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  scheduled: {
    label: "Betervezett",
    className: "bg-sky-100 text-sky-700 ring-sky-200",
  },
  converted: {
    label: "Gépre rakva",
    className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  cancelled: {
    label: "Lemondva",
    className: "bg-slate-200 text-slate-700 ring-slate-300",
  },
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  requested_start_date: "",
  requested_duration_days: 14,
  notes: "",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("hu-HU").format(new Date(value));
}

function daysUntil(dateString: string | null) {
  if (!dateString) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadRequests() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(`Lekérdezési hiba: ${error.message}`);
      setLoading(false);
      return;
    }

    setRequests((data ?? []) as RequestRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const haystack = [
        request.name ?? "",
        request.phone ?? "",
        request.email ?? "",
        request.city ?? "",
        request.address ?? "",
        request.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: requests.length,
      waiting: requests.filter((r) => r.status === "waiting").length,
      scheduled: requests.filter((r) => r.status === "scheduled").length,
      converted: requests.filter((r) => r.status === "converted").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
    };
  }, [requests]);

  async function handleCreateRequest() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name.trim() || !form.requested_start_date || !form.city.trim()) {
      setErrorMessage("A név, város és kezdési dátum kötelező.");
      return;
    }

    setSaving(true);

    const customerPayload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      city: form.city.trim(),
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };

    const requestPayload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      city: form.city.trim(),
      address: form.address.trim() || null,
      requested_start_date: form.requested_start_date,
      requested_duration_days: form.requested_duration_days,
      status: "waiting",
      assigned_machine_id: null,
      priority: 1,
      notes: form.notes.trim() || null,
    };

    const { error: customerError } = await supabase
      .from("customers")
      .insert(customerPayload);

    if (customerError) {
      setErrorMessage(`Customer mentési hiba: ${customerError.message}`);
      setSaving(false);
      return;
    }

    const { error: requestError } = await supabase
      .from("requests")
      .insert(requestPayload);

    if (requestError) {
      setErrorMessage(`Request mentési hiba: ${requestError.message}`);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setShowAddForm(false);
    setSuccessMessage("Az új várakozó ügyfél elmentve.");
    setSaving(false);

    await loadRequests();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                CPM admin
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                Várakozó igények
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Minden új ügyfél először ide kerül, és innen lesz később gépre rakva.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  setShowAddForm((prev) => !prev);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Új várakozó ügyfél
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Összes igény" value={`${summary.total} db`} />
          <StatCard title="Várakozó" value={`${summary.waiting} db`} />
          <StatCard title="Betervezett" value={`${summary.scheduled} db`} />
          <StatCard title="Gépre rakva" value={`${summary.converted} db`} />
          <StatCard title="Lemondva" value={`${summary.cancelled} db`} />
        </section>

        {showAddForm ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">Új várakozó ügyfél</h2>
              <p className="mt-1 text-sm text-slate-500">
                Itt egyszerre mentjük a customer és a request rekordot.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Teljes név">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. Kiss Anna"
                />
              </Field>

              <Field label="Telefonszám">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. +36 30 123 4567"
                />
              </Field>

              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. kiss.anna@email.hu"
                />
              </Field>

              <Field label="Város">
                <input
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. Miskolc"
                />
              </Field>

              <Field label="Cím">
                <input
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. Miskolc, Teszt utca 1."
                />
              </Field>

              <Field label="Mikortól bérelné">
                <input
                  type="date"
                  value={form.requested_start_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, requested_start_date: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Időtartam">
                <select
                  value={form.requested_duration_days}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      requested_duration_days: Number(e.target.value) as DurationDays,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  {durationOptions.map((days) => (
                    <option key={days} value={days}>
                      {days} nap
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Megjegyzés">
                <input
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. műtét dátuma változhat"
                />
              </Field>
            </div>

            {errorMessage ? (
              <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
            ) : null}

            {successMessage ? (
              <p className="mt-4 text-sm font-medium text-emerald-600">{successMessage}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleCreateRequest}
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Mentés..." : "Mentés"}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Mégse
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Várólista</h2>
              <p className="mt-1 text-sm text-slate-500">
                A meglévő várakozó ügyfelek adatbázisból töltve.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:max-w-2xl">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés név, email, város vagy megjegyzés alapján"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | RequestStatus)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="all">Összes státusz</option>
                <option value="waiting">Várakozó</option>
                <option value="scheduled">Betervezett</option>
                <option value="converted">Gépre rakva</option>
                <option value="cancelled">Lemondva</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Betöltés...
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredRequests.map((request) => {
                const startInDays = daysUntil(request.requested_start_date);
                const urgent =
                  startInDays !== null &&
                  startInDays <= 2 &&
                  request.status !== "converted" &&
                  request.status !== "cancelled";

                const normalizedStatus = (request.status || "waiting") as RequestStatus;

                return (
                  <article key={request.id} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{request.name}</h3>
                          <span className="text-sm text-slate-500">{request.city ?? "—"}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {request.email || "—"} · {request.phone || "—"}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                          statusConfig[normalizedStatus]?.className ?? statusConfig.waiting.className
                        )}
                      >
                        {statusConfig[normalizedStatus]?.label ?? "Várakozó"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <InfoRow
                        label="Kezdés"
                        value={formatDate(request.requested_start_date)}
                      />
                      <InfoRow
                        label="Időtartam"
                        value={
                          request.requested_duration_days
                            ? `${request.requested_duration_days} nap`
                            : "—"
                        }
                      />
                      <InfoRow label="Cím" value={request.address || "—"} />
                      <InfoRow label="Megjegyzés" value={request.notes || "—"} />
                    </div>

                    {urgent ? (
                      <div className="mt-4">
                        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                          Sürgős:{" "}
                          {startInDays !== null && startInDays <= 0
                            ? "ma indulna"
                            : `${startInDays} napon belül indulna`}
                        </span>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {!loading && filteredRequests.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Nincs találat vagy még nincs rögzített várakozó ügyfél.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  );
}