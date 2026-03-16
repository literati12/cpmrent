"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type RentalStatus = "active" | "expiring" | "finished" | "overdue";
type DurationDays = 7 | 14 | 21 | 28;

type Rental = {
  id: string;
  customer_name: string;
  machine_code: string;
  start_date: string;
  end_date: string;
  duration_days: DurationDays;
  status: RentalStatus;
  price: number;
  paid_amount: number;
  debt: number;
  notes?: string;
};

type RentalForm = {
  customer_name: string;
  machine_code: string;
  start_date: string;
  duration_days: DurationDays;
  price: number;
  paid_amount: number;
  notes: string;
};

const statusConfig: Record<RentalStatus, { label: string; className: string }> = {
  active: {
    label: "Aktív",
    className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  expiring: {
    label: "Hamarosan lejár",
    className: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  finished: {
    label: "Lezárt",
    className: "bg-slate-200 text-slate-700 ring-slate-300",
  },
  overdue: {
    label: "Lejárt",
    className: "bg-red-100 text-red-700 ring-red-200",
  },
};

const durationOptions: DurationDays[] = [7, 14, 21, 28];

const initialRentals: Rental[] = [
  {
    id: "r1",
    customer_name: "Kiss Anna",
    machine_code: "CPM01",
    start_date: "2026-03-05",
    end_date: "2026-03-19",
    duration_days: 14,
    status: "expiring",
    price: 90000,
    paid_amount: 60000,
    debt: 30000,
    notes: "Hosszabbítás esélyes.",
  },
  {
    id: "r2",
    customer_name: "Tóth Béla",
    machine_code: "CPM06",
    start_date: "2026-03-01",
    end_date: "2026-03-22",
    duration_days: 21,
    status: "active",
    price: 120000,
    paid_amount: 120000,
    debt: 0,
    notes: "Stabil futás.",
  },
  {
    id: "r3",
    customer_name: "Szabó Gábor",
    machine_code: "CPM08",
    start_date: "2026-03-01",
    end_date: "2026-03-08",
    duration_days: 7,
    status: "overdue",
    price: 50000,
    paid_amount: 30000,
    debt: 20000,
    notes: "Visszaszállítás csúszik.",
  },
  {
    id: "r4",
    customer_name: "Nagy Imre",
    machine_code: "CPM13",
    start_date: "2026-02-01",
    end_date: "2026-02-28",
    duration_days: 28,
    status: "finished",
    price: 160000,
    paid_amount: 160000,
    debt: 0,
    notes: "Lezárt bérlés.",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU").format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value);
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getStatusFromEndDate(endDate: string): RentalStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "overdue";
  if (diff <= 3) return "expiring";
  return "active";
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>(initialRentals);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RentalStatus>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<RentalForm>({
    customer_name: "",
    machine_code: "",
    start_date: "2026-03-21",
    duration_days: 14,
    price: 0,
    paid_amount: 0,
    notes: "",
  });

  const filteredRentals = useMemo(() => {
    return rentals.filter((rental) => {
      const haystack = [
        rental.customer_name,
        rental.machine_code,
        rental.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : rental.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rentals, search, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: rentals.length,
      active: rentals.filter((r) => r.status === "active").length,
      expiring: rentals.filter((r) => r.status === "expiring").length,
      overdue: rentals.filter((r) => r.status === "overdue").length,
      revenue: rentals.reduce((sum, rental) => sum + rental.price, 0),
      debt: rentals.reduce((sum, rental) => sum + rental.debt, 0),
    };
  }, [rentals]);

  function updateRentalStatus(rentalId: string, nextStatus: RentalStatus) {
    setRentals((prev) =>
      prev.map((rental) =>
        rental.id === rentalId ? { ...rental, status: nextStatus } : rental
      )
    );
  }

  function handleAddRental() {
    setFormError("");

    if (!form.customer_name.trim() || !form.machine_code.trim() || !form.start_date) {
      setFormError("Az ügyfél, a gépkód és a kezdési dátum kötelező.");
      return;
    }

    const endDate = addDays(form.start_date, form.duration_days - 1);
    const nextStatus = getStatusFromEndDate(endDate);

    const newRental: Rental = {
      id: crypto.randomUUID(),
      customer_name: form.customer_name.trim(),
      machine_code: form.machine_code.trim().toUpperCase(),
      start_date: form.start_date,
      end_date: endDate,
      duration_days: form.duration_days,
      status: nextStatus,
      price: Number(form.price) || 0,
      paid_amount: Number(form.paid_amount) || 0,
      debt: Math.max(0, Number(form.price) - Number(form.paid_amount)),
      notes: form.notes.trim(),
    };

    setRentals((prev) => [newRental, ...prev]);
    setForm({
      customer_name: "",
      machine_code: "",
      start_date: "2026-03-21",
      duration_days: 14,
      price: 0,
      paid_amount: 0,
      notes: "",
    });
    setShowAddForm(false);
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
                Bérlések
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Aktív bérlések, lejáratok, tartozások és új rental felvitel.
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
                onClick={() => setShowAddForm((prev) => !prev)}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Új bérlés
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard title="Összes bérlés" value={`${summary.total} db`} />
          <StatCard title="Aktív" value={`${summary.active} db`} />
          <StatCard title="Lejáró" value={`${summary.expiring} db`} />
          <StatCard title="Lejárt" value={`${summary.overdue} db`} />
          <StatCard title="Bevétel" value={formatCurrency(summary.revenue)} />
          <StatCard title="Tartozás" value={formatCurrency(summary.debt)} />
        </section>

        {showAddForm ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">Új bérlés</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ezt már csak akkor vidd fel, ha a customer gépre került.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Ügyfél neve">
                <input
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, customer_name: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. Kiss Anna"
                />
              </Field>

              <Field label="Gépkód">
                <input
                  value={form.machine_code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, machine_code: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. CPM01"
                />
              </Field>

              <Field label="Kezdési dátum">
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Időtartam">
                <select
                  value={form.duration_days}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      duration_days: Number(e.target.value) as DurationDays,
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

              <Field label="Bérleti díj">
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: Number(e.target.value) }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. 90000"
                />
              </Field>

              <Field label="Fizetett összeg">
                <input
                  type="number"
                  value={form.paid_amount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, paid_amount: Number(e.target.value) }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. 60000"
                />
              </Field>

              <Field label="Megjegyzés">
                <input
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. hosszabbítás esélyes"
                />
              </Field>
            </div>

            {formError ? (
              <p className="mt-4 text-sm font-medium text-red-600">{formError}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleAddRental}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Mentés
              </button>
              <button
                onClick={() => setShowAddForm(false)}
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
              <h2 className="text-lg font-bold text-slate-900">Bérlés lista</h2>
              <p className="mt-1 text-sm text-slate-500">
                Szűrés ügyfél, gépkód vagy megjegyzés alapján.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:max-w-2xl">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés bérlések között"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | RentalStatus)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="all">Összes státusz</option>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredRentals.map((rental) => (
              <article key={rental.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {rental.customer_name}
                      </h3>
                      <span className="text-sm text-slate-500">{rental.machine_code}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDate(rental.start_date)} – {formatDate(rental.end_date)}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      statusConfig[rental.status].className
                    )}
                  >
                    {statusConfig[rental.status].label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoRow label="Időtartam" value={`${rental.duration_days} nap`} />
                  <InfoRow label="Bérleti díj" value={formatCurrency(rental.price)} />
                  <InfoRow label="Fizetve" value={formatCurrency(rental.paid_amount)} />
                  <InfoRow label="Tartozás" value={formatCurrency(rental.debt)} />
                  <InfoRow label="Megjegyzés" value={rental.notes || "—"} />
                </div>

                <div className="mt-5">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Státusz módosítás
                  </label>
                  <select
                    value={rental.status}
                    onChange={(e) =>
                      updateRentalStatus(rental.id, e.target.value as RentalStatus)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  >
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <option key={value} value={value}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>

          {filteredRentals.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Nincs találat.
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

function Field({ label, children }: { label: string; children: ReactNode }) {
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