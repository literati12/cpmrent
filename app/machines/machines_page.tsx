"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

type Machine = { id: string; name: string | null; type: string | null; status: string | null; location: string | null; current_customer: string | null; rental_start: string | null; rental_end: string | null; notes: string | null }
type Rental = { id: string; machine_id: string | null; customer_id: string | null; start_date: string | null; end_date: string | null; status: string | null; berleti_dij: number | null; fizetett_osszeg: number | null; tartozas: number | null; note: string | null; visszaszallitas_modja: string | null }
type RequestItem = { id: string; name: string | null; status: string | null; assigned_machine_id: string | null }
type FilterType = "összes" | "foglalt" | "szabad" | "lejáró" | "lejárt" | "tartalék" | "javítás"

function getSupabaseErrorMessage(error: any, fallback: string) {
  if (!error) return fallback
  const parts = [error.message, error.details, error.hint, error.code ? `Kód: ${error.code}` : null].filter(Boolean)
  return parts.length ? parts.join(" | ") : fallback
}

function StatCard({ title, value, color = "#111" }: { title: string; value: React.ReactNode; color?: string }) {
  return <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}><div style={{ fontSize: "13px", color: "#666" }}>{title}</div><div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div></div>
}

export default function MachinesPage() {
  const router = useRouter()
  const [machines, setMachines] = useState<Machine[]>([])
  const [rentals, setRentals] = useState<Rental[]>([])
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("összes")
  const [machineStatusSelections, setMachineStatusSelections] = useState<Record<string, string>>({})
  const [rentalEndSelections, setRentalEndSelections] = useState<Record<string, string>>({})
  const [rentalDebtSelections, setRentalDebtSelections] = useState<Record<string, string>>({})
  const [rentalReturnModeSelections, setRentalReturnModeSelections] = useState<Record<string, string>>({})
  const [updatingMachineId, setUpdatingMachineId] = useState<string | null>(null)
  const [updatingRentalId, setUpdatingRentalId] = useState<string | null>(null)
  const [savingRentalDetailsId, setSavingRentalDetailsId] = useState<string | null>(null)

  useEffect(() => { checkUser() }, [])
  async function checkUser() { const { data, error } = await supabase.auth.getUser(); if (error || !data.user) { router.push("/login"); return } await loadAllData() }
  async function logout() { await supabase.auth.signOut(); router.push("/login") }
  async function loadAllData() { setLoading(true); await Promise.all([fetchMachines(), fetchRentals(), fetchRequests()]); setLoading(false) }
  async function fetchMachines() { const { data } = await supabase.from("machines").select("*").order("name", { ascending: true }); setMachines(data || []) }
  async function fetchRentals() { const { data } = await supabase.from("rentals").select("*").order("start_date", { ascending: false }); setRentals(data || []) }
  async function fetchRequests() { const { data } = await supabase.from("requests").select("id,name,status,assigned_machine_id"); setRequests(data || []) }

  const parseLocalDate = (dateString: string) => { const [year, month, day] = dateString.split("-").map(Number); return new Date(year, month - 1, day) }
  const getDaysUntil = (dateString: string | null) => { if (!dateString) return null; const end = parseLocalDate(dateString); const start = new Date(); end.setHours(0,0,0,0); start.setHours(0,0,0,0); return Math.ceil((end.getTime()-start.getTime())/(1000*60*60*24)) }
  const isStatus = (m: Machine, val: string) => (m.status || "").toLowerCase() === val.toLowerCase()

  const activeRentals = useMemo(() => rentals.filter((r) => (r.status || "").toLowerCase() === "aktív"), [rentals])
  const activeRentalByMachineId = useMemo(() => { const map: Record<string, Rental> = {}; for (const rental of activeRentals) if (rental.machine_id && !map[rental.machine_id]) map[rental.machine_id] = rental; return map }, [activeRentals])
  const nextReservedRequestByMachineId = useMemo(() => { const map: Record<string, RequestItem> = {}; for (const request of requests) if (request.assigned_machine_id && ["lefoglalva", "párosítva"].includes((request.status || "").toLowerCase()) && !map[request.assigned_machine_id]) map[request.assigned_machine_id] = request; return map }, [requests])

  const stats = useMemo(() => {
    const total = machines.length
    const rented = machines.filter((m) => isStatus(m, "Kiadva")).length
    const reserved = machines.filter((m) => isStatus(m, "Lefoglalt")).length
    const repair = machines.filter((m) => isStatus(m, "Javítás alatt")).length
    const activeFleet = total - repair
    const occupied = rented + reserved
    const utilization = activeFleet > 0 ? Math.round((occupied / activeFleet) * 100) : 0
    return { total, rented, reserved, free: machines.filter((m) => isStatus(m, "Szabad")).length, expiringSoon: machines.filter((m) => { const d = getDaysUntil(m.rental_end); return d !== null && d >= 0 && d <= 5 && isStatus(m, "Kiadva") }).length, expired: machines.filter((m) => { const d = getDaysUntil(m.rental_end); return d !== null && d < 0 && isStatus(m, "Kiadva") }).length, utilization }
  }, [machines])

  const filteredMachines = useMemo(() => {
    if (filter === "összes") return machines
    if (filter === "foglalt") return machines.filter((m) => isStatus(m, "Kiadva") || isStatus(m, "Lefoglalt"))
    if (filter === "szabad") return machines.filter((m) => isStatus(m, "Szabad"))
    if (filter === "tartalék") return machines.filter((m) => isStatus(m, "Tartalék"))
    if (filter === "javítás") return machines.filter((m) => isStatus(m, "Javítás alatt"))
    if (filter === "lejáró") return machines.filter((m) => { const d = getDaysUntil(m.rental_end); return d !== null && d >= 0 && d <= 5 && isStatus(m, "Kiadva") })
    if (filter === "lejárt") return machines.filter((m) => { const d = getDaysUntil(m.rental_end); return d !== null && d < 0 && isStatus(m, "Kiadva") })
    return machines
  }, [machines, filter])

  async function handleUpdateMachineStatus(machineId: string) {
    const selectedStatus = machineStatusSelections[machineId]
    if (!selectedStatus) return alert("Válassz új státuszt.")
    setUpdatingMachineId(machineId)
    try {
      const updatePayload: { status: string; current_customer?: string | null; rental_start?: string | null; rental_end?: string | null } = { status: selectedStatus }
      if (selectedStatus !== "Kiadva" && selectedStatus !== "Lefoglalt") { updatePayload.current_customer = null; updatePayload.rental_start = null; updatePayload.rental_end = null }
      const { error } = await supabase.from("machines").update(updatePayload).eq("id", machineId)
      if (error) throw error
      await fetchMachines(); alert("Gép státusza frissítve.")
    } catch (error: any) { alert(getSupabaseErrorMessage(error, "Nem sikerült frissíteni a gép státuszát.")) } finally { setUpdatingMachineId(null) }
  }

  async function handleUpdateRentalEnd(machine: Machine) {
    const newEndDate = rentalEndSelections[machine.id] || machine.rental_end
    if (!newEndDate) return alert("Adj meg új lejárati dátumot.")
    if (!machine.current_customer) return alert("Ehhez a géphez nincs aktív bérlő.")
    if (machine.rental_start && newEndDate < machine.rental_start) return alert("Az új lejárat nem lehet korábbi, mint a kezdő dátum.")
    setUpdatingRentalId(machine.id)
    try {
      const activeRentalQuery = await supabase.from("rentals").select("id").eq("machine_id", machine.id).eq("status", "Aktív").order("start_date", { ascending: false }).limit(1)
      if (activeRentalQuery.error) throw activeRentalQuery.error
      const activeRental = activeRentalQuery.data?.[0]
      if (!activeRental?.id) throw new Error("Nem található aktív bérlés ehhez a géphez.")
      const rentalUpdate = await supabase.from("rentals").update({ end_date: newEndDate }).eq("id", activeRental.id)
      if (rentalUpdate.error) throw rentalUpdate.error
      const machineUpdate = await supabase.from("machines").update({ rental_end: newEndDate }).eq("id", machine.id)
      if (machineUpdate.error) throw machineUpdate.error
      await Promise.all([fetchMachines(), fetchRentals()]); alert("A bérlés lejárata sikeresen módosítva.")
    } catch (error: any) { alert(getSupabaseErrorMessage(error, "Nem sikerült módosítani a bérlés lejáratát.")) } finally { setUpdatingRentalId(null) }
  }

  async function handleSaveRentalDetails(machine: Machine) {
    const activeRental = activeRentalByMachineId[machine.id]
    if (!activeRental?.id) return alert("Ehhez a géphez nincs aktív bérlés.")
    const rawDebtValue = rentalDebtSelections[machine.id] !== undefined ? rentalDebtSelections[machine.id] : String(activeRental.tartozas ?? 0)
    const parsedDebt = Number(rawDebtValue)
    if (Number.isNaN(parsedDebt) || parsedDebt < 0) return alert("A tartozás csak 0 vagy pozitív szám lehet.")
    const selectedReturnMode = rentalReturnModeSelections[machine.id] ?? activeRental.visszaszallitas_modja ?? "Én megyek érte"
    const updatePayload: { tartozas: number; visszaszallitas_modja: string; fizetett_osszeg?: number } = { tartozas: parsedDebt, visszaszallitas_modja: selectedReturnMode }
    if (typeof activeRental.berleti_dij === "number") updatePayload.fizetett_osszeg = Math.max(activeRental.berleti_dij - parsedDebt, 0)
    setSavingRentalDetailsId(machine.id)
    try {
      const { error } = await supabase.from("rentals").update(updatePayload).eq("id", activeRental.id)
      if (error) throw error
      await fetchRentals(); alert("A bérlés tartozása és visszaszállítása sikeresen frissítve.")
    } catch (error: any) { alert(getSupabaseErrorMessage(error, "Nem sikerült frissíteni a bérlés tartozását és visszaszállítását.")) } finally { setSavingRentalDetailsId(null) }
  }

  async function handleReturnMachine(machine: Machine) {
    const confirmed = window.confirm(`Biztosan leveszed a bérlőt erről a gépről: ${machine.name || "ismeretlen gép"}?`)
    if (!confirmed) return
    setUpdatingMachineId(machine.id)
    try {
      const activeRentalQuery = await supabase.from("rentals").select("id").eq("machine_id", machine.id).eq("status", "Aktív").order("start_date", { ascending: false }).limit(1)
      if (activeRentalQuery.error) throw activeRentalQuery.error
      const activeRental = activeRentalQuery.data?.[0]
      if (activeRental?.id) { const rentalUpdate = await supabase.from("rentals").update({ status: "Lezárt" }).eq("id", activeRental.id); if (rentalUpdate.error) throw rentalUpdate.error }
      const machineUpdate = await supabase.from("machines").update({ status: "Szabad", current_customer: null, rental_start: null, rental_end: null }).eq("id", machine.id)
      if (machineUpdate.error) throw machineUpdate.error
      await Promise.all([fetchMachines(), fetchRentals()]); alert("A gépről sikeresen lekerült a bérlő.")
    } catch (error: any) { alert(getSupabaseErrorMessage(error, "Nem sikerült a gép visszavétele.")) } finally { setUpdatingMachineId(null) }
  }

  const getRowStyle = (m: Machine) => { const d = getDaysUntil(m.rental_end); if (isStatus(m, "Kiadva") && d !== null && d < 0) return { backgroundColor: "#ffd6d6" }; if (isStatus(m, "Kiadva") && d !== null && d <= 5) return { backgroundColor: "#fff3cd" }; if (isStatus(m, "Szabad")) return { backgroundColor: "#d9f8e5" }; return { backgroundColor: "#ffffff" } }

  const renderMachineCard = (m: Machine) => {
    const rental = activeRentalByMachineId[m.id]
    const nextRequest = nextReservedRequestByMachineId[m.id]
    return <div key={m.id} style={mobileCardStyle}><div style={mobileCardHeaderStyle}><div><strong style={{ fontSize: "18px" }}>{m.name || "-"}</strong><div style={{ color: "#666", fontSize: "13px" }}>{m.type || "-"}</div></div><span style={mobileBadgeStyle}>{m.status || "-"}</span></div><div style={mobileInfoStyle}><strong>Bérlő:</strong> {m.current_customer || "-"}</div><div style={mobileInfoStyle}><strong>Lokáció:</strong> {m.location || "-"}</div><div style={mobileInfoStyle}><strong>Lejárat:</strong> {m.rental_end || "-"}</div><div style={mobileInfoStyle}><strong>Visszaszállítás:</strong> {rental?.visszaszallitas_modja || "-"}</div><div style={mobileInfoStyle}><strong>Tartozás:</strong> {rental?.tartozas ? `${rental.tartozas.toLocaleString("hu-HU")} Ft` : "0 Ft"}</div><div style={mobileInfoStyle}><strong>Következő ügyfél:</strong> {nextRequest?.name || "-"}</div>
      {m.current_customer ? <input type="date" value={rentalEndSelections[m.id] ?? m.rental_end ?? ""} onChange={(e) => setRentalEndSelections((prev) => ({ ...prev, [m.id]: e.target.value }))} style={{ ...inputStyle, marginTop: 10 }} /> : null}
      {rental ? <><select value={rentalReturnModeSelections[m.id] ?? rental.visszaszallitas_modja ?? "Én megyek érte"} onChange={(e) => setRentalReturnModeSelections((prev) => ({ ...prev, [m.id]: e.target.value }))} style={{ ...inputStyle, marginTop: 10 }}><option value="Én megyek érte">Én megyek érte</option><option value="Visszahozza">Visszahozza</option><option value="Futár">Futár</option></select><input type="number" min="0" step="1000" value={rentalDebtSelections[m.id] ?? String(rental.tartozas ?? 0)} onChange={(e) => setRentalDebtSelections((prev) => ({ ...prev, [m.id]: e.target.value }))} style={{ ...inputStyle, marginTop: 10 }} /></> : null}
      <select value={machineStatusSelections[m.id] || ""} onChange={(e) => setMachineStatusSelections((prev) => ({ ...prev, [m.id]: e.target.value }))} style={{ ...inputStyle, marginTop: 10 }}><option value="">Válassz státuszt...</option><option value="Szabad">Szabad</option><option value="Kiadva">Kiadva</option><option value="Lefoglalt">Lefoglalt</option><option value="Javítás alatt">Javítás alatt</option><option value="Tartalék">Tartalék</option></select>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: 12 }}><button type="button" onClick={() => handleUpdateMachineStatus(m.id)} disabled={updatingMachineId === m.id} style={miniButtonStyle}>{updatingMachineId === m.id ? "Mentés..." : "Státusz mentése"}</button>{m.current_customer && <button type="button" onClick={() => handleUpdateRentalEnd(m)} disabled={updatingRentalId === m.id} style={miniWarningButtonStyle}>{updatingRentalId === m.id ? "Mentés..." : "Lejárat módosítása"}</button>}{rental && <button type="button" onClick={() => handleSaveRentalDetails(m)} disabled={savingRentalDetailsId === m.id} style={miniSuccessButtonStyle}>{savingRentalDetailsId === m.id ? "Mentés..." : "Bérlés adatok mentése"}</button>}{m.current_customer && <button type="button" onClick={() => handleReturnMachine(m)} disabled={updatingMachineId === m.id} style={miniDangerButtonStyle}>Bérlő levétele</button>}</div></div>
  }

  if (loading) return <main style={pageStyle}><h2 style={{ marginTop: 0 }}>Betöltés...</h2><p style={{ color: "#555" }}>Flotta adatok szinkronizálása folyamatban.</p></main>

  return <main style={pageStyle}><header style={headerStyle}><div><h1 style={{ fontSize: "32px", margin: 0 }}>CPM Rent - Flotta</h1><p style={{ color: "#555" }}>Gépek, státuszok, lejáratok, tartozások</p></div><div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}><Link href="/" style={navLinkStyle}>Dashboard</Link><Link href="/customers" style={navLinkStyle}>Bérlők</Link><Link href="/requests" style={navLinkStyle}>Várólista</Link><button onClick={logout} style={primaryButtonStyle}>Kijelentkezés</button></div></header>
    <div style={statsGridStyle}><StatCard title="Összes gép" value={stats.total} /><StatCard title="Szabad" value={stats.free} color="#16a34a" /><StatCard title="Kiadva" value={stats.rented} color="#2563eb" /><StatCard title="Lefoglalt" value={stats.reserved} color="#7c3aed" /><StatCard title="Lejáró / Lejárt" value={`${stats.expiringSoon} / ${stats.expired}`} color="#dc2626" /><StatCard title="Kihasználtság" value={`${stats.utilization}%`} /></div>
    <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>{(["összes", "foglalt", "szabad", "lejáró", "lejárt", "tartalék", "javítás"] as FilterType[]).map((f) => <button key={f} onClick={() => setFilter(f)} style={{ ...filterButtonStyle, background: filter === f ? "#111" : "#fff", color: filter === f ? "#fff" : "#111" }}>{f}</button>)}</div>
    <section style={desktopOnlyStyle}><div style={tableWrapStyle}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#111", color: "#fff" }}><th style={cellStyle}>Név</th><th style={cellStyle}>Státusz</th><th style={cellStyle}>Bérlő / Lokáció</th><th style={cellStyle}>Lejárat</th><th style={cellStyle}>Visszaszállítás</th><th style={cellStyle}>Tartozás</th><th style={cellStyle}>Következő ügyfél</th><th style={cellStyle}>Új visszaszállítás</th><th style={cellStyle}>Új tartozás</th><th style={cellStyle}>Új lejárat</th><th style={cellStyle}>Új státusz</th><th style={cellStyle}>Művelet</th></tr></thead><tbody>{filteredMachines.map((m) => <tr key={m.id} style={getRowStyle(m)}><td style={cellStyle}><strong>{m.name}</strong><br /><small>{m.type}</small></td><td style={cellStyle}>{m.status}</td><td style={cellStyle}>{m.current_customer || "-"}<br /><small>{m.location || "-"}</small></td><td style={cellStyle}>{m.rental_end || "-"}{m.rental_end && <><br /><small style={{ color: "#666" }}>{(() => { const days = getDaysUntil(m.rental_end); if (days === null) return ""; if (days < 0) return `${Math.abs(days)} napja lejárt`; if (days === 0) return "Ma jár le"; return `${days} nap múlva` })()}</small></>}</td><td style={cellStyle}>{activeRentalByMachineId[m.id]?.visszaszallitas_modja || "-"}</td><td style={{ ...cellStyle, color: (activeRentalByMachineId[m.id]?.tartozas || 0) > 0 ? "#dc2626" : "#111", fontWeight: "bold" }}>{activeRentalByMachineId[m.id]?.tartozas ? `${activeRentalByMachineId[m.id]!.tartozas!.toLocaleString("hu-HU")} Ft` : "0 Ft"}</td><td style={cellStyle}>{nextReservedRequestByMachineId[m.id]?.name || "-"}</td><td style={cellStyle}>{activeRentalByMachineId[m.id] ? <select value={rentalReturnModeSelections[m.id] ?? activeRentalByMachineId[m.id]?.visszaszallitas_modja ?? "Én megyek érte"} onChange={(e) => setRentalReturnModeSelections((prev) => ({ ...prev, [m.id]: e.target.value }))} style={inputStyle}><option value="Én megyek érte">Én megyek érte</option><option value="Visszahozza">Visszahozza</option><option value="Futár">Futár</option></select> : "-"}</td><td style={cellStyle}>{activeRentalByMachineId[m.id] ? <input type="number" min="0" step="1000" value={rentalDebtSelections[m.id] ?? String(activeRentalByMachineId[m.id]?.tartozas ?? 0)} onChange={(e) => setRentalDebtSelections((prev) => ({ ...prev, [m.id]: e.target.value }))} style={inputStyle} /> : "-"}</td><td style={cellStyle}>{m.current_customer ? <input type="date" value={rentalEndSelections[m.id] ?? m.rental_end ?? ""} onChange={(e) => setRentalEndSelections((prev) => ({ ...prev, [m.id]: e.target.value }))} style={inputStyle} /> : "-"}</td><td style={cellStyle}><select value={machineStatusSelections[m.id] || ""} onChange={(e) => setMachineStatusSelections((prev) => ({ ...prev, [m.id]: e.target.value }))} style={inputStyle}><option value="">Válassz...</option><option value="Szabad">Szabad</option><option value="Kiadva">Kiadva</option><option value="Lefoglalt">Lefoglalt</option><option value="Javítás alatt">Javítás alatt</option><option value="Tartalék">Tartalék</option></select></td><td style={cellStyle}><div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}><button type="button" onClick={() => handleUpdateMachineStatus(m.id)} disabled={updatingMachineId === m.id} style={miniButtonStyle}>{updatingMachineId === m.id ? "Mentés..." : "Státusz mentése"}</button>{m.current_customer && <button type="button" onClick={() => handleUpdateRentalEnd(m)} disabled={updatingRentalId === m.id} style={miniWarningButtonStyle}>{updatingRentalId === m.id ? "Mentés..." : "Lejárat módosítása"}</button>}{activeRentalByMachineId[m.id] && <button type="button" onClick={() => handleSaveRentalDetails(m)} disabled={savingRentalDetailsId === m.id} style={miniSuccessButtonStyle}>{savingRentalDetailsId === m.id ? "Mentés..." : "Bérlés adatok mentése"}</button>}{m.current_customer && <button type="button" onClick={() => handleReturnMachine(m)} disabled={updatingMachineId === m.id} style={miniDangerButtonStyle}>Bérlő levétele</button>}</div></td></tr>)}</tbody></table></div></section>
    <section style={mobileOnlyStyle}>{filteredMachines.map(renderMachineCard)}</section>
  </main>
}

