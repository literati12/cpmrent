"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"

// --- Típusdefiníciók ---
type Machine = {
  id: string
  name: string | null
  type: string | null
  status: string | null
  location: string | null
  current_customer: string | null
  rental_start: string | null
  rental_end: string | null
  notes: string | null
}

type Customer = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  notes: string | null
}

type RequestItem = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  requested_start_date: string | null
  requested_duration_days: number | null
  status: string | null
  assigned_machine_id: string | null
  priority: number | null
  notes: string | null
  created_at?: string | null
}

type Rental = {
  id: string
  machine_id: string | null
  customer_id: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  created_at?: string | null
  berleti_dij: number | null
  fizetett_osszeg: number | null
  tartozas: number | null
  note: string | null
  visszaszallitas_modja: string | null
}

type ActiveCustomerRow = {
  customer: Customer
  machine: Machine
  rental: Rental | null
}

type FilterType =
  | "összes"
  | "foglalt"
  | "szabad"
  | "lejáró"
  | "lejárt"
  | "tartalék"
  | "javítás"

type NewMachineForm = {
  name: string
  type: string
  status: string
  location: string
  current_customer: string
  rental_start: string
  rental_end: string
}

type NewRentalForm = {
  machine_id: string
  customer_id: string
  start_date: string
  end_date: string
  berleti_dij: string
  fizetett_osszeg: string
  visszaszallitas_modja: string
  status: string
  notes: string
}

type NewCustomerForm = {
  name: string
  phone: string
  email: string
  city: string
  address: string
  notes: string
}

type NewRequestForm = {
  name: string
  phone: string
  email: string
  city: string
  address: string
  requested_start_date: string
  requested_duration_days: string
  status: string
  priority: string
  notes: string
}

const initialMachineForm: NewMachineForm = {
  name: "",
  type: "Kinetec Spectra",
  status: "Szabad",
  location: "",
  current_customer: "",
  rental_start: "",
  rental_end: "",
}

const initialRentalForm: NewRentalForm = {
  machine_id: "",
  customer_id: "",
  start_date: "",
  end_date: "",
  berleti_dij: "",
  fizetett_osszeg: "",
  visszaszallitas_modja: "Én megyek érte",
  status: "Aktív",
  notes: "",
}

const initialCustomerForm: NewCustomerForm = {
  name: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  notes: "",
}

const initialRequestForm: NewRequestForm = {
  name: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  requested_start_date: "",
  requested_duration_days: "14",
  status: "várakozik",
  priority: "1",
  notes: "",
}

function getSupabaseErrorMessage(error: any, fallback: string) {
  if (!error) return fallback

  const parts = [
    error.message,
    error.details,
    error.hint,
    error.code ? `Kód: ${error.code}` : null,
  ].filter(Boolean)

  return parts.length ? parts.join(" | ") : fallback
}

