"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type RentalStatus = "active" | "finished" | "waiting" | "cancelled";
type MachineStatus = "available" | "rented" | "service";

type Machine = {
  id: string;
  name: string;
  type: string;
  status: MachineStatus;
  location: string | null;
  notes?: string | null;
};

type Customer = {
  id: string;
  name: string;
  city?: string | null;
  phone?: string | null;
};

type Rental = {
  id: string;
  machine_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  status: RentalStatus;
  berleti_dij: number;
  fizetett_osszeg: number;
  tartozas: number;
  note?: string | null;
};

type RequestItem = {
  id: string;
  name: string;
  city?: string | null;
  phone?: string | null;
  status: string;
  priority?: number | null;
  requested_start_date?: string | null;
};

type UtilizationRow = {
  machineId: string;
  machineName: string;
  rentedDays: number;
  daysInMonth: number;
  utilization: number;
  revenue: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU").format(new Date(value));
}

function diffInDays(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function overlapDays(startA: Date, endA: Date, startB: Date, endB: Date) {
  const start = new Date(Math.max(startA.getTime(), startB.getTime()));
  const end = new Date(Math.min(endA.getTime(), endB.getTime()));
  if (end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getMonthRange(baseDate = new Date()) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  return { start, end, daysInMonth: end.getDate() };
}

function getPreviousMonthRange(baseDate = new Date()) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth(), 0);
  return { start, end, daysInMonth: end.getDate() };
}

function buildUtilizationRows(machines: Machine[], rentals: Rental[], range: { start: Date; end: Date; daysInMonth: number }): UtilizationRow[] {
  return machines.map((machine) => {
    const machineRentals = rentals.filter(
      (r) => r.machine_id === machine.id && ["active", "finished"].includes(r.status)
    );

    const rentedDays = machineRentals.reduce((sum, rental) => {
      return (
        sum +
        overlapDays(
          new Date(rental.start_date),
          new Date(rental.end_date),
          range.start,
          range.end
        )
      );
    }, 0);

    const revenue = machineRentals.reduce((sum, rental) => {
      const overlap = overlapDays(
        new Date(rental.start_date),
        new Date(rental.end_date),
        range.start,
        range.end
      );

      const fullRentalDays = overlapDays(
        new Date(rental.start_date),
        new Date(rental.end_date),
        new Date(rental.start_date),
        new Date(rental.end_date)
      );

      if (fullRentalDays === 0) return sum;
      return sum + (rental.berleti_dij / fullRentalDays) * overlap;
    }, 0);

    const utilization = range.daysInMonth === 0 ? 0 : (rentedDays / range.daysInMonth) * 100;

    return {
      machineId: machine.id,
      machineName: machine.name,
      rentedDays,
      daysInMonth: range.daysInMonth,
      utilization,
      revenue: Math.round(revenue),
    };
  });
}

function getFleetUtilization(rows: UtilizationRow[]) {
  if (rows.length === 0) return 0;
  const totalPossible = rows.reduce((sum, row) => sum + row.daysInMonth, 0);
  const totalUsed = rows.reduce((sum, row) => sum + row.rentedDays, 0);
  if (totalPossible === 0) return 0;
  return (totalUsed / totalPossible) * 100;
}

function getRecommendation(currentUtilization: number, previousUtilization: number, waitingCount: number) {
  if (currentUtilization > 92) {
    return {
      level: "critical",
      title: "Sürgős kapacitásbővítés",
      text: "A flotta kihasználtsága extrém magas. Indíts új gépbeszerzést minél előbb.",
    };
  }

  if (currentUtilization > 89 && previousUtilization > 89) {
    return {
      level: "success",
      title: "Új gép ajánlott",
      text: "A kihasználtság 2 egymást követő hónapban 89% felett van. Ez már beszerzési trigger.",
    };
  }

  if (currentUtilization >= 85 || waitingCount > 0) {
    return {
      level: "warning",
      title: "Kapacitásfigyelés szükséges",
      text: "A kihasználtság emelkedik vagy van várólista. Figyeld a következő heteket és a hosszabbításokat.",
    };
  }

  return {
    level: "info",
    title: "Stabil kapacitás",
    text: "A jelenlegi flotta még kezelhető terhelésen fut. Nincs azonnali beszerzési nyomás.",
  };
}

