use client;

import Link from nextlink;
import { useMemo, useState } from react;

type RequestStatus = waiting  scheduled  converted  cancelled;
type DurationDays = 7  14  21  28;

type Customer = {
  id string;
  full_name string;
  email string;
  location string;
  phone string;
};

type RequestItem = {
  id string;
  customer_id string;
  requested_start_date string;
  duration_days DurationDays;
  status RequestStatus;
  notes string;
  created_at string;
  updated_at string;
};

type RequestForm = {
  customer_id string;
  requested_start_date string;
  duration_days DurationDays;
  status RequestStatus;
  notes string;
};

const customersSeed Customer[] = [
  { id c1, full_name Kiss Anna, email kiss.anna@email.hu, location Miskolc, phone +36 30 111 1111 },
  { id c2, full_name Tóth Béla, email toth.bela@email.hu, location Debrecen, phone +36 30 222 2222 },
  { id c3, full_name Szabó Gábor, email szabo.gabor@email.hu, location Budapest, phone +36 30 333 3333 },
  { id c4, full_name Fodor Zsuzsa, email fodor.zsuzsa@email.hu, location Nyíregyháza, phone +36 30 444 4444 },
  { id c5, full_name Nagy Imre, email nagy.imre@email.hu, location Eger, phone +36 30 555 5555 },
];

const requestsSeed RequestItem[] = [
  {
    id r1,
    customer_id c1,
    requested_start_date 2026-03-18,
    duration_days 14,
    status waiting,
    notes Műtét után 1 nappal kérné.,
    created_at 2026-03-15T090000,
    updated_at 2026-03-15T090000,
  },
  {
    id r2,
    customer_id c2,
    requested_start_date 2026-03-20,
    duration_days 21,
    status scheduled,
    notes Kiszállítás időpontja még egyeztetés alatt.,
    created_at 2026-03-14T101500,
    updated_at 2026-03-16T083000,
  },
  {
    id r3,
    customer_id c3,
    requested_start_date 2026-03-17,
    duration_days 7,
    status waiting,
    notes Sürgős, ha felszabadul gép, azonnal menne.,
    created_at 2026-03-16T074500,
    updated_at 2026-03-16T074500,
  },
  {
    id r4,
    customer_id c4,
    requested_start_date 2026-03-24,
    duration_days 28,
    status cancelled,
    notes Ügyfél elhalasztotta a műtétet.,
    created_at 2026-03-12T140000,
    updated_at 2026-03-15T162000,
  },
  {
    id r5,
    customer_id c5,
    requested_start_date 2026-03-19,
    duration_days 14,
    status converted,
    notes Már bérléssé alakítva.,
    created_at 2026-03-13T110000,
    updated_at 2026-03-16T100000,
  },
];

const statusConfig RecordRequestStatus, { label string; className string } = {
  waiting {
    label Várakozó,
    className bg-amber-100 text-amber-700 ring-amber-200,
  },
  scheduled {
    label Betervezett,
    className bg-sky-100 text-sky-700 ring-sky-200,
  },
  converted {
    label Gépre rakva,
    className bg-emerald-100 text-emerald-700 ring-emerald-200,
  },
  cancelled {
    label Lemondva,
    className bg-slate-200 text-slate-700 ring-slate-300,
  },
};

const durationOptions DurationDays[] = [7, 14, 21, 28];

function cn(...classes Arraystring  false  null  undefined) {
  return classes.filter(Boolean).join( );
}

function formatDate(value string) {
  return new Intl.DateTimeFormat(hu-HU).format(new Date(value));
}

function daysUntil(dateString string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime())  (1000  60  60  24));
}

