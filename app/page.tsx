"use client"

import { useEffect, useMemo, useState } from "react"
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
      const rentalInsert = await supabase
        .from("rentals")
        .insert([rentalPayload])
        .select()

      if (rentalInsert.error) {
        console.error("Hiba bérlés mentésekor:", {
          raw: rentalInsert.error,
          rentalPayload,
          message: rentalInsert.error.message,
          details: rentalInsert.error.details,
          hint: rentalInsert.error.hint,
          code: rentalInsert.error.code,
        })

        setRentalMessage(
          getSupabaseErrorMessage(
            rentalInsert.error,
            "Hiba történt a bérlés rögzítése közben."
          )
        )
        return
      }

      const machineUpdate = await supabase
        .from("machines")
        .update(machinePayload)
        .eq("id", rentalForm.machine_id)
        .select()

      if (machineUpdate.error) {
        console.error("Hiba a gép frissítésekor bérlés után:", {
          raw: machineUpdate.error,
          machinePayload,
          message: machineUpdate.error.message,
          details: machineUpdate.error.details,
          hint: machineUpdate.error.hint,
          code: machineUpdate.error.code,
        })

        setRentalMessage(
          getSupabaseErrorMessage(
            machineUpdate.error,
            "A bérlés mentve lett, de a gép frissítése nem sikerült."
          )
        )
        return
      }

      setRentalMessage("Bérlés rögzítve.")
      setRentalForm(initialRentalForm)
      setShowAddRentalForm(false)
      await Promise.all([fetchMachines(), fetchRentals()])
    } catch (error: any) {
      console.error("Váratlan hiba bérlés rögzítés közben:", error)
      setRentalMessage(
        getSupabaseErrorMessage(
          error,
          "Váratlan hiba történt a bérlés rögzítése közben."
        )
      )
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
      requested_duration_days:
        Number(requestForm.requested_duration_days || 0) || null,
      status: requestForm.status || "várakozik",
      priority: Number(requestForm.priority || 1) || 1,
      notes: requestForm.notes.trim() || null,
    }

    try {
      const { error } = await supabase.from("requests").insert([payload])

      if (error) {
        console.error("Hiba várakozó mentése közben:", {
          raw: error,
          payload,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })

        setRequestMessage(
          getSupabaseErrorMessage(error, "Hiba történt a várakozó mentésénél.")
        )
        return
      }

      setRequestMessage("Várakozó sikeresen rögzítve.")
      setRequestForm(initialRequestForm)
      setShowAddRequestForm(false)
      await fetchRequests()
    } catch (error: any) {
      console.error("Váratlan hiba várakozó mentés közben:", error)
      setRequestMessage(
        getSupabaseErrorMessage(
          error,
          "Váratlan hiba történt várakozó mentés közben."
        )
      )
    } finally {
      setSavingRequest(false)
    }
  }

  async function handleMarkRequestCancelled(requestId: string) {
    const confirmed = window.confirm("Biztosan visszamondta státuszra állítod?")
    if (!confirmed) return

    const { error } = await supabase
      .from("requests")
      .update({ status: "visszamondta" })
      .eq("id", requestId)

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

    if (!selectedMachineId) {
      alert("Először válassz gépet a várakozóhoz.")
      return
    }

    const selectedMachine = machines.find((m) => m.id === selectedMachineId)

    if (!selectedMachine) {
      alert("A kiválasztott gép nem található.")
      return
    }

    if (!request.name?.trim()) {
      alert("A várakozó neve hiányzik.")
      return
    }

    if (!request.requested_start_date || !request.requested_duration_days) {
      alert("Hiányzik az igény kezdete vagy az időtartam.")
      return
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

      const customerInsert = await supabase
        .from("customers")
        .insert([customerPayload])
        .select()
        .single()

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

      const rentalInsert = await supabase
        .from("rentals")
        .insert([rentalPayload])
        .select()

      if (rentalInsert.error) {
        throw rentalInsert.error
      }

      const machinePayload = {
        status: "Kiadva",
        current_customer: newCustomer.name,
        rental_start: request.requested_start_date,
        rental_end: endDate,
        location: newCustomer.city || selectedMachine.location,
      }

      const machineUpdate = await supabase
        .from("machines")
        .update(machinePayload)
        .eq("id", selectedMachineId)
        .select()

      if (machineUpdate.error) {
        throw machineUpdate.error
      }

      const requestUpdate = await supabase
        .from("requests")
        .update({
          status: "aktív",
          assigned_machine_id: selectedMachineId,
        })
        .eq("id", request.id)

      if (requestUpdate.error) {
        throw requestUpdate.error
      }

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

    if (!selectedMachineId) {
      alert("Először válassz gépet a várakozóhoz.")
      return
    }

    const selectedMachine = machines.find((m) => m.id === selectedMachineId)

    if (!selectedMachine) {
      alert("A kiválasztott gép nem található.")
      return
    }

    if (!isMachineReservableForNext(selectedMachine)) {
      alert("Erre a gépre most nem lehet előfoglalást tenni.")
      return
    }

    setReservingRequestId(request.id)

    try {
      const requestUpdate = await supabase
        .from("requests")
        .update({
          status: "lefoglalva",
          assigned_machine_id: selectedMachineId,
        })
        .eq("id", request.id)

      if (requestUpdate.error) {
        throw requestUpdate.error
      }

      if (isMachineImmediatelyAssignable(selectedMachine)) {
        const machineUpdate = await supabase
          .from("machines")
          .update({ status: "Lefoglalt" })
          .eq("id", selectedMachineId)

        if (machineUpdate.error) {
          throw machineUpdate.error
        }
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

    if (!newEndDate) {
      alert("Adj meg új lejárati dátumot.")
      return
    }

    if (!machine.current_customer) {
      alert("Ehhez a géphez nincs aktív bérlő.")
      return
    }

    if (machine.rental_start && newEndDate < machine.rental_start) {
      alert("Az új lejárat nem lehet korábbi, mint a kezdő dátum.")
      return
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

      if (activeRentalQuery.error) {
        throw activeRentalQuery.error
      }

      const activeRental = activeRentalQuery.data?.[0]

      if (!activeRental?.id) {
        throw new Error("Nem található aktív bérlés ehhez a géphez.")
      }

      const rentalUpdate = await supabase
        .from("rentals")
        .update({ end_date: newEndDate })
        .eq("id", activeRental.id)

      if (rentalUpdate.error) {
        throw rentalUpdate.error
      }

      const machineUpdate = await supabase
        .from("machines")
        .update({ rental_end: newEndDate })
        .eq("id", machine.id)

      if (machineUpdate.error) {
        throw machineUpdate.error
      }

      setRentalEndSelections((prev) => ({
        ...prev,
        [machine.id]: newEndDate,
      }))

      await fetchMachines()
      alert("A bérlés lejárata sikeresen módosítva.")
    } catch (error: any) {
      console.error("Hiba lejárat módosítása közben:", error)
      alert(
        getSupabaseErrorMessage(error, "Nem sikerült módosítani a bérlés lejáratát.")
      )
    } finally {
      setUpdatingRentalId(null)
    }
  }

  
async function handleSaveRentalDetails(machine: Machine) {
  const activeRental = activeRentalByMachineId[machine.id]

  if (!activeRental?.id) {
    alert("Ehhez a géphez nincs aktív bérlés.")
    return
  }

  const rawDebtValue =
    rentalDebtSelections[machine.id] !== undefined
      ? rentalDebtSelections[machine.id]
      : String(activeRental.tartozas ?? 0)

  const parsedDebt = Number(rawDebtValue)

  if (Number.isNaN(parsedDebt) || parsedDebt < 0) {
    alert("A tartozás csak 0 vagy pozitív szám lehet.")
    return
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
    const { error } = await supabase
      .from("rentals")
      .update(updatePayload)
      .eq("id", activeRental.id)

    if (error) {
      throw error
    }

    await fetchRentals()
    alert("A bérlés tartozása és visszaszállítása sikeresen frissítve.")
  } catch (error: any) {
    console.error("Hiba a bérlés adatainak frissítésekor:", error)
    alert(
      getSupabaseErrorMessage(
        error,
        "Nem sikerült frissíteni a bérlés tartozását és visszaszállítását."
      )
    )
  } finally {
    setSavingRentalDetailsId(null)
  }
}

async function handleUpdateMachineStatus(machineId: string) {
    const selectedStatus = machineStatusSelections[machineId]

    if (!selectedStatus) {
      alert("Válassz új státuszt.")
      return
    }

    setUpdatingMachineId(machineId)

    try {
      const updatePayload: {
        status: string
        current_customer?: string | null
        rental_start?: string | null
        rental_end?: string | null
      } = {
        status: selectedStatus,
      }

      if (selectedStatus !== "Kiadva" && selectedStatus !== "Lefoglalt") {
        updatePayload.current_customer = null
        updatePayload.rental_start = null
        updatePayload.rental_end = null
      }

      const { error } = await supabase
        .from("machines")
        .update(updatePayload)
        .eq("id", machineId)

      if (error) {
        throw error
      }

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
    const confirmed = window.confirm(
      `Biztosan leveszed a bérlőt erről a gépről: ${machine.name || "ismeretlen gép"}?`
    )
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

      if (activeRentalQuery.error) {
        throw activeRentalQuery.error
      }

      const activeRental = activeRentalQuery.data?.[0]

      if (activeRental?.id) {
        const rentalUpdate = await supabase
          .from("rentals")
          .update({ status: "Lezárt" })
          .eq("id", activeRental.id)

        if (rentalUpdate.error) {
          throw rentalUpdate.error
        }
      }

      const machineUpdate = await supabase
        .from("machines")
        .update({
          status: "Szabad",
          current_customer: null,
          rental_start: null,
          rental_end: null,
        })
        .eq("id", machine.id)

      if (machineUpdate.error) {
        throw machineUpdate.error
      }

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
    const confirmed = window.confirm(
      `Biztosan eltávolítod ezt a bérlőt a rendszerből: ${row.customer.name || "ismeretlen bérlő"}?`
    )
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

      if (activeRentalQuery.error) {
        throw activeRentalQuery.error
      }

      const activeRental = activeRentalQuery.data?.[0]

      if (activeRental?.id) {
        const rentalUpdate = await supabase
          .from("rentals")
          .update({ status: "Lezárt" })
          .eq("id", activeRental.id)

        if (rentalUpdate.error) {
          throw rentalUpdate.error
        }
      }

      const machineUpdate = await supabase
        .from("machines")
        .update({
          status: "Szabad",
          current_customer: null,
          rental_start: null,
          rental_end: null,
        })
        .eq("id", row.machine.id)

      if (machineUpdate.error) {
        throw machineUpdate.error
      }

      const customerDelete = await supabase
        .from("customers")
        .delete()
        .eq("id", row.customer.id)

      if (customerDelete.error) {
        throw customerDelete.error
      }

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
      return machines.filter(
        (m) => isStatus(m, "Kiadva") || isStatus(m, "Lefoglalt")
      )
    }

    if (filter === "szabad") {
      return machines.filter((m) => isStatus(m, "Szabad"))
    }

    if (filter === "tartalék") {
      return machines.filter((m) => isStatus(m, "Tartalék"))
    }

    if (filter === "javítás") {
      return machines.filter((m) => isStatus(m, "Javítás alatt"))
    }

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

  const rentableMachines = useMemo(
    () => machines.filter((m) => isMachineImmediatelyAssignable(m)),
    [machines]
  )

  const reservableMachines = useMemo(
    () => machines.filter((m) => isMachineReservableForNext(m)),
    [machines]
  )

  const activeRentals = useMemo(
    () => rentals.filter((r) => (r.status || "").toLowerCase() === "aktív"),
    [rentals]
  )

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
    () =>
      requests.filter(
        (r) =>
          r.assigned_machine_id &&
          ["lefoglalva", "párosítva"].includes((r.status || "").toLowerCase())
      ),
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

      if (machine && customer) {
        rows.push({
          customer,
          machine,
          rental,
        })
      }
    }

    return rows
  }, [activeRentals, customers, machines])

  const getRowStyle = (m: Machine) => {
    const d = getDaysUntil(m.rental_end)

    if (isStatus(m, "Kiadva") && d !== null && d < 0) {
      return { backgroundColor: "#ffd6d6" }
    }

    if (isStatus(m, "Kiadva") && d !== null && d <= 5) {
      return { backgroundColor: "#fff3cd" }
    }

    if (isStatus(m, "Szabad")) {
      return { backgroundColor: "#d9f8e5" }
    }

    return { backgroundColor: "#ffffff" }
  }

  if (loading) {
    return (
      <main
        style={{
          padding: "32px",
          fontFamily: "sans-serif",
          background: "#f7f8fa",
          minHeight: "100vh",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Betöltés...</h2>
        <p style={{ color: "#555" }}>Adatok szinkronizálása folyamatban.</p>
      </main>
    )
  }

  return (
    <main
      style={{
        padding: "32px",
        fontFamily: "sans-serif",
        background: "#f7f8fa",
        minHeight: "100vh",
      }}
    >
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

      <section style={cardStyle}>
        <button
          onClick={() => setShowAddMachineForm(!showAddMachineForm)}
          style={toggleButtonStyle}
        >
          {showAddMachineForm ? "▼ Bezárás" : "▶ Új gép hozzáadása"}
        </button>

        {showAddMachineForm && (
          <form onSubmit={handleAddMachine} style={{ marginTop: "18px" }}>
            <div style={formGridStyle}>
              <input
                placeholder="Gép neve"
                value={machineForm.name}
                onChange={(e) =>
                  setMachineForm({ ...machineForm, name: e.target.value })
                }
                style={inputStyle}
              />

              <input
                placeholder="Típus"
                value={machineForm.type}
                onChange={(e) =>
                  setMachineForm({ ...machineForm, type: e.target.value })
                }
                style={inputStyle}
              />

              <select
                value={machineForm.status}
                onChange={(e) =>
                  setMachineForm({ ...machineForm, status: e.target.value })
                }
                style={inputStyle}
              >
                <option value="Szabad">Szabad</option>
                <option value="Kiadva">Kiadva</option>
                <option value="Lefoglalt">Lefoglalt</option>
                <option value="Javítás alatt">Javítás alatt</option>
                <option value="Tartalék">Tartalék</option>
              </select>

              <input
                placeholder="Lokáció"
                value={machineForm.location}
                onChange={(e) =>
                  setMachineForm({ ...machineForm, location: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={savingMachine} style={primaryButtonStyle}>
              {savingMachine ? "Mentés..." : "Gép mentése"}
            </button>

            {machineMessage && <span style={msgStyle}>{machineMessage}</span>}
          </form>
        )}
      </section>

      <section style={cardStyle}>
        <button
          onClick={() => setShowAddRentalForm(!showAddRentalForm)}
          style={toggleButtonStyle}
        >
          {showAddRentalForm ? "▼ Bezárás" : "▶ Új bérlés rögzítése"}
        </button>

        {showAddRentalForm && (
          <form onSubmit={handleAddRental} style={{ marginTop: "18px" }}>
            <div style={formGridStyle}>
              <select
                value={rentalForm.machine_id}
                onChange={(e) =>
                  setRentalForm({ ...rentalForm, machine_id: e.target.value })
                }
                style={inputStyle}
              >
                <option value="">Válassz gépet...</option>
                {rentableMachines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.status})
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={rentalForm.customer_id}
                  onChange={(e) =>
                    setRentalForm({ ...rentalForm, customer_id: e.target.value })
                  }
                  style={inputStyle}
                >
                  <option value="">Válassz bérlőt...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city || "nincs város"})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  style={secondaryButtonStyle}
                >
                  +
                </button>
              </div>

              {showNewCustomerForm && (
                <div style={innerFormStyle}>
                  <h4 style={{ marginTop: 0 }}>Új bérlő gyors felvitele</h4>

                  <div style={formGridStyle}>
                    <input
                      placeholder="Név"
                      value={customerForm.name}
                      onChange={(e) =>
                        setCustomerForm({ ...customerForm, name: e.target.value })
                      }
                      style={inputStyle}
                    />

                    <input
                      placeholder="Város"
                      value={customerForm.city}
                      onChange={(e) =>
                        setCustomerForm({ ...customerForm, city: e.target.value })
                      }
                      style={inputStyle}
                    />

                    <input
                      placeholder="Telefon"
                      value={customerForm.phone}
                      onChange={(e) =>
                        setCustomerForm({ ...customerForm, phone: e.target.value })
                      }
                      style={inputStyle}
                    />

                    <input
                      placeholder="Email"
                      value={customerForm.email}
                      onChange={(e) =>
                        setCustomerForm({ ...customerForm, email: e.target.value })
                      }
                      style={inputStyle}
                    />

                    <input
                      placeholder="Cím"
                      value={customerForm.address}
                      onChange={(e) =>
                        setCustomerForm({ ...customerForm, address: e.target.value })
                      }
                      style={inputStyle}
                    />

                    <input
                      placeholder="Megjegyzés"
                      value={customerForm.notes}
                      onChange={(e) =>
                        setCustomerForm({ ...customerForm, notes: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCustomer}
                    disabled={savingCustomer}
                    style={primaryButtonStyle}
                  >
                    {savingCustomer ? "Mentés..." : "Bérlő mentése"}
                  </button>

                  {customerMessage && <div style={{ marginTop: 10 }}>{customerMessage}</div>}
                </div>
              )}

              <input
                type="date"
                value={rentalForm.start_date}
                onChange={(e) =>
                  setRentalForm({ ...rentalForm, start_date: e.target.value })
                }
                style={inputStyle}
              />

              <input
                type="date"
                value={rentalForm.end_date}
                onChange={(e) =>
                  setRentalForm({ ...rentalForm, end_date: e.target.value })
                }
                style={inputStyle}
              />

              <input
                type="number"
                placeholder="Bérleti díj"
                value={rentalForm.berleti_dij}
                onChange={(e) =>
                  setRentalForm({ ...rentalForm, berleti_dij: e.target.value })
                }
                style={inputStyle}
              />

              <input
                type="number"
                placeholder="Fizetett összeg"
                value={rentalForm.fizetett_osszeg}
                onChange={(e) =>
                  setRentalForm({ ...rentalForm, fizetett_osszeg: e.target.value })
                }
                style={inputStyle}
              />

              <select
                value={rentalForm.visszaszallitas_modja}
                onChange={(e) =>
                  setRentalForm({
                    ...rentalForm,
                    visszaszallitas_modja: e.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="Én megyek érte">Én megyek érte</option>
                <option value="Visszahozza">Visszahozza</option>
                <option value="Futár">Futár</option>
              </select>

              <input
                placeholder="Megjegyzés"
                value={rentalForm.notes}
                onChange={(e) =>
                  setRentalForm({ ...rentalForm, notes: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={savingRental} style={primaryButtonStyle}>
              {savingRental ? "Mentés..." : "Bérlés indítása"}
            </button>

            {rentalMessage && <span style={msgStyle}>{rentalMessage}</span>}
          </form>
        )}
      </section>

      <div style={statsGridStyle}>
        <StatCard title="Összes gép" value={stats.total} />
        <StatCard title="Szabad" value={stats.free} color="#16a34a" />
        <StatCard title="Kiadva" value={stats.rented} color="#2563eb" />
        <StatCard title="Lefoglalt" value={stats.reserved} color="#7c3aed" />
        <StatCard
          title="Lejáró / Lejárt"
          value={`${stats.expiringSoon} / ${stats.expired}`}
          color="#dc2626"
        />
        <StatCard title="Kihasználtság" value={`${stats.utilization}%`} />
      </div>

      <section style={{ ...cardStyle, padding: "14px 20px" }}>
        <strong>Kapacitás állapot:</strong> {stats.recommendation}
      </section>

      <section style={cardStyle}>
        <button
          onClick={() => setShowAddRequestForm(!showAddRequestForm)}
          style={toggleButtonStyle}
        >
          {showAddRequestForm ? "▼ Bezárás" : "▶ Új várakozó hozzáadása"}
        </button>

        {showAddRequestForm && (
          <form onSubmit={handleAddRequest} style={{ marginTop: "18px" }}>
            <div style={formGridStyle}>
              <input
                placeholder="Név"
                value={requestForm.name}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, name: e.target.value })
                }
                style={inputStyle}
              />

              <input
                placeholder="Telefon"
                value={requestForm.phone}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, phone: e.target.value })
                }
                style={inputStyle}
              />

              <input
                placeholder="Email"
                value={requestForm.email}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, email: e.target.value })
                }
                style={inputStyle}
              />

              <input
                placeholder="Város"
                value={requestForm.city}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, city: e.target.value })
                }
                style={inputStyle}
              />

              <input
                placeholder="Cím"
                value={requestForm.address}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, address: e.target.value })
                }
                style={inputStyle}
              />

              <input
                type="date"
                value={requestForm.requested_start_date}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    requested_start_date: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <input
                type="number"
                placeholder="Napok száma"
                value={requestForm.requested_duration_days}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    requested_duration_days: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <select
                value={requestForm.status}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, status: e.target.value })
                }
                style={inputStyle}
              >
                <option value="várakozik">várakozik</option>
                <option value="párosítva">párosítva</option>
                <option value="lefoglalva">lefoglalva</option>
                <option value="aktív">aktív</option>
                <option value="visszamondta">visszamondta</option>
              </select>

              <input
                type="number"
                placeholder="Prioritás"
                value={requestForm.priority}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, priority: e.target.value })
                }
                style={inputStyle}
              />

              <input
                placeholder="Megjegyzés"
                value={requestForm.notes}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, notes: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={savingRequest} style={primaryButtonStyle}>
              {savingRequest ? "Mentés..." : "Várakozó mentése"}
            </button>

            {requestMessage && <span style={msgStyle}>{requestMessage}</span>}
          </form>
        )}

        <h2 style={{ marginTop: "20px", marginBottom: "16px" }}>Várólista</h2>

        {requests.length === 0 ? (
          <p style={{ color: "#666", margin: 0 }}>Nincs várakozó a listán.</p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              background: "#fff",
              borderRadius: "12px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#111", color: "#fff" }}>
                  <th style={cellStyle}>Név</th>
                  <th style={cellStyle}>Telefon</th>
                  <th style={cellStyle}>Email</th>
                  <th style={cellStyle}>Város</th>
                  <th style={cellStyle}>Kezdés</th>
                  <th style={cellStyle}>Nap</th>
                  <th style={cellStyle}>Státusz</th>
                  <th style={cellStyle}>Prioritás</th>
                  <th style={cellStyle}>Megjegyzés</th>
                  <th style={cellStyle}>Gép</th>
                  <th style={cellStyle}>Művelet</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td style={cellStyle}>
                      <strong>{r.name || "-"}</strong>
                    </td>
                    <td style={cellStyle}>{r.phone || "-"}</td>
                    <td style={cellStyle}>{r.email || "-"}</td>
                    <td style={cellStyle}>{r.city || "-"}</td>
                    <td style={cellStyle}>{r.requested_start_date || "-"}</td>
                    <td style={cellStyle}>{r.requested_duration_days ?? "-"}</td>
                    <td style={cellStyle}>{r.status || "-"}</td>
                    <td style={cellStyle}>{r.priority ?? "-"}</td>
                    <td style={cellStyle}>{r.notes || "-"}</td>

                    <td style={cellStyle}>
                      {r.status === "aktív" ? (
                        "-"
                      ) : (
                        <select
                          value={requestMachineSelections[r.id] || ""}
                          onChange={(e) =>
                            setRequestMachineSelections((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                          style={inputStyle}
                        >
                          <option value="">Válassz gépet...</option>
                          {reservableMachines.map((m) => {
                            const days = getDaysUntil(m.rental_end)
                            const isSoonIssued =
                              (m.status || "").toLowerCase() === "kiadva" &&
                              days !== null &&
                              days >= 0 &&
                              days <= 4

                            return (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.status}
                                {isSoonIssued ? `, ${days === 0 ? "ma" : `${days} nap`} múlva szabadul` : ""})
                              </option>
                            )
                          })}
                        </select>
                      )}
                    </td>

                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {r.status !== "aktív" && r.status !== "visszamondta" && (
                          <button
                            type="button"
                            onClick={() => handleAssignRequestToMachine(r)}
                            disabled={assigningRequestId === r.id}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid #ddd",
                              background: "#d9f8e5",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            {assigningRequestId === r.id ? "Folyamatban..." : "Gépre ad"}
                          </button>
                        )}

                        {r.status !== "aktív" && r.status !== "visszamondta" && (
                          <button
                            type="button"
                            onClick={() => handleReserveRequestToMachine(r)}
                            disabled={reservingRequestId === r.id}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid #ddd",
                              background: "#eef2ff",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            {reservingRequestId === r.id
                              ? "Folyamatban..."
                              : "Következőnek lefoglal"}
                          </button>
                        )}

                        {r.status !== "visszamondta" && r.status !== "aktív" && (
                          <button
                            type="button"
                            onClick={() => handleMarkRequestCancelled(r.id)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid #ddd",
                              background: "#fff3cd",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            Visszamondta
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(r.id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1px solid #ddd",
                            background: "#ffd6d6",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          Törlés
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>4 napon belül felszabaduló kiadott gépek</h2>

        {soonExpiringIssuedMachines.length === 0 ? (
          <p style={{ color: "#666", margin: 0 }}>Nincs 4 napon belül lejáró kiadott gép.</p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              background: "#fff",
              borderRadius: "12px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#111", color: "#fff" }}>
                  <th style={cellStyle}>Gép</th>
                  <th style={cellStyle}>Aktuális bérlő</th>
                  <th style={cellStyle}>Lejárat</th>
                  <th style={cellStyle}>Nap múlva</th>
                  <th style={cellStyle}>Következő ügyfél</th>
                </tr>
              </thead>
              <tbody>
                {soonExpiringIssuedMachines.map((machine) => {
                  const nextRequest = nextReservedRequestByMachineId[machine.id]
                  const days = getDaysUntil(machine.rental_end)

                  return (
                    <tr key={machine.id}>
                      <td style={cellStyle}>
                        <strong>{machine.name || "-"}</strong>
                      </td>
                      <td style={cellStyle}>{machine.current_customer || "-"}</td>
                      <td style={cellStyle}>{machine.rental_end || "-"}</td>
                      <td style={cellStyle}>
                        {days === null ? "-" : days === 0 ? "Ma" : `${days} nap`}
                      </td>
                      <td style={cellStyle}>
                        {nextRequest ? (
                          <>
                            <strong>{nextRequest.name || "-"}</strong>
                            <br />
                            <small>{nextRequest.status || "-"}</small>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Aktív bérlők listája</h2>

        {activeCustomerRows.length === 0 ? (
          <p style={{ color: "#666", margin: 0 }}>Nincs aktív bérlő.</p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              background: "#fff",
              borderRadius: "12px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#111", color: "#fff" }}>
                  <th style={cellStyle}>Név</th>
                  <th style={cellStyle}>Telefon</th>
                  <th style={cellStyle}>Email</th>
                  <th style={cellStyle}>Város</th>
                  <th style={cellStyle}>Cím</th>
                  <th style={cellStyle}>Gép</th>
                  <th style={cellStyle}>Lejárat</th>
                  <th style={cellStyle}>Visszaszállítás</th>
                  <th style={cellStyle}>Tartozás</th>
                  <th style={cellStyle}>Művelet</th>
                </tr>
              </thead>
              <tbody>
                {activeCustomerRows.map((row) => (
                  <tr key={`${row.customer.id}-${row.machine.id}`}>
                    <td style={cellStyle}>
                      <strong>{row.customer.name || "-"}</strong>
                    </td>
                    <td style={cellStyle}>{row.customer.phone || "-"}</td>
                    <td style={cellStyle}>{row.customer.email || "-"}</td>
                    <td style={cellStyle}>{row.customer.city || "-"}</td>
                    <td style={cellStyle}>{row.customer.address || "-"}</td>
                    <td style={cellStyle}>{row.machine.name || "-"}</td>
                    <td style={cellStyle}>{row.machine.rental_end || "-"}</td>
                    <td style={cellStyle}>
                      {row.rental?.visszaszallitas_modja || "-"}
                    </td>
                    <td
                      style={{
                        ...cellStyle,
                        color: (row.rental?.tartozas || 0) > 0 ? "#dc2626" : "#111",
                        fontWeight: "bold",
                      }}
                    >
                      {row.rental?.tartozas ? `${row.rental.tartozas.toLocaleString("hu-HU")} Ft` : "0 Ft"}
                    </td>
                    <td style={cellStyle}>
                      <button
                        type="button"
                        onClick={() => handleRemoveActiveCustomer(row)}
                        disabled={removingCustomerId === row.customer.id}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          background: "#ffd6d6",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        {removingCustomerId === row.customer.id
                          ? "Folyamatban..."
                          : "Bérlő eltávolítása"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {(
          ["összes", "foglalt", "szabad", "lejáró", "lejárt", "tartalék", "javítás"] as FilterType[]
        ).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...filterButtonStyle,
              background: filter === f ? "#111" : "#fff",
              color: filter === f ? "#fff" : "#111",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div
        style={{
          overflowX: "auto",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#111", color: "#fff" }}>
              <th style={cellStyle}>Név</th>
              <th style={cellStyle}>Státusz</th>
              <th style={cellStyle}>Bérlő / Lokáció</th>
              <th style={cellStyle}>Lejárat</th>
              <th style={cellStyle}>Visszaszállítás</th>
              <th style={cellStyle}>Tartozás</th>
              <th style={cellStyle}>Új visszaszállítás</th>
              <th style={cellStyle}>Új tartozás</th>
              <th style={cellStyle}>Új lejárat</th>
              <th style={cellStyle}>Új státusz</th>
              <th style={cellStyle}>Művelet</th>
            </tr>
          </thead>
          <tbody>
            {filteredMachines.map((m) => (
              <tr key={m.id} style={getRowStyle(m)}>
                <td style={cellStyle}>
                  <strong>{m.name}</strong>
                  <br />
                  <small>{m.type}</small>
                </td>

                <td style={cellStyle}>{m.status}</td>

                <td style={cellStyle}>
                  {m.current_customer || "-"}
                  <br />
                  <small>{m.location || "-"}</small>
                </td>

                <td style={cellStyle}>
                  {m.rental_end || "-"}
                  {m.rental_end && (
                    <>
                      <br />
                      <small style={{ color: "#666" }}>
                        {(() => {
                          const days = getDaysUntil(m.rental_end)
                          if (days === null) return ""
                          if (days < 0) return `${Math.abs(days)} napja lejárt`
                          if (days === 0) return "Ma jár le"
                          return `${days} nap múlva`
                        })()}
                      </small>
                    </>
                  )}
                </td>

                <td style={cellStyle}>
                  {activeRentalByMachineId[m.id]?.visszaszallitas_modja || "-"}
                </td>

                <td
                  style={{
                    ...cellStyle,
                    color: (activeRentalByMachineId[m.id]?.tartozas || 0) > 0 ? "#dc2626" : "#111",
                    fontWeight: activeRentalByMachineId[m.id]?.tartozas ? "bold" : "normal",
                  }}
                >
                  {activeRentalByMachineId[m.id]?.tartozas
                    ? `${activeRentalByMachineId[m.id]!.tartozas!.toLocaleString("hu-HU")} Ft`
                    : "0 Ft"}
                </td>

                <td style={cellStyle}>
                  {activeRentalByMachineId[m.id] ? (
                    <select
                      value={
                        rentalReturnModeSelections[m.id] ??
                        activeRentalByMachineId[m.id]?.visszaszallitas_modja ??
                        "Én megyek érte"
                      }
                      onChange={(e) =>
                        setRentalReturnModeSelections((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="Én megyek érte">Én megyek érte</option>
                      <option value="Visszahozza">Visszahozza</option>
                      <option value="Futár">Futár</option>
                    </select>
                  ) : (
                    "-"
                  )}
                </td>

                <td style={cellStyle}>
                  {activeRentalByMachineId[m.id] ? (
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={
                        rentalDebtSelections[m.id] ??
                        String(activeRentalByMachineId[m.id]?.tartozas ?? 0)
                      }
                      onChange={(e) =>
                        setRentalDebtSelections((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  ) : (
                    "-"
                  )}
                </td>

                <td style={cellStyle}>
                  {m.current_customer ? (
                    <input
                      type="date"
                      value={rentalEndSelections[m.id] ?? m.rental_end ?? ""}
                      onChange={(e) =>
                        setRentalEndSelections((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  ) : (
                    "-"
                  )}
                </td>

                <td style={cellStyle}>
                  <select
                    value={machineStatusSelections[m.id] || ""}
                    onChange={(e) =>
                      setMachineStatusSelections((prev) => ({
                        ...prev,
                        [m.id]: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Válassz...</option>
                    <option value="Szabad">Szabad</option>
                    <option value="Kiadva">Kiadva</option>
                    <option value="Lefoglalt">Lefoglalt</option>
                    <option value="Javítás alatt">Javítás alatt</option>
                    <option value="Tartalék">Tartalék</option>
                  </select>
                </td>

                <td style={cellStyle}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateMachineStatus(m.id)}
                      disabled={updatingMachineId === m.id}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        background: "#eef2ff",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {updatingMachineId === m.id ? "Mentés..." : "Státusz mentése"}
                    </button>

                    {m.current_customer && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRentalEnd(m)}
                        disabled={updatingRentalId === m.id}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          background: "#fff3cd",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        {updatingRentalId === m.id ? "Mentés..." : "Lejárat módosítása"}
                      </button>
                    )}

                    {activeRentalByMachineId[m.id] && (
                      <button
                        type="button"
                        onClick={() => handleSaveRentalDetails(m)}
                        disabled={savingRentalDetailsId === m.id}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          background: "#d9f8e5",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        {savingRentalDetailsId === m.id ? "Mentés..." : "Bérlés adatok mentése"}
                      </button>
                    )}

                    {m.current_customer && (
                      <button
                        type="button"
                        onClick={() => handleReturnMachine(m)}
                        disabled={updatingMachineId === m.id}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          background: "#ffd6d6",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        Bérlő levétele
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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