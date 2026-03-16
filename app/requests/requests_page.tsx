"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

type Machine = { id: string; name: string | null; status: string | null; current_customer: string | null; rental_end: string | null }
type RequestItem = { id: string; name: string | null; phone: string | null; email: string | null; city: string | null; address: string | null; requested_start_date: string | null; requested_duration_days: number | null; status: string | null; assigned_machine_id: string | null; priority: number | null; notes: string | null; created_at?: string | null }
type NewRequestForm = { name: string; phone: string; email: string; city: string; address: string; requested_start_date: string; requested_duration_days: string; status: string; priority: string; notes: string }
const initialRequestForm: NewRequestForm = { name: "", phone: "", email: "", city: "", address: "", requested_start_date: "", requested_duration_days: "14", status: "várakozik", priority: "1", notes: "" }

function getSupabaseErrorMessage(error: any, fallback: string) { if (!error) return fallback; const parts = [error.message, error.details, error.hint, error.code ? `Kód: ${error.code}` : null].filter(Boolean); return parts.length ? parts.join(" | ") : fallback }
function StatCard({ title, value, color = "#111" }: { title: string; value: React.ReactNode; color?: string }) { return <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}><div style={{ fontSize: "13px", color: "#666" }}>{title}</div><div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div></div> }

export default function RequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [savingRequest, setSavingRequest] = useState(false)
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null)
  const [reservingRequestId, setReservingRequestId] = useState<string | null>(null)
  const [showAddRequestForm, setShowAddRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState<NewRequestForm>(initialRequestForm)
  const [requestMessage, setRequestMessage] = useState("")
  const [requestMachineSelections, setRequestMachineSelections] = useState<Record<string, string>>({})

  useEffect(() => { checkUser() }, [])
  async function checkUser() { const { data, error } = await supabase.auth.getUser(); if (error || !data.user) { router.push("/login"); return } await loadAllData() }
  async function logout() { await supabase.auth.signOut(); router.push("/login") }
  async function loadAllData() { setLoading(true); await Promise.all([fetchRequests(), fetchMachines()]); setLoading(false) }
  async function fetchRequests() { const { data } = await supabase.from("requests").select("*").order("priority", { ascending: true }).order("created_at", { ascending: false }); setRequests(data || []) }
  async function fetchMachines() { const { data } = await supabase.from("machines").select("id,name,status,current_customer,rental_end").order("name", { ascending: true }); setMachines(data || []) }

  const parseLocalDate = (dateString: string) => { const [year, month, day] = dateString.split("-").map(Number); return new Date(year, month - 1, day) }
  const formatDateToYMD = (date: Date) => { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0"); return `${y}-${m}-${d}` }
  const getDaysUntil = (dateString: string | null) => { if (!dateString) return null; const end = parseLocalDate(dateString); const start = new Date(); end.setHours(0,0,0,0); start.setHours(0,0,0,0); return Math.ceil((end.getTime()-start.getTime())/(1000*60*60*24)) }
  const isStatus = (m: Machine, val: string) => (m.status || "").toLowerCase() === val.toLowerCase()
  const isMachineImmediatelyAssignable = (machine: Machine) => ["szabad", "tartalék", "lefoglalt"].includes((machine.status || "").toLowerCase()) && !machine.current_customer
  const isMachineReservableForNext = (machine: Machine) => { if (isMachineImmediatelyAssignable(machine)) return true; const daysUntil = getDaysUntil(machine.rental_end); return isStatus(machine, "Kiadva") && daysUntil !== null && daysUntil >= 0 && daysUntil <= 4 }
  const reservableMachines = useMemo(() => machines.filter((m) => isMachineReservableForNext(m)), [machines])
  const soonExpiringIssuedMachines = useMemo(() => machines.filter((machine) => { const days = getDaysUntil(machine.rental_end); return isStatus(machine, "Kiadva") && days !== null && days >= 0 && days <= 4 }), [machines])
  const stats = useMemo(() => ({ total: requests.length, waiting: requests.filter((r) => (r.status || "").toLowerCase() === "várakozik").length, reserved: requests.filter((r) => ["lefoglalva", "párosítva"].includes((r.status || "").toLowerCase())).length, active: requests.filter((r) => (r.status || "").toLowerCase() === "aktív").length, soonFree: soonExpiringIssuedMachines.length }), [requests, soonExpiringIssuedMachines.length])

  async function handleAddRequest(e: React.FormEvent) {
    e.preventDefault(); setRequestMessage("")
    if (!requestForm.name.trim()) { setRequestMessage("A várakozó neve kötelező."); return }
    setSavingRequest(true)
    const payload = { name: requestForm.name.trim(), phone: requestForm.phone.trim() || null, email: requestForm.email.trim() || null, city: requestForm.city.trim() || null, address: requestForm.address.trim() || null, requested_start_date: requestForm.requested_start_date || null, requested_duration_days: Number(requestForm.requested_duration_days || 0) || null, status: requestForm.status || "várakozik", priority: Number(requestForm.priority || 1) || 1, notes: requestForm.notes.trim() || null }
    try { const { error } = await supabase.from("requests").insert([payload]); if (error) throw error; setRequestMessage("Várakozó sikeresen rögzítve."); setRequestForm(initialRequestForm); setShowAddRequestForm(false); await fetchRequests() } catch (error: any) { setRequestMessage(getSupabaseErrorMessage(error, "Váratlan hiba történt várakozó mentés közben.")) } finally { setSavingRequest(false) }
  }

  async function handleMarkRequestCancelled(requestId: string) { const confirmed = window.confirm("Biztosan visszamondta státuszra állítod?"); if (!confirmed) return; const { error } = await supabase.from("requests").update({ status: "visszamondta" }).eq("id", requestId); if (error) return alert(getSupabaseErrorMessage(error, "Nem sikerült frissíteni a státuszt.")); await fetchRequests() }
  async function handleDeleteRequest(requestId: string) { const confirmed = window.confirm("Biztosan törlöd ezt a várakozót?"); if (!confirmed) return; const { error } = await supabase.from("requests").delete().eq("id", requestId); if (error) return alert(getSupabaseErrorMessage(error, "Nem sikerült törölni a várakozót.")); await fetchRequests() }

  async function handleAssignRequestToMachine(request: RequestItem) {
    const selectedMachineId = requestMachineSelections[request.id]
    if (!selectedMachineId) return alert("Először válassz gépet a várakozóhoz.")
    const selectedMachine = machines.find((m) => m.id === selectedMachineId)
    if (!selectedMachine) return alert("A kiválasztott gép nem található.")
    if (!request.name?.trim()) return alert("A várakozó neve hiányzik.")
    if (!request.requested_start_date || !request.requested_duration_days) return alert("Hiányzik az igény kezdete vagy az időtartam.")
    setAssigningRequestId(request.id)
    try {
      const customerPayload = { name: request.name.trim(), phone: request.phone?.trim() || null, email: request.email?.trim() || null, city: request.city?.trim() || null, address: request.address?.trim() || null, notes: request.notes?.trim() || null }
      const customerInsert = await supabase.from("customers").insert([customerPayload]).select().single()
      if (customerInsert.error || !customerInsert.data) throw customerInsert.error || new Error("Nem sikerült létrehozni a bérlőt.")
      const newCustomer = customerInsert.data
      const start = parseLocalDate(request.requested_start_date)
      const end = new Date(start)
      end.setDate(end.getDate() + Number(request.requested_duration_days))
      const endDate = formatDateToYMD(end)
      const rentalPayload = { machine_id: selectedMachineId, customer_id: newCustomer.id, start_date: request.requested_start_date, end_date: endDate, berleti_dij: 0, fizetett_osszeg: 0, tartozas: 0, visszaszallitas_modja: "Én megyek érte", status: "Aktív", note: request.notes?.trim() || null }
      const rentalInsert = await supabase.from("rentals").insert([rentalPayload]).select(); if (rentalInsert.error) throw rentalInsert.error
      const machinePayload = { status: "Kiadva", current_customer: newCustomer.name, rental_start: request.requested_start_date, rental_end: endDate, location: newCustomer.city || selectedMachine.name }
      const machineUpdate = await supabase.from("machines").update(machinePayload).eq("id", selectedMachineId).select(); if (machineUpdate.error) throw machineUpdate.error
      const requestUpdate = await supabase.from("requests").update({ status: "aktív", assigned_machine_id: selectedMachineId }).eq("id", request.id); if (requestUpdate.error) throw requestUpdate.error
      await Promise.all([fetchRequests(), fetchMachines()]); alert("A várakozóból sikeresen aktív bérlő lett.")
    } catch (error: any) { alert(getSupabaseErrorMessage(error, "Nem sikerült a várakozót gépre adni.")) } finally { setAssigningRequestId(null) }
  }

  async function handleReserveRequestToMachine(request: RequestItem) {
    const selectedMachineId = requestMachineSelections[request.id]
    if (!selectedMachineId) return alert("Először válassz gépet a várakozóhoz.")
    const selectedMachine = machines.find((m) => m.id === selectedMachineId)
    if (!selectedMachine) return alert("A kiválasztott gép nem található.")
    if (!isMachineReservableForNext(selectedMachine)) return alert("Erre a gépre most nem lehet előfoglalást tenni.")
    setReservingRequestId(request.id)
    try {
      const requestUpdate = await supabase.from("requests").update({ status: "lefoglalva", assigned_machine_id: selectedMachineId }).eq("id", request.id)
      if (requestUpdate.error) throw requestUpdate.error
      if (isMachineImmediatelyAssignable(selectedMachine)) { const machineUpdate = await supabase.from("machines").update({ status: "Lefoglalt" }).eq("id", selectedMachineId); if (machineUpdate.error) throw machineUpdate.error }
      await Promise.all([fetchRequests(), fetchMachines()]); alert("A várakozó sikeresen lefoglalva a kiválasztott gépre.")
    } catch (error: any) { alert(getSupabaseErrorMessage(error, "Nem sikerült lefoglalni a várakozót.")) } finally { setReservingRequestId(null) }
  }

  const renderRequestCard = (r: RequestItem) => <div key={r.id} style={mobileCardStyle}><div style={mobileCardHeaderStyle}><div><strong style={{ fontSize: "18px" }}>{r.name || "-"}</strong><div style={{ color: "#666", fontSize: "13px" }}>{r.city || "-"}</div></div><span style={mobileBadgeStyle}>{r.status || "-"}</span></div><div style={mobileInfoStyle}><strong>Telefon:</strong> {r.phone || "-"}</div><div style={mobileInfoStyle}><strong>Email:</strong> {r.email || "-"}</div><div style={mobileInfoStyle}><strong>Kezdés:</strong> {r.requested_start_date || "-"}</div><div style={mobileInfoStyle}><strong>Nap:</strong> {r.requested_duration_days ?? "-"}</div><div style={mobileInfoStyle}><strong>Prioritás:</strong> {r.priority ?? "-"}</div><div style={mobileInfoStyle}><strong>Megjegyzés:</strong> {r.notes || "-"}</div>{r.status !== "aktív" ? <select value={requestMachineSelections[r.id] || ""} onChange={(e) => setRequestMachineSelections((prev) => ({ ...prev, [r.id]: e.target.value }))} style={{ ...inputStyle, marginTop: 10 }}><option value="">Válassz gépet...</option>{reservableMachines.map((m) => { const days = getDaysUntil(m.rental_end); const isSoonIssued = (m.status || "").toLowerCase() === "kiadva" && days !== null && days >= 0 && days <= 4; return <option key={m.id} value={m.id}>{m.name} ({m.status}{isSoonIssued ? `, ${days === 0 ? "ma" : `${days} nap`} múlva szabadul` : ""})</option> })}</select> : null}<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: 12 }}>{r.status !== "aktív" && r.status !== "visszamondta" && <button type="button" onClick={() => handleAssignRequestToMachine(r)} disabled={assigningRequestId === r.id} style={miniSuccessButtonStyle}>{assigningRequestId === r.id ? "Folyamatban..." : "Gépre ad"}</button>}{r.status !== "aktív" && r.status !== "visszamondta" && <button type="button" onClick={() => handleReserveRequestToMachine(r)} disabled={reservingRequestId === r.id} style={miniButtonStyle}>{reservingRequestId === r.id ? "Folyamatban..." : "Következőnek lefoglal"}</button>}{r.status !== "visszamondta" && r.status !== "aktív" && <button type="button" onClick={() => handleMarkRequestCancelled(r.id)} style={miniWarningButtonStyle}>Visszamondta</button>}<button type="button" onClick={() => handleDeleteRequest(r.id)} style={miniDangerButtonStyle}>Törlés</button></div></div>

  if (loading) return <main style={pageStyle}><h2 style={{ marginTop: 0 }}>Betöltés...</h2><p style={{ color: "#555" }}>Várólista adatok szinkronizálása folyamatban.</p></main>

  return <main style={pageStyle}><header style={headerStyle}><div><h1 style={{ fontSize: "32px", margin: 0 }}>CPM Rent - Várólista</h1><p style={{ color: "#555" }}>Új igények, foglalás, párosítás, előfoglalás</p></div><div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}><Link href="/" style={navLinkStyle}>Dashboard</Link><Link href="/machines" style={navLinkStyle}>Flotta</Link><Link href="/customers" style={navLinkStyle}>Bérlők</Link><button onClick={logout} style={primaryButtonStyle}>Kijelentkezés</button></div></header>
  <div style={statsGridStyle}><StatCard title="Összes várakozó" value={stats.total} /><StatCard title="Várakozik" value={stats.waiting} color="#2563eb" /><StatCard title="Lefoglalt / Párosított" value={stats.reserved} color="#7c3aed" /><StatCard title="Aktív lett" value={stats.active} color="#16a34a" /><StatCard title="4 napon belül felszabadul" value={stats.soonFree} color="#d97706" /></div>
  <section style={cardStyle}><button onClick={() => setShowAddRequestForm(!showAddRequestForm)} style={toggleButtonStyle}>{showAddRequestForm ? "▼ Bezárás" : "▶ Új várakozó hozzáadása"}</button>{showAddRequestForm && <form onSubmit={handleAddRequest} style={{ marginTop: "18px" }}><div style={formGridStyle}><input placeholder="Név" value={requestForm.name} onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })} style={inputStyle} /><input placeholder="Telefon" value={requestForm.phone} onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })} style={inputStyle} /><input placeholder="Email" value={requestForm.email} onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })} style={inputStyle} /><input placeholder="Város" value={requestForm.city} onChange={(e) => setRequestForm({ ...requestForm, city: e.target.value })} style={inputStyle} /><input placeholder="Cím" value={requestForm.address} onChange={(e) => setRequestForm({ ...requestForm, address: e.target.value })} style={inputStyle} /><input type="date" value={requestForm.requested_start_date} onChange={(e) => setRequestForm({ ...requestForm, requested_start_date: e.target.value })} style={inputStyle} /><input type="number" placeholder="Napok száma" value={requestForm.requested_duration_days} onChange={(e) => setRequestForm({ ...requestForm, requested_duration_days: e.target.value })} style={inputStyle} /><select value={requestForm.status} onChange={(e) => setRequestForm({ ...requestForm, status: e.target.value })} style={inputStyle}><option value="várakozik">várakozik</option><option value="párosítva">párosítva</option><option value="lefoglalva">lefoglalva</option><option value="aktív">aktív</option><option value="visszamondta">visszamondta</option></select><input type="number" placeholder="Prioritás" value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })} style={inputStyle} /><input placeholder="Megjegyzés" value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} style={inputStyle} /></div><button type="submit" disabled={savingRequest} style={primaryButtonStyle}>{savingRequest ? "Mentés..." : "Várakozó mentése"}</button>{requestMessage && <span style={msgStyle}>{requestMessage}</span>}</form>}</section>
  <section style={cardStyle}><h2 style={{ marginTop: 0, marginBottom: "16px" }}>4 napon belül felszabaduló kiadott gépek</h2>{soonExpiringIssuedMachines.length === 0 ? <p style={{ color: "#666", margin: 0 }}>Nincs 4 napon belül lejáró kiadott gép.</p> : <div style={tableWrapStyle}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#111", color: "#fff" }}><th style={cellStyle}>Gép</th><th style={cellStyle}>Aktuális bérlő</th><th style={cellStyle}>Lejárat</th><th style={cellStyle}>Nap múlva</th></tr></thead><tbody>{soonExpiringIssuedMachines.map((machine) => { const days = getDaysUntil(machine.rental_end); return <tr key={machine.id}><td style={cellStyle}><strong>{machine.name || "-"}</strong></td><td style={cellStyle}>{machine.current_customer || "-"}</td><td style={cellStyle}>{machine.rental_end || "-"}</td><td style={cellStyle}>{days === null ? "-" : days === 0 ? "Ma" : `${days} nap`}</td></tr> })}</tbody></table></div>}</section>
  <section style={desktopOnlyStyle}><div style={tableWrapStyle}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#111", color: "#fff" }}><th style={cellStyle}>Név</th><th style={cellStyle}>Telefon</th><th style={cellStyle}>Email</th><th style={cellStyle}>Város</th><th style={cellStyle}>Kezdés</th><th style={cellStyle}>Nap</th><th style={cellStyle}>Státusz</th><th style={cellStyle}>Prioritás</th><th style={cellStyle}>Megjegyzés</th><th style={cellStyle}>Gép</th><th style={cellStyle}>Művelet</th></tr></thead><tbody>{requests.map((r) => <tr key={r.id}><td style={cellStyle}><strong>{r.name || "-"}</strong></td><td style={cellStyle}>{r.phone || "-"}</td><td style={cellStyle}>{r.email || "-"}</td><td style={cellStyle}>{r.city || "-"}</td><td style={cellStyle}>{r.requested_start_date || "-"}</td><td style={cellStyle}>{r.requested_duration_days ?? "-"}</td><td style={cellStyle}>{r.status || "-"}</td><td style={cellStyle}>{r.priority ?? "-"}</td><td style={cellStyle}>{r.notes || "-"}</td><td style={cellStyle}>{r.status === "aktív" ? "-" : <select value={requestMachineSelections[r.id] || ""} onChange={(e) => setRequestMachineSelections((prev) => ({ ...prev, [r.id]: e.target.value }))} style={inputStyle}><option value="">Válassz gépet...</option>{reservableMachines.map((m) => { const days = getDaysUntil(m.rental_end); const isSoonIssued = (m.status || "").toLowerCase() === "kiadva" && days !== null && days >= 0 && days <= 4; return <option key={m.id} value={m.id}>{m.name} ({m.status}{isSoonIssued ? `, ${days === 0 ? "ma" : `${days} nap`} múlva szabadul` : ""})</option> })}</select>}</td><td style={cellStyle}><div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{r.status !== "aktív" && r.status !== "visszamondta" && <button type="button" onClick={() => handleAssignRequestToMachine(r)} disabled={assigningRequestId === r.id} style={miniSuccessButtonStyle}>{assigningRequestId === r.id ? "Folyamatban..." : "Gépre ad"}</button>}{r.status !== "aktív" && r.status !== "visszamondta" && <button type="button" onClick={() => handleReserveRequestToMachine(r)} disabled={reservingRequestId === r.id} style={miniButtonStyle}>{reservingRequestId === r.id ? "Folyamatban..." : "Következőnek lefoglal"}</button>}{r.status !== "visszamondta" && r.status !== "aktív" && <button type="button" onClick={() => handleMarkRequestCancelled(r.id)} style={miniWarningButtonStyle}>Visszamondta</button>}<button type="button" onClick={() => handleDeleteRequest(r.id)} style={miniDangerButtonStyle}>Törlés</button></div></td></tr>)}</tbody></table></div></section>
  <section style={mobileOnlyStyle}>{requests.map(renderRequestCard)}</section></main>
}