export default function RequestsPage() {
  const [customers] = useStateCustomer[](customersSeed);
  const [requests, setRequests] = useStateRequestItem[](requestsSeed);
  const [search, setSearch] = useState();
  const [statusFilter, setStatusFilter] = useStateall  RequestStatus(all);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState();
  const [form, setForm] = useStateRequestForm({
    customer_id customersSeed[0].id  ,
    requested_start_date 2026-03-21,
    duration_days 14,
    status waiting,
    notes ,
  });

  const enrichedRequests = useMemo(() = {
    return requests.map((request) = ({
      ...request,
      customer customers.find((customer) = customer.id === request.customer_id)  null,
      startInDays daysUntil(request.requested_start_date),
    }));
  }, [requests, customers]);

  const filteredRequests = useMemo(() = {
    return enrichedRequests.filter((request) = {
      const haystack = [
        request.customer.full_name  ,
        request.customer.email  ,
        request.customer.location  ,
        request.notes  ,
      ]
        .join( )
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === all  true  request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enrichedRequests, search, statusFilter]);

  const summary = useMemo(() = {
    return {
      total requests.length,
      waiting requests.filter((r) = r.status === waiting).length,
      scheduled requests.filter((r) = r.status === scheduled).length,
      converted requests.filter((r) = r.status === converted).length,
      cancelled requests.filter((r) = r.status === cancelled).length,
    };
  }, [requests]);

  function updateRequestStatus(requestId string, nextStatus RequestStatus) {
    setRequests((prev) =
      prev.map((request) =
        request.id === requestId
           { ...request, status nextStatus, updated_at new Date().toISOString() }
           request
      )
    );
  }

  function updateRequestDate(requestId string, nextDate string) {
    setRequests((prev) =
      prev.map((request) =
        request.id === requestId
           { ...request, requested_start_date nextDate, updated_at new Date().toISOString() }
           request
      )
    );
  }

  function updateRequestDuration(requestId string, nextDuration DurationDays) {
    setRequests((prev) =
      prev.map((request) =
        request.id === requestId
           { ...request, duration_days nextDuration, updated_at new Date().toISOString() }
           request
      )
    );
  }

  function handleCreateRequest() {
    setFormError();

    if (!form.customer_id  !form.requested_start_date) {
      setFormError(Az ügyfél és a kezdési dátum kötelező.);
      return;
    }

    const newRequest RequestItem = {
      id crypto.randomUUID(),
      customer_id form.customer_id,
      requested_start_date form.requested_start_date,
      duration_days form.duration_days,
      status form.status,
      notes form.notes.trim(),
      created_at new Date().toISOString(),
      updated_at new Date().toISOString(),
    };

    setRequests((prev) = [newRequest, ...prev]);
    setForm({
      customer_id customersSeed[0].id  ,
      requested_start_date 2026-03-21,
      duration_days 14,
      status waiting,
      notes ,
    });
    setShowAddForm(false);
  }

  return (
    main className=min-h-screen bg-slate-50 p-4 mdp-6
      div className=mx-auto max-w-7xl space-y-6
        section className=rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200
          div className=flex flex-col gap-4 lgflex-row lgitems-center lgjustify-between
            div
              p className=text-sm font-medium uppercase tracking-wide text-slate-500CPM adminp
              h1 className=mt-1 text-3xl font-bold tracking-tight text-slate-900Várakozó igényekh1
              p className=mt-2 text-sm text-slate-600
                Itt még nincs gép hozzárendelve. Először igény kerül be, utána te döntesz a kiosztásról.
              p
            div

            div className=flex flex-wrap gap-2
              Link
                href=
                className=rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hoverborder-slate-300 hoverbg-slate-100
              
                Dashboard
              Link
              button
                onClick={() = setShowAddForm((prev) = !prev)}
                className=rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hoverbg-slate-800
              
                + Új igény
              button
            div
          div
        section

        section className=grid grid-cols-1 gap-4 smgrid-cols-2 xlgrid-cols-5
          StatCard title=Összes igény value={`${summary.total} db`} 
          StatCard title=Várakozó value={`${summary.waiting} db`} 
          StatCard title=Betervezett value={`${summary.scheduled} db`} 
          StatCard title=Gépre rakva value={`${summary.converted} db`} 
          StatCard title=Lemondva value={`${summary.cancelled} db`} 
        section

        {showAddForm  (
          section className=rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200
            div className=mb-5
              h2 className=text-lg font-bold text-slate-900Új várakozó igényh2
              p className=mt-1 text-sm text-slate-500Az ügyfél külön customer rekord, itt csak az igény paramétereit rögzíted.p
            div

            div className=grid grid-cols-1 gap-4 mdgrid-cols-2 xlgrid-cols-3
              Field label=Ügyfél
                select
                  value={form.customer_id}
                  onChange={(e) = setForm((prev) = ({ ...prev, customer_id e.target.value }))}
                  className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
                
                  {customers.map((customer) = (
                    option key={customer.id} value={customer.id}
                      {customer.full_name} · {customer.location}
                    option
                  ))}
                select
              Field

              Field label=Mikortól bérelné
                input
                  type=date
                  value={form.requested_start_date}
                  onChange={(e) = setForm((prev) = ({ ...prev, requested_start_date e.target.value }))}
                  className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
                
              Field

              Field label=Időtartam
                select
                  value={form.duration_days}
                  onChange={(e) = setForm((prev) = ({ ...prev, duration_days Number(e.target.value) as DurationDays }))}
                  className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
                
                  {durationOptions.map((days) = (
                    option key={days} value={days}
                      {days} nap
                    option
                  ))}
                select
              Field

              Field label=Státusz
                select
                  value={form.status}
                  onChange={(e) = setForm((prev) = ({ ...prev, status e.target.value as RequestStatus }))}
                  className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
                
                  {Object.entries(statusConfig).map(([value, config]) = (
                    option key={value} value={value}
                      {config.label}
                    option
                  ))}
                select
              Field

              Field label=Megjegyzés
                input
                  value={form.notes}
                  onChange={(e) = setForm((prev) = ({ ...prev, notes e.target.value }))}
                  className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
                  placeholder=pl. műtét dátuma változhat
                
              Field
            div

            {formError  p className=mt-4 text-sm font-medium text-red-600{formError}p  null}

            div className=mt-5 flex flex-wrap gap-3
              button
                onClick={handleCreateRequest}
                className=rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hoverbg-slate-800
              
                Mentés
              button
              button
                onClick={() = setShowAddForm(false)}
                className=rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hoverborder-slate-300 hoverbg-slate-100
              
                Mégse
              button
            div
          section
        )  null}

        section className=rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200
          div className=flex flex-col gap-4 lgflex-row lgitems-end lgjustify-between
            div
              h2 className=text-lg font-bold text-slate-900Igénylistah2
              p className=mt-1 text-sm text-slate-500A kiszállítás dátuma és az időtartam menet közben is módosítható.p
            div

            div className=grid w-full grid-cols-1 gap-3 mdgrid-cols-2 lgmax-w-2xl
              input
                value={search}
                onChange={(e) = setSearch(e.target.value)}
                placeholder=Keresés név, email, lokáció vagy megjegyzés alapján
                className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
              

              select
                value={statusFilter}
                onChange={(e) = setStatusFilter(e.target.value as all  RequestStatus)}
                className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
              
                option value=allÖsszes státuszoption
                {Object.entries(statusConfig).map(([value, config]) = (
                  option key={value} value={value}
                    {config.label}
                  option
                ))}
              select
            div
          div

          div className=mt-6 grid grid-cols-1 gap-4 xlgrid-cols-2
            {filteredRequests.map((request) = {
              const customer = request.customer;
              const urgent = request.startInDays = 2 && request.status !== converted && request.status !== cancelled;

              return (
                article key={request.id} className=rounded-3xl border border-slate-200 p-5
                  div className=flex flex-col gap-4 smflex-row smitems-start smjustify-between
                    div
                      div className=flex flex-wrap items-center gap-2
                        h3 className=text-lg font-bold text-slate-900{customer.full_name  Ismeretlen ügyfél}h3
                        span className=text-sm text-slate-500{customer.location  -}span
                      div
                      p className=mt-2 text-sm text-slate-600{customer.email  -}p
                    div

                    span className={cn(inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1, statusConfig[request.status].className)}
                      {statusConfig[request.status].label}
                    span
                  div

                  div className=mt-4 grid grid-cols-1 gap-3 mdgrid-cols-2
                    InfoRow label=Kezdés value={formatDate(request.requested_start_date)} 
                    InfoRow label=Időtartam value={`${request.duration_days} nap`} 
                    InfoRow label=Lokáció value={customer.location  -} 
                    InfoRow label=Megjegyzés value={request.notes  —} 
                  div

                  {urgent  (
                    div className=mt-4
                      span className=inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200
                        Sürgős {request.startInDays = 0  ma indulna  `${request.startInDays} napon belül indulna`}
                      span
                    div
                  )  null}

                  div className=mt-5 grid grid-cols-1 gap-3 lggrid-cols-3
                    div
                      label className=mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500
                        Státusz
                      label
                      select
                        value={request.status}
                        onChange={(e) = updateRequestStatus(request.id, e.target.value as RequestStatus)}
                        className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
                      
                        {Object.entries(statusConfig).map(([value, config]) = (
                          option key={value} value={value}
                            {config.label}
                          option
                        ))}
                      select
                    div

                    div
                      label className=mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500
                        Kiszállítás napja
                      label
                      input
                        type=date
                        value={request.requested_start_date}
                        onChange={(e) = updateRequestDate(request.id, e.target.value)}
                        className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
                      
                    div

                    div
                      label className=mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500
                        Időtartam
                      label
                      select
                        value={request.duration_days}
                        onChange={(e) = updateRequestDuration(request.id, Number(e.target.value) as DurationDays)}
                        className=w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focusborder-slate-400
                      
                        {durationOptions.map((days) = (
                          option key={days} value={days}
                            {days} nap
                          option
                        ))}
                      select
                    div
                  div

                  div className=mt-5 flex flex-wrap gap-2
                    button
                      onClick={() = updateRequestStatus(request.id, scheduled)}
                      className=rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hoverborder-slate-300 hoverbg-slate-100
                    
                      Betervezés
                    button
                    button
                      onClick={() = updateRequestStatus(request.id, converted)}
                      className=rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hoverbg-slate-800
                    
                      Gépre rakva
                    button
                  div
                article
              );
            })}
          div

          {filteredRequests.length === 0  (
            div className=mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500
              Nincs találat a megadott szűrésre.
            div
          )  null}
        section
      div
    main
  );
}

function StatCard({ title, value } { title string; value string }) {
  return (
    div className=rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200
      div className=text-sm font-medium text-slate-500{title}div
      div className=mt-3 text-3xl font-bold tracking-tight text-slate-900{value}div
    div
  );
}

function Field({ label, children } { label string; children React.ReactNode }) {
  return (
    label className=block
      span className=mb-2 block text-sm font-semibold text-slate-700{label}span
      {children}
    label
  );
}

function InfoRow({ label, value } { label string; value string }) {
  return (
    div className=rounded-2xl bg-slate-50 px-4 py-3
      div className=text-xs font-semibold uppercase tracking-wide text-slate-500{label}div
      div className=mt-1 text-sm text-slate-800{value}div
    div
  );
}