export default function Dashboard() {
  const router = useRouter()

  const [machines, setMachines] = useState<Machine[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)

  const [savingMachine, setSavingMachine] = useState(false)
  const [savingRental, setSavingRental] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [savingRequest, setSavingRequest] = useState(false)
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null)
  const [reservingRequestId, setReservingRequestId] = useState<string | null>(null)
  const [updatingMachineId, setUpdatingMachineId] = useState<string | null>(null)
  const [removingCustomerId, setRemovingCustomerId] = useState<string | null>(null)

  const [filter, setFilter] = useState<FilterType>("összes")

  const [machineForm, setMachineForm] = useState<NewMachineForm>(initialMachineForm)
  const [rentalForm, setRentalForm] = useState<NewRentalForm>(initialRentalForm)
  const [customerForm, setCustomerForm] = useState<NewCustomerForm>(initialCustomerForm)
  const [requestForm, setRequestForm] = useState<NewRequestForm>(initialRequestForm)

  const [machineMessage, setMachineMessage] = useState("")
  const [rentalMessage, setRentalMessage] = useState("")
  const [customerMessage, setCustomerMessage] = useState("")
  const [requestMessage, setRequestMessage] = useState("")

  const [showAddMachineForm, setShowAddMachineForm] = useState(false)
  const [showAddRentalForm, setShowAddRentalForm] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [showAddRequestForm, setShowAddRequestForm] = useState(false)

  const [requestMachineSelections, setRequestMachineSelections] = useState<Record<string, string>>({})
  const [machineStatusSelections, setMachineStatusSelections] = useState<Record<string, string>>({})
  const [rentalEndSelections, setRentalEndSelections] = useState<Record<string, string>>({})
  const [updatingRentalId, setUpdatingRentalId] = useState<string | null>(null)
  const [rentalDebtSelections, setRentalDebtSelections] = useState<Record<string, string>>({})
  const [rentalReturnModeSelections, setRentalReturnModeSelections] = useState<Record<string, string>>({})
  const [savingRentalDetailsId, setSavingRentalDetailsId] = useState<string | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      router.push("/login")
      return
    }

    await loadAllData()
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function loadAllData() {
    setLoading(true)
    await Promise.all([fetchMachines(), fetchCustomers(), fetchRequests(), fetchRentals()])
    setLoading(false)
  }

  async function fetchMachines() {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("Hiba a gépek lekérésekor:", {
        raw: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    } else {
      setMachines(data || [])
    }
  }

  async function fetchCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("Hiba a bérlők lekérésekor:", {
        raw: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    } else {
      setCustomers(data || [])
    }
  }

  async function fetchRequests() {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Hiba a várólista lekérésekor:", {
        raw: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    } else {
      setRequests(data || [])
    }
  }

  async function fetchRentals() {
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .order("start_date", { ascending: false })

    if (error) {
      console.error("Hiba a bérlések lekérésekor:", {
        raw: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    } else {
      setRentals(data || [])
    }
  }

  // --- SEGÉDFÜGGVÉNYEK ---

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  const formatDateToYMD = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  const getDaysUntil = (dateString: string | null) => {
    if (!dateString) return null

    const end = parseLocalDate(dateString)
    const start = new Date()

    end.setHours(0, 0, 0, 0)
    start.setHours(0, 0, 0, 0)

    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const isStatus = (m: Machine, val: string) =>
    (m.status || "").toLowerCase() === val.toLowerCase()

  const isMachineImmediatelyAssignable = (machine: Machine) =>
    ["szabad", "tartalék", "lefoglalt"].includes((machine.status || "").toLowerCase()) &&
    !machine.current_customer

  const isMachineReservableForNext = (machine: Machine) => {
    if (isMachineImmediatelyAssignable(machine)) return true

    const daysUntil = getDaysUntil(machine.rental_end)

    return isStatus(machine, "Kiadva") && daysUntil !== null && daysUntil >= 0 && daysUntil <= 4
  }

  // --- KEZELŐ FÜGGVÉNYEK ---
  async function handleAddCustomer(e: React.MouseEvent | React.FormEvent) {
    e.preventDefault()
    setCustomerMessage("")

    if (!customerForm.name.trim()) {
      setCustomerMessage("A bérlő neve kötelező.")
      return
    }

    setSavingCustomer(true)

    const payload = {
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim() || null,
      email: customerForm.email.trim() || null,
      city: customerForm.city.trim() || null,
      address: customerForm.address.trim() || null,
      notes: customerForm.notes.trim() || null,
    }

    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single()

      if (error) {
        console.error("Hiba bérlő mentés közben:", {
          raw: error,
          payload,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        setCustomerMessage(
          getSupabaseErrorMessage(error, "Hiba történt az új bérlő mentésénél.")
        )
        return
      }

      setCustomerMessage("Új bérlő sikeresen létrehozva.")
      await fetchCustomers()
      setRentalForm((prev) => ({ ...prev, customer_id: data.id }))
      setCustomerForm(initialCustomerForm)
      setShowNewCustomerForm(false)
    } catch (error: any) {
      console.error("Váratlan hiba bérlő mentés közben:", error)
      setCustomerMessage(
        getSupabaseErrorMessage(error, "Váratlan hiba történt bérlő mentés közben.")
      )
    } finally {
      setSavingCustomer(false)
    }
  }

  async function handleAddMachine(e: React.FormEvent) {
    e.preventDefault()
    setMachineMessage("")

    if (!machineForm.name.trim()) {
      setMachineMessage("A gép neve kötelező.")
      return
    }

    setSavingMachine(true)

    const payload = {
      name: machineForm.name.trim(),
      type: machineForm.type.trim() || null,
      status: machineForm.status || "Szabad",
      location: machineForm.location.trim() || null,
      current_customer: machineForm.current_customer.trim() || null,
      rental_start: machineForm.rental_start || null,
      rental_end: machineForm.rental_end || null,
      notes: null,
    }

    try {
      const response = await supabase.from("machines").insert([payload]).select()

      if (response.error) {
        console.error("Hiba történt gép mentés közben:", {
          raw: response.error,
          payload,
          message: response.error.message,
          details: response.error.details,
          hint: response.error.hint,
          code: response.error.code,
        })

        setMachineMessage(
          getSupabaseErrorMessage(response.error, "Hiba történt gép mentés közben.")
        )
        return
      }

      setMachineMessage("Sikeres mentés.")
      setMachineForm(initialMachineForm)
      setShowAddMachineForm(false)
      await Promise.all([fetchMachines(), fetchRentals()])
    } catch (error: any) {
      console.error("Váratlan hiba gép mentés közben:", error)
      setMachineMessage(
        getSupabaseErrorMessage(error, "Váratlan hiba történt gép mentés közben.")
      )
    } finally {
      setSavingMachine(false)
    }
  }

  async function handleAddRental(e: React.FormEvent) {
    e.preventDefault()
    setRentalMessage("")

    if (
      !rentalForm.machine_id ||
      !rentalForm.customer_id ||
      !rentalForm.start_date ||
      !rentalForm.end_date
    ) {
      setRentalMessage("Minden kötelező mezőt tölts ki.")
      return
    }

    if (rentalForm.end_date < rentalForm.start_date) {
      setRentalMessage("A záró dátum nem lehet korábbi, mint a kezdő dátum.")
      return
    }

    const berletiDij = Number(rentalForm.berleti_dij || 0)
    const fizetettOsszeg = Number(rentalForm.fizetett_osszeg || 0)

    if (Number.isNaN(berletiDij) || Number.isNaN(fizetettOsszeg)) {
      setRentalMessage("A díj és a fizetett összeg csak szám lehet.")
      return
    }

    const tartozas = Math.max(berletiDij - fizetettOsszeg, 0)

    const selectedMachine = machines.find((m) => m.id === rentalForm.machine_id)
    const selectedCustomer = customers.find((c) => c.id === rentalForm.customer_id)

    if (!selectedMachine || !selectedCustomer) {
      setRentalMessage("A kiválasztott gép vagy bérlő nem található.")
      return
    }

    setSavingRental(true)

    const rentalPayload = {
      machine_id: rentalForm.machine_id,
      customer_id: rentalForm.customer_id,
      start_date: rentalForm.start_date,
      end_date: rentalForm.end_date,
      berleti_dij: berletiDij,
      fizetett_osszeg: fizetettOsszeg,
      tartozas,
      visszaszallitas_modja: rentalForm.visszaszallitas_modja,
      status: rentalForm.status,
      note: rentalForm.notes.trim() || null,
    }

    const machinePayload = {
      status: "Kiadva",
      current_customer: selectedCustomer.name,
      rental_start: rentalForm.start_date,
      rental_end: rentalForm.end_date,
      location: selectedCustomer.city || selectedMachine.location,
    }

    try {
      const rentalInsert = await supabase.from("rentals").insert([rentalPayload]).select()
      if (rentalInsert.error) throw rentalInsert.error

      const machineUpdate = await supabase
        .from("machines")
        .update(machinePayload)
        .eq("id", rentalForm.machine_id)
        .select()

      if (machineUpdate.error) throw machineUpdate.error

      setRentalMessage("Bérlés rögzítve.")
      setRentalForm(initialRentalForm)
      setShowAddRentalForm(false)
      await Promise.all([fetchMachines(), fetchRentals()])
    } catch (error: any) {
      console.error("Váratlan hiba bérlés rögzítés közben:", error)
      setRentalMessage(getSupabaseErrorMessage(error, "Váratlan hiba történt a bérlés rögzítése közben."))
    } finally {
      setSavingRental(false)
    }
  }

  async function handleAddRequest(e: React.FormEvent) {
    e.preventDefault()
    setRequestMessage("")
    if (!requestForm.name.trim()) {
      setRequestMessage("A várakozó neve kötelező.")
      return
    }

    setSavingRequest(true)

    const payload = {
      name: requestForm.name.trim(),
      phone: requestForm.phone.trim() || null,
      email: requestForm.email.trim() || null,
      city: requestForm.city.trim() || null,
      address: requestForm.address.trim() || null,
      requested_start_date: requestForm.requested_start_date || null,
      requested_duration_days: Number(requestForm.requested_duration_days || 0) || null,
      status: requestForm.status || "várakozik",
      priority: Number(requestForm.priority || 1) || 1,
      notes: requestForm.notes.trim() || null,
    }

    try {
      const { error } = await supabase.from("requests").insert([payload])
      if (error) throw error

      setRequestMessage("Várakozó sikeresen rögzítve.")
      setRequestForm(initialRequestForm)
      setShowAddRequestForm(false)
      await fetchRequests()
    } catch (error: any) {
      console.error("Váratlan hiba várakozó mentés közben:", error)
      setRequestMessage(getSupabaseErrorMessage(error, "Váratlan hiba történt várakozó mentés közben."))
    } finally {
      setSavingRequest(false)
    }
  }

  async function handleMarkRequestCancelled(requestId: string) {
    const confirmed = window.confirm("Biztosan visszamondta státuszra állítod?")
    if (!confirmed) return

    const { error } = await supabase.from("requests").update({ status: "visszamondta" }).eq("id", requestId)
    if (error) {
      alert(getSupabaseErrorMessage(error, "Nem sikerült frissíteni a státuszt."))
      return
    }
    await fetchRequests()
  }

  async function handleDeleteRequest(requestId: string) {
    const confirmed = window.confirm("Biztosan törlöd ezt a várakozót?")
    if (!confirmed) return

    const { error } = await supabase.from("requests").delete().eq("id", requestId)
    if (error) {
      alert(getSupabaseErrorMessage(error, "Nem sikerült törölni a várakozót."))
      return
    }
    await fetchRequests()
  }

  async function handleAssignRequestToMachine(request: RequestItem) {
    const selectedMachineId = requestMachineSelections[request.id]
    if (!selectedMachineId) return alert("Először válassz gépet a várakozóhoz.")

    const selectedMachine = machines.find((m) => m.id === selectedMachineId)
    if (!selectedMachine) return alert("A kiválasztott gép nem található.")
    if (!request.name?.trim()) return alert("A várakozó neve hiányzik.")
    if (!request.requested_start_date || !request.requested_duration_days) {
      return alert("Hiányzik az igény kezdete vagy az időtartam.")
    }

    setAssigningRequestId(request.id)

    try {
      const customerPayload = {
        name: request.name.trim(),
        phone: request.phone?.trim() || null,
        email: request.email?.trim() || null,
        city: request.city?.trim() || null,
        address: request.address?.trim() || null,
        notes: request.notes?.trim() || null,
      }

      const customerInsert = await supabase.from("customers").insert([customerPayload]).select().single()
      if (customerInsert.error || !customerInsert.data) {
        throw customerInsert.error || new Error("Nem sikerült létrehozni a bérlőt.")
      }

      const newCustomer = customerInsert.data
      const start = parseLocalDate(request.requested_start_date)
      const end = new Date(start)
      end.setDate(end.getDate() + Number(request.requested_duration_days))
      const endDate = formatDateToYMD(end)

      const rentalPayload = {
        machine_id: selectedMachineId,
        customer_id: newCustomer.id,
        start_date: request.requested_start_date,
        end_date: endDate,
        berleti_dij: 0,
        fizetett_osszeg: 0,
        tartozas: 0,
        visszaszallitas_modja: "Én megyek érte",
        status: "Aktív",
        note: request.notes?.trim() || null,
      }

      const rentalInsert = await supabase.from("rentals").insert([rentalPayload]).select()
      if (rentalInsert.error) throw rentalInsert.error

      const machinePayload = {
        status: "Kiadva",
        current_customer: newCustomer.name,
        rental_start: request.requested_start_date,
        rental_end: endDate,
        location: newCustomer.city || selectedMachine.location,
      }

      const machineUpdate = await supabase.from("machines").update(machinePayload).eq("id", selectedMachineId).select()
      if (machineUpdate.error) throw machineUpdate.error

      const requestUpdate = await supabase
        .from("requests")
        .update({ status: "aktív", assigned_machine_id: selectedMachineId })
        .eq("id", request.id)
      if (requestUpdate.error) throw requestUpdate.error

      await Promise.all([fetchCustomers(), fetchMachines(), fetchRequests(), fetchRentals()])
      alert("A várakozóból sikeresen aktív bérlő lett.")
    } catch (error: any) {
      console.error("Hiba gépre adás közben:", error)
      alert(getSupabaseErrorMessage(error, "Nem sikerült a várakozót gépre adni."))
    } finally {
      setAssigningRequestId(null)
    }
  }

  async function handleReserveRequestToMachine(request: RequestItem) {
    const selectedMachineId = requestMachineSelections[request.id]
    if (!selectedMachineId) return alert("Először válassz gépet a várakozóhoz.")

    const selectedMachine = machines.find((m) => m.id === selectedMachineId)
    if (!selectedMachine) return alert("A kiválasztott gép nem található.")
    if (!isMachineReservableForNext(selectedMachine)) return alert("Erre a gépre most nem lehet előfoglalást tenni.")

    setReservingRequestId(request.id)

    try {
      const requestUpdate = await supabase
        .from("requests")
        .update({ status: "lefoglalva", assigned_machine_id: selectedMachineId })
        .eq("id", request.id)
      if (requestUpdate.error) throw requestUpdate.error

      if (isMachineImmediatelyAssignable(selectedMachine)) {
        const machineUpdate = await supabase.from("machines").update({ status: "Lefoglalt" }).eq("id", selectedMachineId)
        if (machineUpdate.error) throw machineUpdate.error
      }

      await Promise.all([fetchMachines(), fetchRequests()])
      alert("A várakozó sikeresen lefoglalva a kiválasztott gépre.")
    } catch (error: any) {
      console.error("Hiba előfoglalás közben:", error)
      alert(getSupabaseErrorMessage(error, "Nem sikerült lefoglalni a várakozót."))
    } finally {
      setReservingRequestId(null)
    }
  }

  async function handleUpdateRentalEnd(machine: Machine) {
    const newEndDate = rentalEndSelections[machine.id] || machine.rental_end
    if (!newEndDate) return alert("Adj meg új lejárati dátumot.")
    if (!machine.current_customer) return alert("Ehhez a géphez nincs aktív bérlő.")
    if (machine.rental_start && newEndDate < machine.rental_start) {
      return alert("Az új lejárat nem lehet korábbi, mint a kezdő dátum.")
    }

    setUpdatingRentalId(machine.id)

    try {
      const activeRentalQuery = await supabase
        .from("rentals")
        .select("id")
        .eq("machine_id", machine.id)
        .eq("status", "Aktív")
        .order("start_date", { ascending: false })
        .limit(1)
      if (activeRentalQuery.error) throw activeRentalQuery.error

      const activeRental = activeRentalQuery.data?.[0]
      if (!activeRental?.id) throw new Error("Nem található aktív bérlés ehhez a géphez.")

      const rentalUpdate = await supabase.from("rentals").update({ end_date: newEndDate }).eq("id", activeRental.id)
      if (rentalUpdate.error) throw rentalUpdate.error

      const machineUpdate = await supabase.from("machines").update({ rental_end: newEndDate }).eq("id", machine.id)
      if (machineUpdate.error) throw machineUpdate.error

      setRentalEndSelections((prev) => ({ ...prev, [machine.id]: newEndDate }))
      await fetchMachines()
      alert("A bérlés lejárata sikeresen módosítva.")
    } catch (error: any) {
      console.error("Hiba lejárat módosítása közben:", error)
      alert(getSupabaseErrorMessage(error, "Nem sikerült módosítani a bérlés lejáratát."))
    } finally {
      setUpdatingRentalId(null)
    }
  }

  async function handleSaveRentalDetails(machine: Machine) {
    const activeRental = activeRentalByMachineId[machine.id]
    if (!activeRental?.id) return alert("Ehhez a géphez nincs aktív bérlés.")

    const rawDebtValue =
      rentalDebtSelections[machine.id] !== undefined
        ? rentalDebtSelections[machine.id]
        : String(activeRental.tartozas ?? 0)

    const parsedDebt = Number(rawDebtValue)
    if (Number.isNaN(parsedDebt) || parsedDebt < 0) {
      return alert("A tartozás csak 0 vagy pozitív szám lehet.")
    }

    const selectedReturnMode =
      rentalReturnModeSelections[machine.id] ??
      activeRental.visszaszallitas_modja ??
      "Én megyek érte"

    const updatePayload: {
      tartozas: number
      visszaszallitas_modja: string
      fizetett_osszeg?: number
    } = {
      tartozas: parsedDebt,
      visszaszallitas_modja: selectedReturnMode,
    }

    if (typeof activeRental.berleti_dij === "number") {
      updatePayload.fizetett_osszeg = Math.max(activeRental.berleti_dij - parsedDebt, 0)
    }

    setSavingRentalDetailsId(machine.id)

    try {
      const { error } = await supabase.from("rentals").update(updatePayload).eq("id", activeRental.id)
      if (error) throw error
      await fetchRentals()
      alert("A bérlés tartozása és visszaszállítása sikeresen frissítve.")
    } catch (error: any) {
      console.error("Hiba a bérlés adatainak frissítésekor:", error)
      alert(getSupabaseErrorMessage(error, "Nem sikerült frissíteni a bérlés tartozását és visszaszállítását."))
    } finally {
      setSavingRentalDetailsId(null)
    }
  }

  async function handleUpdateMachineStatus(machineId: string) {
    const selectedStatus = machineStatusSelections[machineId]
    if (!selectedStatus) return alert("Válassz új státuszt.")

    setUpdatingMachineId(machineId)

    try {
      const updatePayload: {
        status: string
        current_customer?: string | null
        rental_start?: string | null
        rental_end?: string | null
      } = { status: selectedStatus }

      if (selectedStatus !== "Kiadva" && selectedStatus !== "Lefoglalt") {
        updatePayload.current_customer = null
        updatePayload.rental_start = null
        updatePayload.rental_end = null
      }

      const { error } = await supabase.from("machines").update(updatePayload).eq("id", machineId)
      if (error) throw error

      await fetchMachines()
      alert("Gép státusza frissítve.")
    } catch (error: any) {
      console.error("Hiba gép státusz frissítése közben:", error)
      alert(getSupabaseErrorMessage(error, "Nem sikerült frissíteni a gép státuszát."))
    } finally {
      setUpdatingMachineId(null)
    }
  }

  async function handleReturnMachine(machine: Machine) {
    const confirmed = window.confirm(`Biztosan leveszed a bérlőt erről a gépről: ${machine.name || "ismeretlen gép"}?`)
    if (!confirmed) return

    setUpdatingMachineId(machine.id)

    try {
      const activeRentalQuery = await supabase
        .from("rentals")
        .select("id")
        .eq("machine_id", machine.id)
        .eq("status", "Aktív")
        .order("start_date", { ascending: false })
        .limit(1)
      if (activeRentalQuery.error) throw activeRentalQuery.error

      const activeRental = activeRentalQuery.data?.[0]
      if (activeRental?.id) {
        const rentalUpdate = await supabase.from("rentals").update({ status: "Lezárt" }).eq("id", activeRental.id)
        if (rentalUpdate.error) throw rentalUpdate.error
      }

      const machineUpdate = await supabase
        .from("machines")
        .update({ status: "Szabad", current_customer: null, rental_start: null, rental_end: null })
        .eq("id", machine.id)
      if (machineUpdate.error) throw machineUpdate.error

      await Promise.all([fetchMachines(), fetchRequests(), fetchRentals()])
      alert("A gépről sikeresen lekerült a bérlő.")
    } catch (error: any) {
      console.error("Hiba visszavétel közben:", error)
      alert(getSupabaseErrorMessage(error, "Nem sikerült a gép visszavétele."))
    } finally {
      setUpdatingMachineId(null)
    }
  }

  async function handleRemoveActiveCustomer(row: ActiveCustomerRow) {
    const confirmed = window.confirm(`Biztosan eltávolítod ezt a bérlőt a rendszerből: ${row.customer.name || "ismeretlen bérlő"}?`)
    if (!confirmed) return

    setRemovingCustomerId(row.customer.id)

    try {
      const activeRentalQuery = await supabase
        .from("rentals")
        .select("id")
        .eq("machine_id", row.machine.id)
        .eq("customer_id", row.customer.id)
        .eq("status", "Aktív")
        .order("start_date", { ascending: false })
        .limit(1)
      if (activeRentalQuery.error) throw activeRentalQuery.error

      const activeRental = activeRentalQuery.data?.[0]
      if (activeRental?.id) {
        const rentalUpdate = await supabase.from("rentals").update({ status: "Lezárt" }).eq("id", activeRental.id)
        if (rentalUpdate.error) throw rentalUpdate.error
      }

      const machineUpdate = await supabase
        .from("machines")
        .update({ status: "Szabad", current_customer: null, rental_start: null, rental_end: null })
        .eq("id", row.machine.id)
      if (machineUpdate.error) throw machineUpdate.error

      const customerDelete = await supabase.from("customers").delete().eq("id", row.customer.id)
      if (customerDelete.error) throw customerDelete.error

      await Promise.all([fetchCustomers(), fetchMachines(), fetchRequests(), fetchRentals()])
      alert("A bérlő sikeresen eltávolítva.")
    } catch (error: any) {
      console.error("Hiba bérlő eltávolítása közben:", error)
      alert(getSupabaseErrorMessage(error, "Nem sikerült eltávolítani a bérlőt."))
    } finally {
      setRemovingCustomerId(null)
    }
  }

  // --- MEMO-ZOTT STATISZTIKÁK ÉS SZŰRÉS ---
  const stats = useMemo(() => {
    const total = machines.length
    const rented = machines.filter((m) => isStatus(m, "Kiadva")).length
    const reserved = machines.filter((m) => isStatus(m, "Lefoglalt")).length
    const repair = machines.filter((m) => isStatus(m, "Javítás alatt")).length
    const activeFleet = total - repair
    const occupied = rented + reserved
    const utilization = activeFleet > 0 ? Math.round((occupied / activeFleet) * 100) : 0

    return {
      total,
      rented,
      reserved,
      activeFleet,
      occupied,
      free: machines.filter((m) => isStatus(m, "Szabad")).length,
      reserve: machines.filter((m) => isStatus(m, "Tartalék")).length,
      repair,
      expiringSoon: machines.filter((m) => {
        const d = getDaysUntil(m.rental_end)
        return d !== null && d >= 0 && d <= 5 && isStatus(m, "Kiadva")
      }).length,
      expired: machines.filter((m) => {
        const d = getDaysUntil(m.rental_end)
        return d !== null && d < 0 && isStatus(m, "Kiadva")
      }).length,
      utilization,
      recommendation:
        utilization >= 90
          ? "Új gép beszerzés indokolt"
          : utilization >= 80
          ? "Figyelni kell a kapacitásra"
          : "Stabil kapacitás",
    }
  }, [machines])

  const filteredMachines = useMemo(() => {
    if (filter === "összes") return machines
    if (filter === "foglalt") {
      return machines.filter((m) => isStatus(m, "Kiadva") || isStatus(m, "Lefoglalt"))
    }
    if (filter === "szabad") return machines.filter((m) => isStatus(m, "Szabad"))
    if (filter === "tartalék") return machines.filter((m) => isStatus(m, "Tartalék"))
    if (filter === "javítás") return machines.filter((m) => isStatus(m, "Javítás alatt"))
    if (filter === "lejáró") {
      return machines.filter((m) => {
        const d = getDaysUntil(m.rental_end)
        return d !== null && d >= 0 && d <= 5 && isStatus(m, "Kiadva")
      })
    }
    if (filter === "lejárt") {
      return machines.filter((m) => {
        const d = getDaysUntil(m.rental_end)
        return d !== null && d < 0 && isStatus(m, "Kiadva")
      })
    }
    return machines
  }, [machines, filter])

  const rentableMachines = useMemo(() => machines.filter((m) => isMachineImmediatelyAssignable(m)), [machines])
  const reservableMachines = useMemo(() => machines.filter((m) => isMachineReservableForNext(m)), [machines])
  const activeRentals = useMemo(() => rentals.filter((r) => (r.status || "").toLowerCase() === "aktív"), [rentals])

  const activeRentalByMachineId = useMemo(() => {
    const map: Record<string, Rental> = {}
    for (const rental of activeRentals) {
      if (rental.machine_id && !map[rental.machine_id]) {
        map[rental.machine_id] = rental
      }
    }
    return map
  }, [activeRentals])

  const reservedRequests = useMemo(
    () => requests.filter((r) => r.assigned_machine_id && ["lefoglalva", "párosítva"].includes((r.status || "").toLowerCase())),
    [requests]
  )

  const nextReservedRequestByMachineId = useMemo(() => {
    const map: Record<string, RequestItem> = {}
    for (const request of reservedRequests) {
      if (request.assigned_machine_id && !map[request.assigned_machine_id]) {
        map[request.assigned_machine_id] = request
      }
    }
    return map
  }, [reservedRequests])

  const soonExpiringIssuedMachines = useMemo(
    () =>
      machines.filter((machine) => {
        const days = getDaysUntil(machine.rental_end)
        return isStatus(machine, "Kiadva") && days !== null && days >= 0 && days <= 4
      }),
    [machines]
  )

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

  const getRowStyle = (m: Machine) => {
    const d = getDaysUntil(m.rental_end)
    if (isStatus(m, "Kiadva") && d !== null && d < 0) return { backgroundColor: "#ffd6d6" }
    if (isStatus(m, "Kiadva") && d !== null && d <= 5) return { backgroundColor: "#fff3cd" }
    if (isStatus(m, "Szabad")) return { backgroundColor: "#d9f8e5" }
    return { backgroundColor: "#ffffff" }
  }

  if (loading) {
    return (
      <main style={{ padding: "32px", fontFamily: "sans-serif", background: "#f7f8fa", minHeight: "100vh" }}>
        <h2 style={{ marginTop: 0 }}>Betöltés...</h2>
        <p style={{ color: "#555" }}>Adatok szinkronizálása folyamatban.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: "32px", fontFamily: "sans-serif", background: "#f7f8fa", minHeight: "100vh" }}>
      <header
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "32px", margin: 0 }}>CPM Rent Admin</h1>
          <p style={{ color: "#555" }}>Flottakezelő dashboard</p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/mobile"
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Mobil nézet
          </Link>

          <button onClick={logout} style={primaryButtonStyle}>
            Kijelentkezés
          </button>
        </div>
      </header>
    </main>
  )
}

function StatCard({
  title,
  value,
  color = "#111",
}: {
  title: string
  value: React.ReactNode
  color?: string
}) {
  return (
    <div
      style={{
        background: "#fff",
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#666" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div>
    </div>
  )
}

const cardStyle = {
  background: "#fff",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
}

const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "14px",
  width: "100%",
}

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
  marginBottom: "12px",
}

const primaryButtonStyle = {
  padding: "10px 20px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
}

const secondaryButtonStyle = {
  padding: "10px",
  background: "#eee",
  border: "1px solid #ccc",
  borderRadius: "8px",
  cursor: "pointer",
}

const toggleButtonStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
}

const cellStyle = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  textAlign: "left" as const,
}

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
}

const filterButtonStyle = {
  padding: "8px 16px",
  borderRadius: "20px",
  border: "1px solid #ddd",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px",
}

const innerFormStyle = {
  gridColumn: "1 / -1",
  background: "#f9f9f9",
  padding: "15px",
  borderRadius: "10px",
  border: "1px dashed #ccc",
}

const msgStyle = {
  marginLeft: "15px",
  fontSize: "14px",
  fontWeight: "bold",
}