const pageStyle = { padding: "32px", fontFamily: "sans-serif", background: "#f7f8fa", minHeight: "100vh" }
const cardStyle = { background: "#fff", borderRadius: "16px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }
const headerStyle = { marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" as const }
const navLinkStyle = { padding: "10px 18px", background: "#fff", color: "#111", borderRadius: "8px", textDecoration: "none", fontWeight: "bold", border: "1px solid #ddd" }
const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", width: "100%" }
const formGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "12px" }
const primaryButtonStyle = { padding: "10px 20px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }
const toggleButtonStyle = { background: "none", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }
const tableWrapStyle = { overflowX: "auto" as const, background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }
const miniButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#eef2ff", cursor: "pointer", fontWeight: "bold" }
const miniSuccessButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#d9f8e5", cursor: "pointer", fontWeight: "bold" }
const miniWarningButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff3cd", cursor: "pointer", fontWeight: "bold" }
const miniDangerButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#ffd6d6", cursor: "pointer", fontWeight: "bold" }
const cellStyle = { padding: "12px", borderBottom: "1px solid #eee", textAlign: "left" as const }
const statsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" }
const msgStyle = { marginLeft: "15px", fontSize: "14px", fontWeight: "bold" }
const mobileOnlyStyle = { display: "none" } as const
const desktopOnlyStyle = { display: "block" } as const
const mobileCardStyle = { background: "#fff", borderRadius: "16px", padding: "16px", marginBottom: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }
const mobileCardHeaderStyle = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }
const mobileBadgeStyle = { background: "#111", color: "#fff", borderRadius: "999px", padding: "6px 10px", fontSize: "12px", fontWeight: "bold" }
const mobileInfoStyle = { marginBottom: "8px", fontSize: "14px" }