const pageStyle = { padding: "32px", fontFamily: "sans-serif", background: "#f7f8fa", minHeight: "100vh" }
const headerStyle = { marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" as const }
const navLinkStyle = { padding: "10px 18px", background: "#fff", color: "#111", borderRadius: "8px", textDecoration: "none", fontWeight: "bold", border: "1px solid #ddd" }
const tableWrapStyle = { overflowX: "auto" as const, background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }
const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", width: "100%" }
const primaryButtonStyle = { padding: "10px 20px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }
const miniButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#eef2ff", cursor: "pointer", fontWeight: "bold" }
const miniSuccessButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#d9f8e5", cursor: "pointer", fontWeight: "bold" }
const miniWarningButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff3cd", cursor: "pointer", fontWeight: "bold" }
const miniDangerButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#ffd6d6", cursor: "pointer", fontWeight: "bold" }
const cellStyle = { padding: "12px", borderBottom: "1px solid #eee", textAlign: "left" as const }
const statsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px" }
const filterButtonStyle = { padding: "8px 16px", borderRadius: "20px", border: "1px solid #ddd", cursor: "pointer", fontWeight: "600", fontSize: "13px" }
const mobileOnlyStyle = { display: "none" } as const
const desktopOnlyStyle = { display: "block" } as const
const mobileCardStyle = { background: "#fff", borderRadius: "16px", padding: "16px", marginBottom: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }
const mobileCardHeaderStyle = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }
const mobileBadgeStyle = { background: "#111", color: "#fff", borderRadius: "999px", padding: "6px 10px", fontSize: "12px", fontWeight: "bold" }
const mobileInfoStyle = { marginBottom: "8px", fontSize: "14px" }