export default function DashboardPage() {
  // TODO: Ezt a blokkot cseréld Supabase lekérésre.
  const machines: Machine[] = [
    { id: "m1", name: "CPM01", type: "Knee CPM", status: "rented", location: "Miskolc" },
    { id: "m2", name: "CPM02", type: "Knee CPM", status: "rented", location: "Debrecen" },
    { id: "m3", name: "CPM03", type: "Knee CPM", status: "available", location: "Raktár" },
    { id: "m4", name: "CPM04", type: "Knee CPM", status: "rented", location: "Budapest" },
    { id: "m5", name: "CPM05", type: "Knee CPM", status: "service", location: "Szerviz" },
  ];

  const customers: Customer[] = [
    { id: "c1", name: "Kiss Anna", city: "Miskolc", phone: "+36 30 111 1111" },
    { id: "c2", name: "Tóth Béla", city: "Debrecen", phone: "+36 30 222 2222" },
    { id: "c3", name: "Szabó Gábor", city: "Budapest", phone: "+36 30 333 3333" },
  ];

  const rentals: Rental[] = [
    {
      id: "r1",
      machine_id: "m1",
      customer_id: "c1",
      start_date: "2026-03-01",
      end_date: "2026-03-21",
      status: "active",
      berleti_dij: 90000,
      fizetett_osszeg: 60000,
      tartozas: 30000,
      note: "Hosszabbítás várható",
    },
    {
      id: "r2",
      machine_id: "m2",
      customer_id: "c2",
      start_date: "2026-03-03",
      end_date: "2026-03-25",
      status: "active",
      berleti_dij: 98000,
      fizetett_osszeg: 98000,
      tartozas: 0,
    },
    {
      id: "r3",
      machine_id: "m4",
      customer_id: "c3",
      start_date: "2026-03-10",
      end_date: "2026-03-18",
      status: "active",
      berleti_dij: 56000,
      fizetett_osszeg: 30000,
      tartozas: 26000,
    },
    {
      id: "r4",
      machine_id: "m3",
      customer_id: "c1",
      start_date: "2026-02-01",
      end_date: "2026-02-27",
      status: "finished",
      berleti_dij: 110000,
      fizetett_osszeg: 110000,
      tartozas: 0,
    },
  ];

  const requests: RequestItem[] = [
    {
      id: "q1",
      name: "Nagy István",
      city: "Nyíregyháza",
      phone: "+36 30 444 4444",
      status: "waiting",
      priority: 1,
      requested_start_date: "2026-03-17",
    },
    {
      id: "q2",
      name: "Fodor Zsuzsa",
      city: "Eger",
      phone: "+36 30 555 5555",
      status: "waiting",
      priority: 2,
      requested_start_date: "2026-03-20",
    },
  ];

  const now = new Date();
  const currentMonth = getMonthRange(now);
  const previousMonth = getPreviousMonthRange(now);

  const activeRentals = rentals.filter((r) => r.status === "active");
  const rentedMachinesCount = machines.filter((m) => m.status === "rented").length;
  const availableMachinesCount = machines.filter((m) => m.status === "available").length;
  const serviceMachinesCount = machines.filter((m) => m.status === "service").length;
  const waitingRequests = requests.filter((r) => r.status === "waiting");

  const monthlyRevenue = rentals
    .filter((r) => {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      return end >= currentMonth.start && start <= currentMonth.end;
    })
    .reduce((sum, rental) => sum + rental.berleti_dij, 0);

  const totalDebt = rentals.reduce((sum, rental) => sum + rental.tartozas, 0);

  const expiringRentals = activeRentals
    .map((rental) => ({
      ...rental,
      daysLeft: diffInDays(now, new Date(rental.end_date)),
      machine: machines.find((m) => m.id === rental.machine_id),
      customer: customers.find((c) => c.id === rental.customer_id),
    }))
    .filter((rental) => rental.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const currentUtilizationRows = buildUtilizationRows(machines, rentals, currentMonth).sort(
    (a, b) => b.utilization - a.utilization
  );
  const previousUtilizationRows = buildUtilizationRows(machines, rentals, previousMonth);

  const fleetUtilization = getFleetUtilization(currentUtilizationRows);
  const previousFleetUtilization = getFleetUtilization(previousUtilizationRows);
  const averageRentalDays =
    rentals.length === 0
      ? 0
      : Math.round(
          rentals.reduce((sum, rental) => {
            return (
              sum +
              overlapDays(
                new Date(rental.start_date),
                new Date(rental.end_date),
                new Date(rental.start_date),
                new Date(rental.end_date)
              )
            );
          }, 0) / rentals.length
        );

  const topUtilization = currentUtilizationRows.slice(0, 5);
  const lowUtilization = currentUtilizationRows.filter((row) => row.utilization < 40);

  const recommendation = getRecommendation(
    fleetUtilization,
    previousFleetUtilization,
    waitingRequests.length
  );

  const recommendationStyles: Record<string, string> = {
    critical: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-slate-200 bg-slate-50 text-slate-900",
  };

  const quickLinks = [
    { href: "/machines", label: "Gépek" },
    { href: "/customers", label: "Ügyfelek" },
    { href: "/rentals", label: "Bérlések" },
    { href: "/requests", label: "Várólista" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">CPM admin</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              Operatív kontroll, pénzügyi rálátás és kapacitásfigyelés egy nézetben.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard title="Havi bevétel" value={formatCurrency(monthlyRevenue)} subtitle="aktuális hónap" />
          <KpiCard title="Aktív gépek" value={`${machines.length} db`} subtitle="teljes flotta" />
          <KpiCard title="Kint lévő gépek" value={`${rentedMachinesCount} db`} subtitle="épp bérbe adva" />
          <KpiCard title="Szabad gépek" value={`${availableMachinesCount} db`} subtitle="azonnal kiadható" />
          <KpiCard title="Várakozó ügyfelek" value={`${waitingRequests.length} db`} subtitle="gépre várnak" />
          <KpiCard title="Lejárók 7 napon belül" value={`${expiringRentals.length} db`} subtitle="utánkövetés kell" />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Kapacitás és üzleti ajánlás</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Beszerzési trigger, terhelés és flotta trend összefoglaló.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                <div className="text-xs uppercase tracking-wide text-slate-500">Flotta kihasználtság</div>
                <div className="text-2xl font-bold text-slate-900">{fleetUtilization.toFixed(1)}%</div>
              </div>
            </div>

            <div className={cn("mt-6 rounded-3xl border p-5", recommendationStyles[recommendation.level])}>
              <div className="text-sm font-semibold uppercase tracking-wide">Ajánlás</div>
              <h3 className="mt-1 text-xl font-bold">{recommendation.title}</h3>
              <p className="mt-2 text-sm leading-6">{recommendation.text}</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MiniMetric label="Előző havi kihasználtság" value={`${previousFleetUtilization.toFixed(1)}%`} />
                <MiniMetric label="Szervizben" value={`${serviceMachinesCount} db`} />
                <MiniMetric label="Átlag bérlési idő" value={`${averageRentalDays} nap`} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <InfoTile
                title="Kintlévőség"
                value={formatCurrency(totalDebt)}
                hint="összes nyitott tartozás"
              />
              <InfoTile
                title="Új gép trigger"
                value={fleetUtilization > 89 && previousFleetUtilization > 89 ? "AKTÍV" : "NINCS"}
                hint="89% felett 2 hónapig"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Gyors navigáció</h2>
            <p className="mt-1 text-sm text-slate-500">Innen nyílnak a részletes oldalak.</p>
            <div className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span>{link.label}</span>
                  <span>→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Hamarosan lejáró bérlések</h2>
                <p className="mt-1 text-sm text-slate-500">A következő 7 nap operatív fókusza.</p>
              </div>
              <Link href="/rentals" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                Összes bérlés
              </Link>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Ügyfél</TableHead>
                    <TableHead>Gép</TableHead>
                    <TableHead>Lejárat</TableHead>
                    <TableHead>Hátralévő nap</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {expiringRentals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        Nincs 7 napon belül lejáró bérlés.
                      </td>
                    </tr>
                  ) : (
                    expiringRentals.map((rental) => (
                      <tr key={rental.id}>
                        <TableCell>{rental.customer?.name ?? "-"}</TableCell>
                        <TableCell>{rental.machine?.name ?? "-"}</TableCell>
                        <TableCell>{formatDate(rental.end_date)}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-semibold",
                              rental.daysLeft <= 2
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            )}
                          >
                            {rental.daysLeft} nap
                          </span>
                        </TableCell>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Várakozó ügyfelek</h2>
                <p className="mt-1 text-sm text-slate-500">Azonnali sales és operatív pipeline.</p>
              </div>
              <Link href="/requests" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                Összes igény
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {waitingRequests.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Nincs várakozó ügyfél.
                </div>
              ) : (
                waitingRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{request.name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {request.city ?? "-"} · {request.phone ?? "-"}
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        Prioritás: {request.priority ?? "-"}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      Igényelt kezdés: {request.requested_start_date ? formatDate(request.requested_start_date) : "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Gép kihasználtság</h2>
                <p className="mt-1 text-sm text-slate-500">Havi termelés és kapacitás gépenként.</p>
              </div>
              <div className="text-sm font-semibold text-slate-600">Top futó gépek</div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Gép</TableHead>
                    <TableHead>Kihasználtság</TableHead>
                    <TableHead>Kint nap</TableHead>
                    <TableHead>Bevétel</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {topUtilization.map((row) => (
                    <tr key={row.machineId}>
                      <TableCell>{row.machineName}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            row.utilization >= 89
                              ? "bg-emerald-100 text-emerald-700"
                              : row.utilization >= 60
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          )}
                        >
                          {row.utilization.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.rentedDays}/{row.daysInMonth}
                      </TableCell>
                      <TableCell>{formatCurrency(row.revenue)}</TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Alacsony kihasználtságú gépek</h2>
            <p className="mt-1 text-sm text-slate-500">Ezeknél lokációt, állapotot vagy pricingot érdemes átnézni.</p>

            <div className="mt-5 space-y-3">
              {lowUtilization.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Nincs 40% alatti gép ebben a hónapban.
                </div>
              ) : (
                lowUtilization.map((row) => (
                  <div key={row.machineId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{row.machineName}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {row.rentedDays}/{row.daysInMonth} nap használat
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {row.utilization.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-black/5">
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function InfoTile({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}
