"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  notes?: string;
};

type CustomerForm = {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  notes: string;
};

const initialCustomers: Customer[] = [
  {
    id: "c1",
    full_name: "Kiss Anna",
    email: "kiss.anna@email.hu",
    phone: "+36 30 111 1111",
    location: "Miskolc",
    notes: "Térd műtét után érdeklődött.",
  },
  {
    id: "c2",
    full_name: "Tóth Béla",
    email: "toth.bela@email.hu",
    phone: "+36 30 222 2222",
    location: "Debrecen",
    notes: "Visszatérő ügyfél.",
  },
  {
    id: "c3",
    full_name: "Szabó Gábor",
    email: "szabo.gabor@email.hu",
    phone: "+36 30 333 3333",
    location: "Budapest",
    notes: "Gyors kiszállítást kért.",
  },
  {
    id: "c4",
    full_name: "Fodor Zsuzsa",
    email: "fodor.zsuzsa@email.hu",
    phone: "+36 30 444 4444",
    location: "Nyíregyháza",
    notes: "Orvosi papírok rendben.",
  },
  {
    id: "c5",
    full_name: "Nagy Imre",
    email: "nagy.imre@email.hu",
    phone: "+36 30 555 5555",
    location: "Eger",
    notes: "Korábbi hosszabbítás volt.",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<CustomerForm>({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    notes: "",
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const haystack = [
        customer.full_name,
        customer.email,
        customer.phone,
        customer.location,
        customer.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search.toLowerCase());
    });
  }, [customers, search]);

  function handleAddCustomer() {
    setFormError("");

    if (!form.full_name.trim() || !form.email.trim() || !form.location.trim()) {
      setFormError("A név, email és lokáció kötelező.");
      return;
    }

    const exists = customers.some(
      (customer) => customer.email.toLowerCase() === form.email.trim().toLowerCase()
    );

    if (exists) {
      setFormError("Ez az email már szerepel az ügyfelek között.");
      return;
    }

    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    setForm({
      full_name: "",
      email: "",
      phone: "",
      location: "",
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
                Ügyfelek
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Ügyféltörzs, elérhetőségek és alap adatok egy helyen.
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
                + Új ügyfél
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Összes ügyfél" value={`${customers.length} db`} />
          <StatCard
            title="Miskolc / környék"
            value={`${customers.filter((c) => c.location.toLowerCase().includes("miskolc")).length} db`}
          />
          <StatCard
            title="Emaillel rendelkező"
            value={`${customers.filter((c) => c.email).length} db`}
          />
          <StatCard
            title="Telefonnal rendelkező"
            value={`${customers.filter((c) => c.phone).length} db`}
          />
        </section>

        {showAddForm ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">Új ügyfél felvitele</h2>
              <p className="mt-1 text-sm text-slate-500">
                Itt a customer törzsadat kerül be a rendszerbe.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Teljes név">
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. Kiss Anna"
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

              <Field label="Telefonszám">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. +36 30 123 4567"
                />
              </Field>

              <Field label="Lokáció">
                <input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. Miskolc"
                />
              </Field>

              <Field label="Megjegyzés">
                <input
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="pl. visszatérő ügyfél"
                />
              </Field>
            </div>

            {formError ? (
              <p className="mt-4 text-sm font-medium text-red-600">{formError}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleAddCustomer}
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
              <h2 className="text-lg font-bold text-slate-900">Ügyfél lista</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keresés név, email, telefon vagy lokáció alapján.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés ügyféladatok között"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredCustomers.map((customer) => (
              <article key={customer.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{customer.full_name}</h3>
                  <p className="text-sm text-slate-600">{customer.email}</p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoRow label="Telefon" value={customer.phone || "—"} />
                  <InfoRow label="Lokáció" value={customer.location} />
                  <InfoRow label="Megjegyzés" value={customer.notes || "—"} />
                </div>
              </article>
            ))}
          </div>

          {filteredCustomers.length === 0 ? (
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
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  );
}