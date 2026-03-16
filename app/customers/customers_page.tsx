"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

type Machine = { id: string; name: string | null; location: string | null; current_customer: string | null; rental_end: string | null }
type Customer = { id: string; name: string | null; phone: string | null; email: string | null; city: string | null; address: string | null; notes: string | null }
type Rental = { id: string; machine_id: string | null; customer_id: string | null; end_date: string | null; tartozas: number | null; visszaszallitas_modja: string | null; status: string | null }
type ActiveCustomerRow = { customer: Customer; machine: Machine; rental: Rental | null }

function getSupabaseErrorMessage(error: any, fallback: string) { if (!error) return fallback; const parts = [error.message, error.details, error.hint, error.code ? `Kód: ${error.code}` : null].filter(Boolean); return parts.length ? parts.join(" | ") : fallback }
function StatCard({ title, value, color = "#111" }: { title: string; value: React.ReactNode; color?: string }) { return <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}><div style={{ fontSize: "13px", color: "#666" }}>{title}</div><div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div></div> }

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [removingCustomerId, setRemovingCustomerId] = useState<string | null>(null)

  useEffect(() => { checkUser() }, [])
  async function checkUser() { const { data, error } = await supabase.auth.getUser(); if (error || !data.user) { router.push("/login"); return } await loadAllData() }
  async function logout() { await supabase.auth.signOut(); router.push("/login") }
  async function loadAllData() { setLoading(true); await Promise.all([fetchCustomers(), fetchMachines(), fetchRentals()]); setLoading(false) }
  async function fetchCustomers() { const { data } = await supabase.from("customers").select("*").order("name", { ascending: true }); setCustomers(data || []) }
  async function fetchMachines() { const { data } = await supabase.from("machines").select("*").order("name", { ascending: true }); setMachines(data || []) }
  async function fetchRentals() { const { data } = await supabase.from("rentals").select("*").order("end_date", { ascending: true }); setRentals(data || []) }

  const activeRentals = useMemo(() => rentals.filter((r) => (r.status || "").toLowerCase() === "aktív"), [rentals])
  const activeCustomerRows = useMemo<ActiveCustomerRow[]>(() => {
    const rows: ActiveCustomerRow[] = []
    for (const rental of activeRentals) {
      if (!rental.machine_id || !rental.customer_id) continue
      const machine = machines.find((item) => item.id === rental.machine_id)
      const customer = customers.find((item) => item.id === rental.customer_id)
      if (machine && customer) rows.push({ customer, machine, rental })
    }
    return rows
  }, [activeRentals, customers, machines])

  async function handleRemoveActiveCustomer(row: ActiveCustomerRow) {
    const confirmed = window.confirm(`Biztosan eltávolítod ezt a bérlőt a rendszerből: ${row.customer.name || "ismeretlen bérlő"}?`)
    if (!confirmed) return
    setRemovingCustomerId(row.customer.id)
    try {
      const activeRentalQuery = await supabase.from("rentals").select("id").eq("machine_id", row.machine.id).eq("customer_id", row.customer.id).eq("status", "Aktív").order("end_date", { ascending: false }).limit(1)
      if (activeRentalQuery.error) throw activeRentalQuery.error
      const activeRental = activeRentalQuery.data?.[0]
      if (activeRental?.id) { const rentalUpdate = await supabase.from("rentals").update({ status: "Lezárt" }).eq("id", activeRental.id); if (rentalUpdate.error) throw rentalUpdate.error }
      const machineUpdate = await supabase.from("machines").update({ status: "Szabad", current_customer: null, rental_start: null, rental_end: null }).eq("id", row.machine.id)
      if (machineUpdate.error) throw machineUpdate.error
      const customerDelete = await supabase.from("customers").delete().eq("id", row.customer.id)
      if (customerDelete.error) throw customerDelete.error
      await Promise.all([fetchCustomers(), fetchMachines(), fetchRentals()]); alert("A bérlő sikeresen eltávolítva.")
    } catch (error: any) { alert(getSupabaseErrorMessage(error, "Nem sikerült eltávolítani a bérlőt.")) } finally { setRemovingCustomerId(null) }
  }

  const totalDebt = useMemo(() => activeCustomerRows.reduce((sum, row) => sum + (row.rental?.tartozas || 0), 0), [activeCustomerRows])
  const renderCard = (row: ActiveCustomerRow) => <div key={`${row.customer.id}-${row.machine.id}`} style={mobileCardStyle}><div style={mobileCardHeaderStyle}><div><strong style={{ fontSize: "18px" }}>{row.customer.name || "-"}</strong><div style={{ color: "#666", fontSize: "13px" }}>{row.machine.name || "-"}</div></div><span style={mobileBadgeStyle}>{row.machine.rental_end || "-"}</span></div><div style={mobileInfoStyle}><strong>Telefon:</strong> {row.customer.phone || "-"}</div><div style={mobileInfoStyle}><strong>Email:</strong> {row.customer.email || "-"}</div><div style={mobileInfoStyle}><strong>Város:</strong> {row.customer.city || "-"}</div><div style={mobileInfoStyle}><strong>Cím:</strong> {row.customer.address || "-"}</div><div style={mobileInfoStyle}><strong>Visszaszállítás:</strong> {row.rental?.visszaszallitas_modja || "-"}</div><div style={mobileInfoStyle}><strong>Tartozás:</strong> {row.rental?.tartozas ? `${row.rental.tartozas.toLocaleString("hu-HU")} Ft` : "0 Ft"}</div><button type="button" onClick={() => handleRemoveActiveCustomer(row)} disabled={removingCustomerId === row.customer.id} style={{ ...miniDangerButtonStyle, marginTop: 10 }}>{removingCustomerId === row.customer.id ? "Folyamatban..." : "Bérlő eltávolítása"}</button></div>

  if (loading) return <main style={pageStyle}><h2 style={{ marginTop: 0 }}>Betöltés...</h2><p style={{ color: "#555" }}>Bérlő adatok szinkronizálása folyamatban.</p></main>

  return <main style={pageStyle}><header style={headerStyle}><div><h1 style={{ fontSize: "32px", margin: 0 }}>CPM Rent - Bérlők</h1><p style={{ color: "#555" }}>Aktív bérlők és kapcsolattartási adatok</p></div><div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}><Link href="/" style={navLinkStyle}>Dashboard</Link><Link href="/machines" style={navLinkStyle}>Flotta</Link><Link href="/requests" style={navLinkStyle}>Várólista</Link><button onClick={logout} style={primaryButtonStyle}>Kijelentkezés</button></div></header>
  <div style={statsGridStyle}><StatCard title="Aktív bérlők" value={activeCustomerRows.length} /><StatCard title="Összes tartozás" value={`${totalDebt.toLocaleString("hu-HU")} Ft`} color="#dc2626" /></div>
  <section style={desktopOnlyStyle}><div style={tableWrapStyle}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#111", color: "#fff" }}><th style={cellStyle}>Név</th><th style={cellStyle}>Telefon</th><th style={cellStyle}>Email</th><th style={cellStyle}>Város</th><th style={cellStyle}>Cím</th><th style={cellStyle}>Gép</th><th style={cellStyle}>Lejárat</th><th style={cellStyle}>Visszaszállítás</th><th style={cellStyle}>Tartozás</th><th style={cellStyle}>Művelet</th></tr></thead><tbody>{activeCustomerRows.map((row) => <tr key={`${row.customer.id}-${row.machine.id}`}><td style={cellStyle}><strong>{row.customer.name || "-"}</strong></td><td style={cellStyle}>{row.customer.phone || "-"}</td><td style={cellStyle}>{row.customer.email || "-"}</td><td style={cellStyle}>{row.customer.city || "-"}</td><td style={cellStyle}>{row.customer.address || "-"}</td><td style={cellStyle}>{row.machine.name || "-"}</td><td style={cellStyle}>{row.machine.rental_end || "-"}</td><td style={cellStyle}>{row.rental?.visszaszallitas_modja || "-"}</td><td style={{ ...cellStyle, color: (row.rental?.tartozas || 0) > 0 ? "#dc2626" : "#111", fontWeight: "bold" }}>{row.rental?.tartozas ? `${row.rental.tartozas.toLocaleString("hu-HU")} Ft` : "0 Ft"}</td><td style={cellStyle}><button type="button" onClick={() => handleRemoveActiveCustomer(row)} disabled={removingCustomerId === row.customer.id} style={miniDangerButtonStyle}>{removingCustomerId === row.customer.id ? "Folyamatban..." : "Bérlő eltávolítása"}</button></td></tr>)}</tbody></table></div></section>
  <section style={mobileOnlyStyle}>{activeCustomerRows.map(renderCard)}</section></main>
}

const pageStyle = { padding: "32px", fontFamily: "sans-serif", background: "#f7f8fa", minHeight: "100vh" }
const headerStyle = { marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" as const }
const navLinkStyle = { padding: "10px 18px", background: "#fff", color: "#111", borderRadius: "8px", textDecoration: "none", fontWeight: "bold", border: "1px solid #ddd" }
const tableWrapStyle = { overflowX: "auto" as const, background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }
const primaryButtonStyle = { padding: "10px 20px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }
const miniDangerButtonStyle = { padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#ffd6d6", cursor: "pointer", fontWeight: "bold" }
const cellStyle = { padding: "12px", borderBottom: "1px solid #eee", textAlign: "left" as const }
const statsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }
const mobileOnlyStyle = { display: "none" } as const
const desktopOnlyStyle = { display: "block" } as const
const mobileCardStyle = { background: "#fff", borderRadius: "16px", padding: "16px", marginBottom: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }
const mobileCardHeaderStyle = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }
const mobileBadgeStyle = { background: "#111", color: "#fff", borderRadius: "999px", padding: "6px 10px", fontSize: "12px", fontWeight: "bold" }
const mobileInfoStyle = { marginBottom: "8px", fontSize: "14px" }
