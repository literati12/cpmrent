"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type RequestStatus = "waiting" | "scheduled" | "converted" | "cancelled";
type DurationDays = 7 | 14 | 21 | 28;
type MachineStatus = "available" | "rented" | "reserved" | "faulty" | "repair";
type RentalStatus = "active" | "reserved" | "finished" | "overdue";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  location: string;
  phone?: string;
};

type RequestItem = {
  id: string;
  customer_id: string;
  requested_start_date: string;
  duration_days: DurationDays;
  status: RequestStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type Machine = {
  id: string;
  machine_code: string;
  name: string;
  status: MachineStatus;
  location: string;
};

type Rental = {
  id: string;
  request_id: string;
  customer_id: string;
  customer_name: string;
  machine_id: string;
  machine_code: string;
  start_date: string;
  end_date: string;
  duration_days: DurationDays;
  status: RentalStatus;
  price: number;
  paid_amount: number;
  debt: number;
  notes?: string;
  created_at: string;
};

type RequestForm = {
  customer_id: string;
  requested_start_date: string;
  duration_days: DurationDays;
  status: RequestStatus;
  notes: string;
};

const customersSeed: Customer[] = [
  { id: "c1", full_name: "Kiss Anna", email: "kiss.anna@email.hu", location: "Miskolc", phone: "+36 30 111 1111" },
  { id: "c2", full_name: "Tóth Béla", email: "toth.bela@email.hu", location: "Debrecen", phone: "+36 30 222 2222" },
  { id: "c3", full_name: "Szabó Gábor", email: "szabo.gabor@email.hu", location: "Budapest", phone: "+36 30 333 3333" },
  { id: "c4", full_name: "Fodor Zsuzsa", email: "fodor.zsuzsa@email.hu", location: "Nyíregyháza", phone: "+36 30 444 4444" },
  { id: "c5", full_name: "Nagy Imre", email: "nagy.imre@email.hu", location: "Eger", phone: "+36 30 555 5555" },
];

const requestsSeed: RequestItem[] = [
  {
    id: "r1",
    customer_id: "c1",
    requested_start_date: "2026-03-18",
    duration_days: 14,
    status: "waiting",
    notes: "Műtét után 1 nappal kérné.",
    created_at: "2026-03-15T09:00:00",
    updated_at: "2026-03-15T09:00:00",
  },
  {
    id: "r2",
    customer_id: "c2",
    requested_start_date: "2026-03-20",
    duration_days: 21,
    status: "scheduled",
    notes: "Kiszállítás időpontja még egyeztetés alatt.",
    created_at: "2026-03-14T10:15:00",
    updated_at: "2026-03-16T08:30:00",
  },
  {
    id: "r3",
    customer_id: "c3",
    requested_start_date: "2026-03-17",
    duration_days: 7,
    status: "waiting",
    notes: "Sürgős, ha felszabadul gép, azonnal menne.",
    created_at: "2026-03-16T07:45:00",
    updated_at: "2026-03-16T07:45:00",
  },
  {
    id: "r4",
    customer_id: "c4",
    requested_start_date: "2026-03-24",
    duration_days: 28,
    status: "cancelled",
    notes: "Ügyfél elhalasztotta a műtétet.",
    created_at: "2026-03-12T14:00:00",
    updated_at: "2026-03-15T16:20:00",
  },
];

const machinesSeed: Machine[] = [
  { id: "m1", machine_code: "CPM01", name: "Kinetec Spectra", status: "available", location: "Raktár" },
  { id: "m2", machine_code: "CPM02", name: "Kinetec Spectra", status: "available", location: "Raktár" },
  { id: "m3", machine_code: "CPM03", name: "Kinetec Spectra", status: "reserved", location: "Debrecen" },
  { id: "m4", machine_code: "CPM04", name: "Kinetec Spectra", status: "rented", location: "Budapest" },
  { id: "m5", machine_code: "CPM05", name: "Kinetec Spectra", status: "repair", location: "Szerviz" },
  { id: "m6", machine_code: "CPM06", name: "Kinetec Spectra", status: "available", location: "Miskolc" },
  { id: "m7", machine_code: "CPM07", name: "Kinetec Spectra", status: "faulty", location: "Nyíregyháza" },
  { id: "m8", machine_code: "CPM08", name: "Kinetec Spectra", status: "available", location: "Raktár" },
];

const rentalsSeed: Rental[] = [];

const requestStatusConfig: Record<RequestStatus, { label: string; className: string }> = {
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

const machineStatusConfig: Record<MachineStatus, { label: string; className: string }> = {
  available: {
    label: "Szabad",
    className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  rented: {
    label: "Kiadva",
    className: "bg-sky-100 text-sky-700 ring-sky-200",
  },
  reserved: {
    label: "Lefoglalt",
    className: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  faulty: {
    label: "Hibás",
    className: "bg-red-100 text-red-700 ring-red-200",
  },
  repair: {
    label: "Javítás alatt",
    className: "bg-slate-200 text-slate-700 ring-slate-300",
  },
};

const rentalStatusConfig: Record<RentalStatus, { label: string; className: string }> = {
  active: {
    label: "Aktív",
    className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  reserved: {
    label: "Előjegyzett",
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

function daysUntil(dateString: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getPriceByDuration(duration: DurationDays) {
  switch (duration) {
    case 7:
      return 50000;
    case 14:
      return 90000;
    case 21:
      return 120000;
    case 28:
      return 160000;
    default:
      return 0;
  }
}

function getRentalStatusFromStartDate(startDate: string): RentalStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  return start > today ? "reserved" : "active";
}

export default function RequestsPage() {
  const [customers] = useState<Customer[]>(customersSeed);
  const [requests, setRequests] = useState<RequestItem[]>(requestsSeed);
  const [machines, setMachines] = useState<Machine[]>(machinesSeed);
  const [rentals, setRentals] = useState<Rental[]>(rentalsSeed);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState("");

  const [form, setForm] = useState<RequestForm>({
    customer_id: customersSeed[0]?.id ?? "",
    requested_start_date: "2026-03-21",
    duration_days: 14,
    status: "waiting",
    notes: "",
  });

  const availableMachines = useMemo(() => {
    return machines.filter((machine) => machine.status === "available");
  }, [machines]);

  const enrichedRequests = useMemo(() => {
    return requests.map((request) => ({
      ...request,
      customer: customers.find((customer) => customer.id === request.customer_id) ?? null,
      startInDays: daysUntil(request.requested_start_date),
    }));
  }, [requests, customers]);

  const filteredRequests = useMemo(() => {
    return enrichedRequests.filter((request) => {
      const haystack = [
        request.customer?.full_name ?? "",
        request.customer?.email ?? "",
        request.customer?.location ?? "",
        request.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enrichedRequests, search, statusFilter]);

  const enrichedRentals = useMemo(() => {
    return rentals
      .map((rental) => ({
        ...rental,
        customer: customers.find((customer) => customer.id === rental.customer_id) ?? null,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rentals, customers]);

  const summary = useMemo(() => {
    return {
      total: requests.length,
      waiting: requests.filter((r) => r.status === "waiting").length,
      scheduled: requests.filter((r) => r.status === "scheduled").length,
      converted: requests.filter((r) => r.status === "converted").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
    };
  }, [requests]);

  function updateRequestStatus(requestId: string, nextStatus: RequestStatus) {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? { ...request, status: nextStatus, updated_at: new Date().toISOString() }
          : request
      )
    );
  }

  function updateRequestDate(requestId: string, nextDate: string) {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? { ...request, requested_start_date: nextDate, updated_at: new Date().toISOString() }
          : request
      )
    );
  }

  function updateRequestDuration(requestId: string, nextDuration: DurationDays) {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? { ...request, duration_days: nextDuration, updated_at: new Date().toISOString() }
          : request
      )
    );
  }

  function handleCreateRequest() {
    setFormError("");

    if (!form.customer_id || !form.requested_start_date) {
      setFormError("Az ügyfél és a kezdési dátum kötelező.");
      return;
    }

    const newRequest: RequestItem = {
      id: crypto.randomUUID(),
      customer_id: form.customer_id,
      requested_start_date: form.requested_start_date,
      duration_days: form.duration_days,
      status: form.status,
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setRequests((prev) => [newRequest, ...prev]);
    setForm({
      customer_id: customersSeed[0]?.id ?? "",
      requested_start_date: "2026-03-21",
      duration_days: 14,
      status: "waiting",
      notes: "",
    });
    setShowAddForm(false);
  }

  function startAssign(requestId: string) {
    setAssigningRequestId(requestId);
    setSelectedMachineId("");
    setAssignError("");
  }

  function cancelAssign() {
    setAssigningRequestId(null);
    setSelectedMachineId("");
    setAssignError("");
  }

  function handleAssignMachine() {
    setAssignError("");

    if (!assigningRequestId) return;

    const request = requests.find((item) => item.id === assigningRequestId);
    if (!request) {
      setAssignError("A kiválasztott igény nem található.");
      return;
    }

    if (!["waiting", "scheduled"].includes(request.status)) {
      setAssignError("Csak várakozó vagy betervezett igény rakható gépre.");
      return;
    }

    if (!selectedMachineId) {
      setAssignError("Válassz egy szabad gépet.");
      return;
    }

    const machine = machines.find((item) => item.id === selectedMachineId);
    if (!machine) {
      setAssignError("A kiválasztott gép nem található.");
      return;
    }

    if (machine.status !== "available") {
      setAssignError("Csak szabad státuszú gép választható.");
      return;
    }

    const customer = customers.find((item) => item.id === request.customer_id);
    if (!customer) {
      setAssignError("A customer rekord nem található.");
      return;
    }

    const endDate = addDays(request.requested_start_date, request.duration_days - 1);
    const rentalStatus = getRentalStatusFromStartDate(request.requested_start_date);
    const price = getPriceByDuration(request.duration_days);

    const newRental: Rental = {
      id: crypto.randomUUID(),
      request_id: request.id,
      customer_id: customer.id,
      customer_name: customer.full_name,
      machine_id: machine.id,
      machine_code: machine.machine_code,
      start_date: request.requested_start_date,
      end_date: endDate,
      duration_days: request.duration_days,
      status: rentalStatus,
      price,
      paid_amount: 0,
      debt: price,
      notes: request.notes?.trim() || "",
      created_at: new Date().toISOString(),
    };

    setRentals((prev) => [newRental, ...prev]);

    setRequests((prev) =>
      prev.map((item) =>
        item.id === request.id
          ? { ...item, status: "converted", updated_at: new Date().toISOString() }
          : item
      )
    );

    setMachines((prev) =>
      prev.map((item) =>
        item.id === machine.id
          ? {
              ...item,
              status: rentalStatus === "reserved" ? "reserved" : "rented",
            }
          : item
      )
    );

    cancelAssign();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">CPM admin</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Várakozó igények</h1>
              <p className="mt-2 text-sm text-slate-600">
                Itt még nincs gép hozzárendelve. Először igény kerül be, utána te döntesz a kiosztásról.
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
                + Új igény
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
              <h2 className="text-lg font-bold text-slate-900">Új várakozó igény</h2>
              <p className="mt-1 text-sm text-slate-500">
                Az ügyfél külön customer rekord, itt csak az igény paramétereit rögzíted.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Ügyfél">
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name} · {customer.location}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Mikortól bérelné">
                <input
                  type="date"
                  value={form.requested_start_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, requested_start_date: e.target.value }))}
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

              <Field label="Státusz">
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as RequestStatus }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  {Object.entries(requestStatusConfig).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label}
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

            {formError ? <p className="mt-4 text-sm font-medium text-red-600">{formError}</p> : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleCreateRequest}
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
              <h2 className="text-lg font-bold text-slate-900">Igénylista</h2>
              <p className="mt-1 text-sm text-slate-500">
                A kiszállítás dátuma és az időtartam menet közben is módosítható.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:max-w-2xl">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés név, email, lokáció vagy megjegyzés alapján"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | RequestStatus)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="all">Összes státusz</option>
                {Object.entries(requestStatusConfig).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredRequests.map((request) => {
              const customer = request.customer;
              const urgent =
                request.startInDays <= 2 &&
                request.status !== "converted" &&
                request.status !== "cancelled";

              const canAssign = request.status === "waiting" || request.status === "scheduled";
              const isAssigning = assigningRequestId === request.id;

              return (
                <article key={request.id} className="rounded-3xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {customer?.full_name ?? "Ismeretlen ügyfél"}
                        </h3>
                        <span className="text-sm text-slate-500">{customer?.location ?? "-"}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{customer?.email ?? "-"}</p>
                    </div>

                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                        requestStatusConfig[request.status].className
                      )}
                    >
                      {requestStatusConfig[request.status].label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoRow label="Kezdés" value={formatDate(request.requested_start_date)} />
                    <InfoRow label="Időtartam" value={`${request.duration_days} nap`} />
                    <InfoRow label="Lokáció" value={customer?.location ?? "-"} />
                    <InfoRow label="Megjegyzés" value={request.notes || "—"} />
                  </div>

                  {urgent ? (
                    <div className="mt-4">
                      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                        Sürgős:{" "}
                        {request.startInDays <= 0
                          ? "ma indulna"
                          : `${request.startInDays} napon belül indulna`}
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Státusz
                      </label>
                      <select
                        value={request.status}
                        onChange={(e) => updateRequestStatus(request.id, e.target.value as RequestStatus)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      >
                        {Object.entries(requestStatusConfig).map(([value, config]) => (
                          <option key={value} value={value}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kiszállítás napja
                      </label>
                      <input
                        type="date"
                        value={request.requested_start_date}
                        onChange={(e) => updateRequestDate(request.id, e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Időtartam
                      </label>
                      <select
                        value={request.duration_days}
                        onChange={(e) =>
                          updateRequestDuration(request.id, Number(e.target.value) as DurationDays)
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      >
                        {durationOptions.map((days) => (
                          <option key={days} value={days}>
                            {days} nap
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateRequestStatus(request.id, "scheduled")}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      Betervezés
                    </button>

                    {canAssign ? (
                      <button
                        onClick={() => startAssign(request.id)}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Gépre rakás
                      </button>
                    ) : (
                      <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                        Már gépre rakva
                      </span>
                    )}
                  </div>

                  {isAssigning ? (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-bold text-slate-900">Szabad gép kiválasztása</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Csak szabad státuszú gépet lehet ehhez az igényhez hozzárendelni.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Elérhető gépek
                          </label>
                          <select
                            value={selectedMachineId}
                            onChange={(e) => setSelectedMachineId(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                          >
                            <option value="">Válassz gépet</option>
                            {availableMachines.map((machine) => (
                              <option key={machine.id} value={machine.id}>
                                {machine.machine_code} · {machine.location}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Várható bérleti díj
                          </div>
                          <div className="mt-1 text-lg font-bold text-slate-900">
                            {formatCurrency(getPriceByDuration(request.duration_days))}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {request.duration_days} nap alapján számolva
                          </div>
                        </div>
                      </div>

                      {assignError ? (
                        <p className="mt-3 text-sm font-medium text-red-600">{assignError}</p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={handleAssignMachine}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Kiosztás és rental létrehozása
                        </button>
                        <button
                          onClick={cancelAssign}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          Mégse
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {filteredRequests.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Nincs találat a megadott szűrésre.
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Létrejött bérlések</h2>
              <p className="mt-1 text-sm text-slate-500">
                A várólistából létrehozott rental rekordok előnézete.
              </p>
            </div>

            <Link
              href="/rentals"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Bérlések oldal
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {enrichedRentals.map((rental) => (
              <article key={rental.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{rental.customer_name}</h3>
                      <span className="text-sm text-slate-500">{rental.machine_code}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDate(rental.start_date)} – {formatDate(rental.end_date)}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      rentalStatusConfig[rental.status].className
                    )}
                  >
                    {rentalStatusConfig[rental.status].label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoRow label="Időtartam" value={`${rental.duration_days} nap`} />
                  <InfoRow label="Díj" value={formatCurrency(rental.price)} />
                  <InfoRow label="Fizetve" value={formatCurrency(rental.paid_amount)} />
                  <InfoRow label="Tartozás" value={formatCurrency(rental.debt)} />
                </div>
              </article>
            ))}
          </div>

          {enrichedRentals.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Még nincs létrehozott bérlés a várólistából.
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Elérhető gépek</h2>
              <p className="mt-1 text-sm text-slate-500">
                Itt látod, melyik gép osztható ki a várólistából.
              </p>
            </div>

            <Link
              href="/machines"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Gépek oldal
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {machines.map((machine) => (
              <article key={machine.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{machine.machine_code}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {machine.name} · {machine.location}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      machineStatusConfig[machine.status].className
                    )}
                  >
                    {machineStatusConfig[machine.status].label}
                  </span>
                </div>
              </article>
            ))}
          </div>
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
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  );
}