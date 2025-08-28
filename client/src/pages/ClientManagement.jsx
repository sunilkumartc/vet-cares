"use client"

import React, { useState, useEffect } from "react"
import { format, intervalToDuration } from "date-fns"
import {
  Plus,
  Users,
  Phone,
  Mail,
  PawPrint,
  FileText,
  Syringe,
  CreditCard,
  Calendar,
  Eye,
  Edit,
  X,
  DollarSign,
  StickyNote,
  PlusCircle,
  Activity,
  Heart,
  Weight,
  File,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ApiClient_entity as ApiClient,
  ApiPet,
  ApiMedicalRecord,
  ApiVaccination,
  ApiInvoice,
  ApiMemo,
  ApiProduct,
  ApiProductBatch,
  ApiStockMovement,
  ApiStaff,
  ApiMedicalRecordFollowup,
} from "@/api/apiClient"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import ClientForm from "../components/clients/ClientForm"
import PetForm from "../components/pets/PetForm"
import MedicalRecordForm from "../components/medical-records/MedicalRecordForm"
import VaccinationForm from "../components/vaccinations/VaccinationForm"
import InvoiceForm from "../components/billing/InvoiceForm"
import AddToBillForm from "../components/billing/AddToBillForm"
import TimelineEvent from "../components/clients/TimelineEvent"
import MemoWidget from "../components/memos/MemoWidget"
import MemoForm from "../components/memos/MemoForm"
import VitalTrendChart from "../components/vitals/VitalTrendChart"
import DateRangePicker from "../components/vitals/DateRangePicker"
import MedicalRecordViewer from "../components/customer/MedicalRecordViewer"

const getPreciseAge = (birthDate) => {
  if (!birthDate) return "Unknown age"
  try {
    const duration = intervalToDuration({
      start: new Date(birthDate),
      end: new Date(),
    })

    const parts = []
    if (duration.years > 0) parts.push(`${duration.years}y`)
    if (duration.months > 0) parts.push(`${duration.months}m`)
    if (duration.days > 0) parts.push(`${duration.days}d`)

    if (parts.length === 0) {
      if (duration.seconds >= 0) return "Newborn"
      return "Unknown age"
    }

    return parts.join(" ")
  } catch (e) {
    console.error("Error calculating age:", e)
    return "Invalid date"
  }
}

export default function ClientManagement() {
  const [clients, setClients] = useState([])
  const [pets, setPets] = useState([])
  const [medicalRecords, setMedicalRecords] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [clientInvoices, setClientInvoices] = useState([])
  const [clientMemos, setClientMemos] = useState([])
  const [clientDocuments, setClientDocuments] = useState([])
  const [products, setProducts] = useState([])
  const [staff, setStaff] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState("")
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showAddToBillForm, setShowAddToBillForm] = useState(false)
  const [billingTarget, setBillingTarget] = useState({ client: null, pet: null })
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const clientId = searchParams.get("clientId")
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [selectedClientId, setSelectedClientId] = useState(null)

  // New states for displayed (filtered) data
  const [displayedHistory, setDisplayedHistory] = useState([])
  const [displayedRecords, setDisplayedRecords] = useState([])
  const [displayedVaccinations, setDisplayedVaccinations] = useState([])
  const [displayedInvoices, setDisplayedInvoices] = useState([])
  const [displayedMemos, setDisplayedMemos] = useState([])
  const [displayedDocuments, setDisplayedDocuments] = useState([])

  // Vital trends state
  const [vitalDateRange, setVitalDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [vitalResolution, setVitalResolution] = useState("day")
  const [viewingMedicalRecord, setViewingMedicalRecord] = useState(null)

  // Follow-up modal state
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [activeRecordId, setActiveRecordId] = useState(null)
  const [followupDate, setFollowupDate] = useState("")
  const [followupNotes, setFollowupNotes] = useState("")

  // Product cache for quick lookups
  const productIndex = React.useMemo(() => {
    const m = new Map()
    for (const p of products) {
      if (p.id) m.set(String(p.id), p)
      if (p._id) m.set(String(p._id), p)
      if (p.product_id) m.set(String(p.product_id), p)
    }
    return m
  }, [products])

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find((c) => (c._id || c.id) === clientId)
      if (client) {
        if (!selectedClient || (selectedClient._id || selectedClient.id) !== clientId) {
          setSelectedClient(client)
          setIsFullScreen(true)
        }
      } else {
        setSearchParams({}, { replace: true })
      }
    }
  }, [clients, clientId, selectedClient, setSearchParams])

  useEffect(() => {
    if (selectedClient) {
      loadSelectedClientSpecificData(selectedClient._id || selectedClient.id)
    } else {
      setClientInvoices([])
      setClientMemos([])
      setProducts([])
    }
  }, [selectedClient])

  // Updated useEffect to handle filtering logic
  useEffect(() => {
    if (isFullScreen && selectedClient) {
      const allClientRecords = getClientRecords(selectedClient._id || selectedClient.id)
      const allClientVaccinations = getClientVaccinations(selectedClient._id || selectedClient.id)
      const allClientInvoices = getClientInvoices(selectedClient._id || selectedClient.id)
      const allClientMemos = getClientMemos(selectedClient._id || selectedClient.id)
      const allClientDocuments = getClientDocuments(selectedClient._id || selectedClient.id)
      const allCombinedHistory = getCombinedHistory(selectedClient._id || selectedClient.id)

      setDisplayedRecords(selectedPetId ? allClientRecords.filter((r) => r.pet_id === selectedPetId) : allClientRecords)
      setDisplayedVaccinations(
        selectedPetId ? allClientVaccinations.filter((v) => v.pet_id === selectedPetId) : allClientVaccinations,
      )
      setDisplayedInvoices(
        selectedPetId ? allClientInvoices.filter((i) => i.pet_id === selectedPetId) : allClientInvoices,
      )

      setDisplayedDocuments(
        selectedPetId
          ? allClientDocuments.filter((d) => {
              const docPetId = typeof d.petId === "object" ? d.petId._id : d.petId
              return docPetId === selectedPetId
            })
          : allClientDocuments,
      )

      const filteredMemos = allClientMemos.filter((memo) => {
        if (!selectedPetId) return true
        return memo.pet_id === selectedPetId || memo.pet_id === null
      })
      setDisplayedMemos(filteredMemos)

      const filteredHistory = allCombinedHistory.filter((h) => {
        if (!selectedPetId) return true
        return h.pet_id === selectedPetId || (h.type === "memo" && h.pet_id === null)
      })
      setDisplayedHistory(filteredHistory)
    }
  }, [
    selectedClient,
    selectedPetId,
    medicalRecords,
    vaccinations,
    clientInvoices,
    clientMemos,
    clientDocuments,
    pets,
    isFullScreen,
    refreshKey,
  ])

  const handlePetSelect = (petId) => {
    console.log("[v0] Pet selected:", petId)
    setSelectedPetId(petId)
    loadPetDocuments(petId)
  }

  const loadAllData = async () => {
    try {
      const [clientData, petData, recordData, vaccinationData, staffData] = await Promise.all([
        ApiClient.list("-created_date"),
        ApiPet.list("-created_date"),
        ApiMedicalRecord.list("-visit_date"),
        ApiVaccination.list("-next_due_date"),
        ApiStaff.list("-created_date"),
      ])

      setClients(clientData)
      setPets(petData)
      setMedicalRecords(recordData)
      setVaccinations(vaccinationData)
      setStaff(staffData)
    } catch (error) {
      console.error("Error loading general data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load client-specific data
  const loadSelectedClientSpecificData = async (clientId) => {
    setLoading(true)
    try {
      console.log("[v0] Loading data for client ID:", clientId)

      const [invoiceData, memoData, productData] = await Promise.all([
        ApiInvoice.filter({ client_id: clientId }, "-invoice_date"),
        ApiMemo.filter({ client_id: clientId }, "-created_date"),
        ApiProduct.list(),
      ])

      setClientInvoices(invoiceData)
      setClientMemos(memoData)
      setProducts(productData)
      setClientDocuments([])

      console.log("[v0] Client data loaded, documents will load when pet is selected")
    } catch (error) {
      console.error("Error loading selected client specific data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPetDocuments = async (petId) => {
    if (!petId) {
      setClientDocuments([])
      return
    }

    try {
      console.log("[v0] Loading documents for pet ID:", petId)

      const response = await fetch(`/api/document/petdoc/${petId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Document API response status:", response.status)
      const data = await response.json()
      console.log("[v0] Document API response:", data)

      if (data.success && data.data && data.data.documents) {
        console.log("[v0] Document data array:", data.data.documents)
        setClientDocuments(data.data.documents)
      } else {
        setClientDocuments([])
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      setClientDocuments([])
    }
  }

  const handleFormSubmit = async (formData, formType) => {
    try {
      switch (formType) {
        case "client":
          if (editingRecord) {
            console.log("Updating client with editingRecord:", editingRecord)
            console.log("Client ID being used:", editingRecord._id || editingRecord.id)
            await ApiClient.update(editingRecord._id || editingRecord.id, formData)
          } else {
            await ApiClient.create(formData)
          }
          break
        case "pet":
          if (editingRecord) {
            await ApiPet.update(editingRecord._id || editingRecord.id, formData)
          } else {
            await ApiPet.create({ ...formData, client_id: selectedClient._id || selectedClient.id })
          }
          break
        case "medical":
          if (editingRecord && (editingRecord._id || editingRecord.id)) {
            await ApiMedicalRecord.update(editingRecord._id || editingRecord.id, formData)
          } else {
            await ApiMedicalRecord.create(formData)
          }
          break
        case "vaccination":
          if (editingRecord && (editingRecord._id || editingRecord.id)) {
            await ApiVaccination.update(editingRecord._id || editingRecord.id, formData)
          } else {
            await ApiVaccination.create(formData)
          }
          break
        case "memo":
          if (editingRecord) {
            await ApiMemo.update(editingRecord._id || editingRecord.id, formData)
          } else {
            await ApiMemo.create(formData)
          }
          break
      }

      setShowForm("")
      setEditingRecord(null)

      await loadAllData()

      if (selectedClient) {
        await loadSelectedClientSpecificData(selectedClient._id || selectedClient.id)
      }

      alert(`${formType === "medical" ? "Medical record" : formType} saved successfully!`)
    } catch (error) {
      console.error("Error saving data:", error)
      alert(`Failed to save ${formType}. Please try again.`)
    }
  }

  const handleCreateInvoice = (petId = null) => {
    setEditingInvoice(null)
    setShowInvoiceForm(true)
  }

  const normalizeId = (v) => {
    if (!v) return undefined
    if (typeof v === "string" || typeof v === "number") return String(v)
    if (typeof v === "object") {
      return String(v._id ?? v.id ?? v.product_id ?? v.value ?? "")
    }
    return undefined
  }

  const getProductSafe = async (productId) => {
    try {
      return await ApiProduct.get(productId)
    } catch {
      return null
    }
  }

  const checkStockForInvoice = async (items) => {
    if (!Array.isArray(items) || items.length === 0) return { sufficient: true }
    for (const item of items) {
      const productId = normalizeId(item.product_id || item.product)
      if (!productId) continue
      const cached = productIndex.get(productId)
      const product = cached || (await getProductSafe(productId))
      if (!product) {
        return { sufficient: false, productName: "Unknown Product" }
      }
      if ((Number(product.total_stock) || 0) < (Number(item.quantity) || 0)) {
        return { sufficient: false, productName: product.name }
      }
    }
    return { sufficient: true }
  }

  const deductStockForInvoice = async (invoice, submittedItems) => {
    const staffMember = "Staff"
    const errors = []
    const items = Array.isArray(submittedItems) ? submittedItems : invoice.items || []

    for (const item of items) {
      const productId = normalizeId(item.product_id || item.product)
      const qtyNeeded = Number(item.quantity) || 0
      if (!productId || qtyNeeded <= 0) continue

      const product = productIndex.get(productId) || (await getProductSafe(productId))
      if (!product) {
        errors.push(`Missing product (${productId}).`)
        continue
      }

      let remaining = qtyNeeded
      let batches = []
      try {
        batches = await ApiProductBatch.filter({ product_id: productId, status: "active" }, "expiry_date")
      } catch {
        batches = []
      }

      if (!batches || batches.length === 0) {
        const newStock = Math.max(0, (Number(product.total_stock) || 0) - remaining)
        try {
          await ApiProduct.update(product.id ?? product._id, { total_stock: newStock })
          product.total_stock = newStock
        } catch {
          errors.push(`Stock update failed for ${product.name}`)
        }
        try {
          await ApiStockMovement.create({
            product_id: productId,
            batch_id: null,
            movement_type: "sale",
            quantity: -remaining,
            reference_id: invoice.id ?? invoice._id,
            movement_date: new Date().toISOString(),
            staff_member: staffMember,
            previous_stock: (Number(product.total_stock) || 0) + remaining,
            new_stock: product.total_stock,
          })
        } catch {}
        continue
      }

      for (const batch of batches) {
        if (remaining <= 0) break
        const avail = Number(batch.quantity_on_hand) || 0
        if (avail <= 0) continue
        const take = Math.min(avail, remaining)
        const newBatchQty = avail - take

        try {
          await ApiProductBatch.update(batch.id ?? batch._id, {
            quantity_on_hand: newBatchQty,
            status: newBatchQty === 0 ? "depleted" : batch.status,
          })
        } catch {
          errors.push(`Batch update failed (${batch.batch_id})`)
          continue
        }

        const newProdStock = Math.max(0, (Number(product.total_stock) || 0) - take)
        try {
          await ApiProduct.update(product.id ?? product._id, { total_stock: newProdStock })
          product.total_stock = newProdStock
        } catch {
          errors.push(`Product stock update failed (${product.name})`)
        }

        try {
          await ApiStockMovement.create({
            product_id: productId,
            batch_id: batch.id ?? batch._id,
            movement_type: "sale",
            quantity: -take,
            reference_id: invoice.id ?? invoice._id,
            movement_date: new Date().toISOString(),
            staff_member: staffMember,
            previous_stock: (Number(product.total_stock) || 0) + take,
            new_stock: product.total_stock,
          })
        } catch {}

        remaining -= take
      }

      if (remaining > 0) {
        errors.push(`Not enough stock deducted for ${product.name} (short ${remaining}).`)
      }
    }

    return errors
  }

  const handleInvoiceSubmit = async (invoiceData) => {
    try {
      const isNewInvoice = !editingInvoice
      const wasPaidBefore = editingInvoice?.status === "paid"
      const willBePaid = invoiceData.status === "paid"
      const isBecomingPaid = willBePaid && !wasPaidBefore

      const submittedItems = Array.isArray(invoiceData.items) ? invoiceData.items : editingInvoice?.items || []

      if (isBecomingPaid) {
        const stockCheck = await checkStockForInvoice(submittedItems)
        if (!stockCheck.sufficient) {
          alert(`Insufficient stock for "${stockCheck.productName}". Cannot complete sale.`)
          return
        }
      }

      let savedInvoice
      try {
        if (editingInvoice) {
          savedInvoice = await ApiInvoice.update(editingInvoice._id || editingInvoice.id, invoiceData)
        } else {
          savedInvoice = await ApiInvoice.create(invoiceData)
        }
      } catch (err) {
        console.error("[ClientManagement] Invoice save failed:", err)
        alert("Failed to save invoice. Please try again.")
        return
      }

      if (isBecomingPaid) {
        const stockErrors = await deductStockForInvoice(savedInvoice, submittedItems)
        if (stockErrors.length > 0) {
          alert(`Invoice saved, but inventory updates failed:\n- ${stockErrors.join("\n- ")}`)
        }
      }

      setShowInvoiceForm(false)
      setEditingInvoice(null)
      await loadSelectedClientSpecificData(selectedClient._id || selectedClient.id)
      alert("Invoice saved successfully!")
    } catch (error) {
      console.error("[ClientManagement] Unexpected error:", error)
      alert("Something went wrong. Please try again.")
    }
  }

  const handleAddToBillSubmit = async (itemData) => {
    const { client, pet } = billingTarget
    if (!client || !pet) {
      alert("Error: Client or pet not selected for billing.")
      return
    }

    try {
      if (itemData.product_id) {
        const product = products.find((p) => p.id === itemData.product_id)
        if (!product || product.total_stock < itemData.quantity) {
          alert(
            `Insufficient stock for "${itemData.service || product?.name}". Available: ${product?.total_stock || 0}, Required: ${itemData.quantity}`,
          )
          return
        }
      }

      const allInvoices = clientInvoices
      const today = format(new Date(), "yyyy-MM-dd")

      const draftInvoice = allInvoices.find(
        (inv) =>
          inv.client_id === client.id &&
          inv.status === "draft" &&
          format(new Date(inv.invoice_date), "yyyy-MM-dd") === today,
      )

      const newItem = {
        ...itemData,
        unit_price: Number.parseFloat(itemData.unit_price) || 0,
        quantity: Number.parseFloat(itemData.quantity) || 1,
        total: (Number.parseFloat(itemData.quantity) || 1) * (Number.parseFloat(itemData.unit_price) || 0),
      }

      if (draftInvoice) {
        const updatedItems = [...(draftInvoice.items || []), newItem]
        const subtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0)
        const taxRate = draftInvoice.tax_rate || 8
        const tax = subtotal * (taxRate / 100)
        const total = subtotal + tax

        await ApiInvoice.update(draftInvoice.id, {
          items: updatedItems,
          subtotal: subtotal,
          tax_amount: tax,
          total_amount: total,
        })
      } else {
        const subtotal = newItem.total
        const taxRate = 8
        const tax = subtotal * (taxRate / 100)
        const total = subtotal + tax
        await ApiInvoice.create({
          client_id: client.id,
          pet_id: pet.id,
          invoice_number: `DRAFT-${Date.now()}`,
          invoice_date: today,
          status: "draft",
          items: [newItem],
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: tax,
          total_amount: total,
        })
      }

      setShowAddToBillForm(false)
      setBillingTarget({ client: null, pet: null })
      alert("Charge added to draft invoice successfully!")
      loadSelectedClientSpecificData(selectedClient.id)
    } catch (error) {
      console.error("Error adding to bill:", error)
      alert("Failed to add charge. Please try again. " + error.message)
    }
  }

  const handleAddMedicalRecord = (petId = null) => {
    setEditingRecord(petId ? { pet_id: petId } : null)
    setShowForm("medical")
  }

  const handleAddVaccination = (petId = null) => {
    setEditingRecord(petId ? { pet_id: petId } : null)
    setShowForm("vaccination")
  }

  const handleCancel = () => {
    setShowForm("")
    setEditingRecord(null)
    setShowAddToBillForm(false)
    setShowInvoiceForm(false)
    setEditingInvoice(null)
    setBillingTarget({ client: null, pet: null })
  }

  const handleCloseClient = () => {
    setSelectedClient(null)
    setIsFullScreen(false)
    setSelectedPetId(null)
    navigate(createPageUrl("Dashboard"))
  }

  const handleClientSelect = (client) => {
    setSelectedClient(client)
    setSelectedClientId(client._id || client.id)

    const clientPets = pets.filter((pet) => (pet.client_id || pet.clientId) === (client._id || client.id))
    if (clientPets.length > 0) {
      setSelectedPetId(clientPets[0]._id || clientPets.id)
    } else {
      setSelectedPetId(null)
    }

    setIsFullScreen(true)
    loadSelectedClientSpecificData(client._id || client.id)
  }

  const getClientPets = (clientId) => pets.filter((p) => p.client_id === clientId)
  const getClientRecords = (clientId) => {
    const clientPets = getClientPets(clientId)
    const petIds = clientPets.map((p) => p._id || p.id)
    return medicalRecords.filter((r) => petIds.includes(r.pet_id || r._id))
  }
  const getClientVaccinations = (clientId) => {
    const clientPets = getClientPets(clientId)
    const petIds = clientPets.map((p) => p._id || p.id)
    return vaccinations.filter((v) => petIds.includes(v.pet_id || v._id))
  }
  const getClientInvoices = (clientId) => clientInvoices.filter((i) => i.client_id === clientId)
  const getClientMemos = (clientId) => {
    const clientPets = getClientPets(clientId)
    const petIds = clientPets.map((p) => p._id || p.id)
    return clientMemos.filter(
      (m) => (m.client_id === clientId || (m.pet_id && petIds.includes(m.pet_id || m._id))) && m.is_active !== false,
    )
  }

  const getCombinedHistory = (clientId) => {
    const records = getClientRecords(clientId).map((r) => ({ ...r, type: "medical", date: r.visit_date }))
    const vaccines = getClientVaccinations(clientId).map((v) => ({ ...v, type: "vaccine", date: v.date_administered }))
    const clientMemos = getClientMemos(clientId).map((m) => ({ ...m, type: "memo", date: m.created_date }))

    return [...records, ...vaccines, ...clientMemos].sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  const getClientDocuments = (clientId) => {
    const filtered = clientDocuments.filter((doc) => {
      console.log(
        "[v0] Checking document in getClientDocuments:",
        doc._id,
        "client_id:",
        doc.client_id,
        "status:",
        doc.status,
        "isActive:",
        doc.isActive,
      )
      const docClientId = typeof doc.client_id === "object" ? doc.client_id._id : doc.client_id
      return docClientId === clientId && doc.status === "active" && doc.isActive
    })
    console.log("[v0] getClientDocuments result:", filtered)
    return filtered
  }

  useEffect(() => {
    if (selectedClient && selectedClient.pets && selectedClient.pets.length > 0) {
      const firstPetId = selectedClient.pets[0]._id
      console.log("[v0] Auto-selecting first pet:", firstPetId)
      setSelectedPetId(firstPetId)
      loadPetDocuments(firstPetId)
    }
  }, [selectedClient])

  // Follow-up logic
  const openFollowupModal = (recordId) => {
    setActiveRecordId(recordId)
    setFollowupDate("")
    setFollowupNotes("")
    setShowFollowupModal(true)
  }
  const closeFollowupModal = () => {
    setShowFollowupModal(false)
    setActiveRecordId(null)
    setFollowupDate("")
    setFollowupNotes("")
  }
  const handleFollowupSubmit = async (e) => {
    e.preventDefault()
    if (!followupDate) return
    try {
      await ApiMedicalRecordFollowup.add(activeRecordId, {
        date: followupDate,
        notes: followupNotes,
      })
      const updatedRecord = await ApiMedicalRecord.get(activeRecordId)
      setMedicalRecords((prev) =>
        prev.map((r) => (r.id === activeRecordId ? { ...r, followups: updatedRecord.followups || [] } : r)),
      )
      setRefreshKey((k) => k + 1)
      closeFollowupModal()
    } catch (error) {
      alert("Failed to add follow-up. Please try again.")
    }
  }

  if (clientId && !selectedClient) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="flex items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-lg text-gray-600">Loading client details...</p>
        </div>
      </div>
    )
  }

  if (showForm) {
    const veterinarians = staff.filter((s) => s.role === "veterinarian" && s.status === "active")
    const forms = {
      client: (
        <ClientForm
          client={editingRecord}
          onSubmit={(data) => handleFormSubmit(data, "client")}
          onCancel={handleCancel}
        />
      ),
      pet: (
        <PetForm
          pet={editingRecord}
          clients={selectedClient ? [selectedClient] : clients}
          onSubmit={(data) => handleFormSubmit(data, "pet")}
          onCancel={handleCancel}
        />
      ),
      medical: (
        <MedicalRecordForm
          record={editingRecord}
          pets={getClientPets(selectedClient?._id || selectedClient?.id)}
          clients={selectedClient ? [selectedClient] : clients}
          veterinarians={veterinarians}
          onSubmit={(data) => handleFormSubmit(data, "medical")}
          onCancel={handleCancel}
        />
      ),
      vaccination: (
        <VaccinationForm
          vaccination={editingRecord}
          pets={getClientPets(selectedClient?._id || selectedClient?.id)}
          clients={selectedClient ? [selectedClient] : clients}
          veterinarians={veterinarians}
          onSubmit={(data) => handleFormSubmit(data, "vaccination")}
          onCancel={handleCancel}
        />
      ),
      memo: (
        <MemoForm
          memo={editingRecord}
          client={selectedClient}
          onSubmit={(data) => handleFormSubmit(data, "memo")}
          onCancel={handleCancel}
        />
      ),
    }
    return <div className={isFullScreen ? "fixed inset-0 bg-white z-40 overflow-auto" : ""}>{forms[showForm]}</div>
  }

  if (showInvoiceForm) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
        <div className="w-full max-w-7xl max-h-full overflow-y-auto">
          <InvoiceForm
            invoice={editingInvoice}
            clients={selectedClient ? [selectedClient] : []}
            pets={getClientPets(selectedClient?._id || selectedClient?.id)}
            products={products}
            onSubmit={handleInvoiceSubmit}
            onCancel={handleCancel}
          />
        </div>
      </div>
    )
  }

  if (showAddToBillForm) {
    return (
      <AddToBillForm
        client={billingTarget.client}
        pet={billingTarget.pet}
        products={products}
        onSubmit={handleAddToBillSubmit}
        onCancel={handleCancel}
      />
    )
  }

  if (isFullScreen && selectedClient) {
    const clientPets = getClientPets(selectedClient._id || selectedClient.id)
    const selectedClientId = selectedClient._id || selectedClient.id

    return (
      <div className="fixed inset-0 bg-white z-40 flex">
        <div className="flex-1 flex flex-col">
          {/* Top Header - Client Info Bar */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleCloseClient} className="text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </h1>
                    <div className="flex items-center gap-4 text-white/90 text-sm">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {selectedClient.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {selectedClient.email}
                      </div>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {clientPets.length} pets
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm("client")
                    setEditingRecord(selectedClient)
                  }}
                  className="bg-purple-500/80 text-white border-purple-300/50 hover:bg-purple-500/100 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Client
                </Button>
              </div>
            </div>
          </div>

          {/* Pet Cards Section */}
          <div className="bg-gray-100 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientPets.map((pet) => {
                const petRecords = getClientRecords(selectedClient._id || selectedClient.id).filter(
                  (r) => (r.pet_id || r._id) === (pet._id || pet.id),
                )
                const recentRecord = petRecords.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0]
                const petVaccinations = getClientVaccinations(selectedClient._id || selectedClient.id).filter(
                  (v) => (v.pet_id || v._id) === (pet._id || pet.id),
                )
                const overdueVaccinations = petVaccinations.filter((v) => new Date(v.next_due_date) < new Date())

                return (
                  <Card
                    key={pet._id || pet.id}
                    onClick={() => handlePetSelect(pet._id || pet.id)}
                    className={`cursor-pointer transition-all duration-300 border rounded-md px-2 py-1 ${
                      selectedPetId === (pet._id || pet.id)
                        ? "border-blue-500 shadow bg-blue-50"
                        : "hover:border-blue-300 bg-white"
                    }`}
                  >
                    <CardHeader className="p-0 mb-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                            {pet.photo_url ? (
                              <img
                                src={pet.photo_url || "/placeholder.svg"}
                                alt={pet.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <PawPrint className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="leading-tight">
                            {pet.pet_id && (
                              <div className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1 py-[1px] rounded mb-[2px] w-fit">
                                ID: {pet.pet_id}
                              </div>
                            )}
                            <CardTitle className="text-sm font-semibold text-gray-900">{pet.name}</CardTitle>
                            <div className="text-[11px] text-gray-600 capitalize">
                              {pet.species} • {pet.breed || "Mixed"}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowForm("pet")
                              setEditingRecord(pet)
                            }}
                            className="w-6 h-6 p-1"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddMedicalRecord(pet.id)
                            }}
                            className="w-6 h-6 p-1 text-blue-600"
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddVaccination(pet.id)
                            }}
                            className="w-6 h-6 p-1 text-purple-600"
                          >
                            <Syringe className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setBillingTarget({ client: selectedClient, pet: pet })
                              setShowAddToBillForm(true)
                            }}
                            className="w-6 h-6 p-1 text-green-600"
                          >
                            <DollarSign className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <div className="grid grid-cols-3 text-[11px] text-gray-700 mt-1 gap-y-0.5">
                        {pet.birth_date && (
                          <>
                            <span className="text-gray-400">Age:</span>
                            <span className="col-span-2">{getPreciseAge(pet.birth_date)}</span>
                          </>
                        )}
                        {pet.weight && (
                          <>
                            <span className="text-gray-400">Weight:</span>
                            <span className="col-span-2">{pet.weight} kg</span>
                          </>
                        )}
                        {recentRecord && (
                          <>
                            <span className="text-gray-400">Last Visit:</span>
                            <span className="col-span-2">
                              {format(new Date(recentRecord.visit_date), "dd-MM-yyyy")}
                            </span>
                          </>
                        )}
                        {overdueVaccinations.length > 0 && (
                          <div className="col-span-3 mt-1">
                            <Badge variant="destructive" className="text-[10px] py-0.5 px-2 w-fit">
                              {overdueVaccinations.length} Overdue Vaccine{overdueVaccinations.length > 1 ? "s" : ""}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              
              {/* Add New Pet Card */}
              <Card
                className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedPetId(null)
                  setShowForm("pet")
                  setEditingRecord(null)
                }}
              >
                <CardContent className="flex flex-col items-center justify-center h-full text-gray-500 hover:text-blue-600">
                  <Plus className="w-8 h-8 mb-2" />
                  <span className="font-medium">Add New Pet</span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="bg-white border-b px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => handleAddMedicalRecord()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="w-4 h-4 mr-1" />
                Medical Record
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddVaccination()}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Syringe className="w-4 h-4 mr-1" />
                Vaccination
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  handleCreateInvoice()
                }}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Create Bill
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingRecord(null)
                  setShowForm("memo")
                }}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <StickyNote className="w-4 h-4 mr-1" />
                Add Memo
              </Button>
            </div>
          </div>

          {/* Main Content Area with Tabs */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-6">
              <Tabs defaultValue="history" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="history">Timeline ({displayedHistory.length})</TabsTrigger>
                  <TabsTrigger value="records">Medical Records ({displayedRecords.length})</TabsTrigger>
                  <TabsTrigger value="vaccines">Vaccinations ({displayedVaccinations.length})</TabsTrigger>
                  <TabsTrigger value="billing">Billing ({displayedInvoices.length})</TabsTrigger>
                  <TabsTrigger value="memos">Internal Memos ({displayedMemos.length})</TabsTrigger>
                  <TabsTrigger value="vitals" disabled={!selectedPetId}>
                    <Activity className="w-4 h-4 mr-2" />
                    Vital Trends
                  </TabsTrigger>
                  <TabsTrigger value="documents">
                    <File className="w-4 h-4 mr-2" />
                    Documents ({displayedDocuments.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="mt-6">
                  {displayedHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>
                        No history found{" "}
                        {selectedPetId ? `for ${pets.find((p) => p.id === selectedPetId)?.name}` : "for this client"}.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {displayedHistory.map((event) => {
                        const pet = pets.find((p) => p.id === event.pet_id)

                        if (event.type === "medical") {
                          let nextFollowup = null
                          if (Array.isArray(event.followups) && event.followups.length > 0) {
                            nextFollowup = event.followups.reduce((soonest, curr) => {
                              if (!soonest) return curr
                              return new Date(curr.date) < new Date(soonest.date) ? curr : soonest
                            }, null)
                          }
                          return (
                            <TimelineEvent
                              key={`hist-med-${event.id}`}
                              date={event.date}
                              icon={FileText}
                              color="blue"
                              title={`Medical Visit for ${pet?.name}`}
                            >
                              <div>
                                <h4 className="font-semibold mb-1">Subjective</h4>
                                <p className="text-sm text-gray-600">{event.subjective}</p>
                              </div>
                              <div className="mt-2">
                                <h4 className="font-semibold mb-1">Assessment</h4>
                                <p className="text-sm text-gray-600">{event.assessment}</p>
                              </div>
                              <div className="mt-2">
                                <h4 className="font-semibold mb-1">Plan</h4>
                                <p className="text-sm text-gray-600">{event.plan}</p>
                              </div>
                              <div className="mt-4 flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setViewingMedicalRecord(event)}>
                                  View & Print Prescription
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openFollowupModal(event.id)}>
                                  <PlusCircle className="w-4 h-4 mr-1" /> Add Follow-up
                                </Button>
                              </div>
                              {(!Array.isArray(event.followups) || event.followups.length === 0) && (
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-2 mt-3 mb-2 w-fit">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium text-blue-800">Next Follow-up:</span>
                                  <span className="text-blue-700 font-semibold">Not scheduled</span>
                                </div>
                              )}
                              {Array.isArray(event.followups) && event.followups.length > 0 && (
                                <div className="pl-4 mt-2 border-l-2 border-blue-200 space-y-2">
                                  {event.followups.map((fu) => (
                                    <div key={fu.id} className="bg-blue-50 rounded p-3">
                                      <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                        <Calendar className="w-3 h-3" /> {format(new Date(fu.date), "dd MMM yyyy")}
                                      </div>
                                      <div className="text-sm text-gray-700 mt-1">{fu.notes}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TimelineEvent>
                          )
                        }

                        if (event.type === "vaccine") {
                          const isOverdue = new Date(event.next_due_date) < new Date()
                          return (
                            <TimelineEvent
                              key={`hist-vac-${event.id}`}
                              date={event.date}
                              icon={Syringe}
                              color="purple"
                              title={`Vaccination for ${pet?.name}`}
                            >
                              <p className="font-medium">{event.vaccine_name}</p>
                              <p className={`text-sm ${isOverdue ? "text-red-600 font-bold" : "text-gray-600"}`}>
                                Next due on {format(new Date(event.next_due_date), "MMM d, yyyy")}
                                {isOverdue && " (Overdue)"}
                              </p>
                            </TimelineEvent>
                          )
                        }

                        if (event.type === "memo") {
                          const categoryColors = {
                            behavioral: "red",
                            medical_preference: "blue",
                            payment: "orange",
                            appointment_preference: "green",
                            handling: "purple",
                            owner_preference: "cyan",
                            clinic_workflow: "yellow",
                            general: "gray",
                          }

                          const memoColor = categoryColors[event.category] || "gray"
                          const petName = pet ? ` for ${pet.name}` : ""
                          const isUrgent = event.priority === "urgent"

                          return (
                            <TimelineEvent
                              key={`hist-memo-${event.id}`}
                              date={event.date}
                              icon={StickyNote}
                              color={memoColor}
                              title={`Internal Memo${petName}`}
                              badgeText={isUrgent ? "URGENT" : null}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={`text-xs ${
                                      event.category === "behavioral"
                                        ? "bg-red-100 text-red-800"
                                        : event.category === "medical_preference"
                                          ? "bg-blue-100 text-blue-800"
                                          : event.category === "payment"
                                            ? "bg-orange-100 text-orange-800"
                                            : event.category === "appointment_preference"
                                              ? "bg-green-100 text-green-800"
                                              : event.category === "handling"
                                                ? "bg-purple-100 text-purple-800"
                                                : event.category === "owner_preference"
                                                  ? "bg-cyan-100 text-cyan-800"
                                                  : event.category === "clinic_workflow"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {event.category
                                      .replace("_", " ")
                                      .split(" ")
                                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                      .join(" ")}
                                  </Badge>
                                  {event.priority === "urgent" && (
                                    <Badge className="bg-red-100 text-red-700 text-xs">URGENT</Badge>
                                  )}
                                </div>
                                <h4 className="font-semibold text-gray-900">{event.title}</h4>
                                <p className="text-sm text-gray-600">{event.content}</p>
                                {event.tags && event.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {event.tags.map((tag, tagIndex) => (
                                      <Badge key={tagIndex} variant="outline" className="text-xs">
                                        #{tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-2">
                                  Created by: {event.author}
                                  {event.expires_on && (
                                    <span className="ml-3">
                                      Expires: {format(new Date(event.expires_on), "MMM d, yyyy")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TimelineEvent>
                          )
                        }

                        return null
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="records" className="space-y-4 mt-6">
                  {displayedRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No medical records found</p>
                    </div>
                  ) : (
                    displayedRecords.map((record) => {
                      const pet = pets.find((p) => p.id === record.pet_id)
                      return (
                        <Card key={record.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <FileText className="w-8 h-8 text-green-500 mt-1" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{pet?.name}</h3>
                                    <Badge variant="outline">
                                      {format(new Date(record.visit_date), "MMM d, yyyy")}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-900">{record.subjective}</p>
                                  {record.assessment && (
                                    <p className="text-sm text-gray-600">
                                      <strong>Diagnosis:</strong> {record.assessment}
                                    </p>
                                  )}
                                  {record.plan && (
                                    <p className="text-sm text-gray-600">
                                      <strong>Treatment:</strong> {record.plan}
                                    </p>
                                  )}
                                  {record.veterinarian && (
                                    <p className="text-xs text-gray-500">By: {record.veterinarian}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowForm("medical")
                                  setEditingRecord(record)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </TabsContent>

                <TabsContent value="vaccines" className="space-y-4 mt-6">
                  {displayedVaccinations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Syringe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No vaccination records found</p>
                    </div>
                  ) : (
                    displayedVaccinations.map((vaccine) => {
                      const pet = pets.find((p) => p.id === vaccine.pet_id)
                      const isOverdue = new Date(vaccine.next_due_date) < new Date()
                      return (
                        <Card key={vaccine.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <Syringe className={`w-8 h-8 mt-1 ${isOverdue ? "text-red-500" : "text-purple-500"}`} />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{pet?.name}</h3>
                                    <Badge
                                      className={
                                        isOverdue ? "bg-red-100 text-red-800" : "bg-purple-100 text-purple-800"
                                      }
                                    >
                                      {vaccine.vaccine_name}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    <strong>Given:</strong> {format(new Date(vaccine.date_administered), "MMM d, yyyy")}
                                  </p>
                                  <p className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                                    <strong>Due:</strong> {format(new Date(vaccine.next_due_date), "MMM d, yyyy")}
                                    {isOverdue && " (Overdue)"}
                                  </p>
                                  {vaccine.veterinarian && (
                                    <p className="text-xs text-gray-500">By: {vaccine.veterinarian}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowForm("vaccination")
                                  setEditingRecord(vaccine)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </TabsContent>

                <TabsContent value="billing" className="space-y-4 mt-6">
                  {displayedInvoices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No billing records found</p>
                    </div>
                  ) : (
                    displayedInvoices.map((invoice) => {
                      const pet = pets.find((p) => p.id === invoice.pet_id)
                      const statusColors = {
                        draft: "bg-gray-100 text-gray-800",
                        sent: "bg-blue-100 text-blue-800",
                        paid: "bg-green-100 text-green-800",
                        overdue: "bg-red-100 text-red-800",
                        cancelled: "bg-gray-100 text-gray-800",
                      }
                      return (
                        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <CreditCard className="w-8 h-8 text-orange-500 mt-1" />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">#{invoice.invoice_number}</h3>
                                    <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
                                  </div>
                                  <p className="text-gray-900">₹{invoice.total_amount?.toFixed(2)}</p>
                                  <p className="text-sm text-gray-600">
                                    {pet?.name} • {format(new Date(invoice.invoice_date), "MMM d, yyyy")}
                                  </p>
                                  {invoice.due_date && (
                                    <p className="text-sm text-gray-600">
                                      Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link to={createPageUrl(`InvoiceDetails?id=${invoice.id}`)}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingInvoice(invoice)
                                    setShowInvoiceForm(true)
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </TabsContent>

                <TabsContent value="memos" className="mt-6">
                  <MemoWidget
                    clientId={selectedClient.id}
                    client={selectedClient}
                    memoData={displayedMemos}
                    setMemoData={setClientMemos}
                    showHeader={false}
                  />
                </TabsContent>

                <TabsContent value="vitals" className="mt-6">
                  {!selectedPetId ? (
                    <div className="text-center py-12 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Select a pet to view vital trends</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Vital Trends for {pets.find((p) => p.id === selectedPetId)?.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Track weight, blood pressure, heart rate, and temperature over time
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <select
                            value={vitalResolution}
                            onChange={(e) => setVitalResolution(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="day">Daily</option>
                            <option value="week">Weekly</option>
                            <option value="month">Monthly</option>
                          </select>
                          <DateRangePicker dateRange={vitalDateRange} onDateRangeChange={setVitalDateRange} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Weight className="w-5 h-5 text-blue-500" />
                              Weight Trend
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <VitalTrendChart
                              metric="weight"
                              unitLabel="kg"
                              color="#3B82F6"
                              petId={selectedPetId}
                              title="Weight"
                              dateRange={vitalDateRange}
                              resolution={vitalResolution}
                            />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Activity className="w-5 h-5 text-green-500" />
                              Blood Pressure
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <VitalTrendChart
                              metric="blood_pressure"
                              unitLabel="mmHg"
                              color="#10B981"
                              petId={selectedPetId}
                              title="Blood Pressure"
                              dateRange={vitalDateRange}
                              resolution={vitalResolution}
                            />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Heart className="w-5 h-5 text-red-500" />
                              Heart Rate
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <VitalTrendChart
                              metric="heart_rate"
                              unitLabel="bpm"
                              color="#EF4444"
                              petId={selectedPetId}
                              title="Heart Rate"
                              dateRange={vitalDateRange}
                              resolution={vitalResolution}
                            />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Activity className="w-5 h-5 text-orange-500" />
                              Temperature
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <VitalTrendChart
                              metric="temperature"
                              unitLabel="°C"
                              color="#F97316"
                              petId={selectedPetId}
                              title="Temperature"
                              dateRange={vitalDateRange}
                              resolution={vitalResolution}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="space-y-4 mt-6">
                  {console.log(
                    "[v0] Displaying documents, count:",
                    displayedDocuments.length,
                    "documents:",
                    displayedDocuments,
                  )}
                  {displayedDocuments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <File className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>
                        No documents found{" "}
                        {selectedPetId ? `for ${pets.find((p) => p.id === selectedPetId)?.name}` : "for this client"}.
                      </p>
                      <p className="text-xs mt-2">
                        Debug: Client ID: {selectedClientId}, Pet ID: {selectedPetId}, Total docs:{" "}
                        {clientDocuments.length}
                      </p>
                    </div>
                  ) : (
                    displayedDocuments.map((document) => {
                      const pet =
                        pets.find(
                          (p) => p.id === (typeof document.petId === "object" ? document.petId._id : document.petId),
                        ) || (typeof document.petId === "object" ? document.petId : null)
                      const getDocumentTypeColor = (type) => {
                        switch (type) {
                          case "medical":
                          case "medical_report":
                            return "bg-blue-100 text-blue-800"
                          case "vaccination":
                            return "bg-purple-100 text-purple-800"
                          case "insurance":
                            return "bg-green-100 text-green-800"
                          case "other":
                            return "bg-gray-100 text-gray-800"
                          default:
                            return "bg-gray-100 text-gray-800"
                        }
                      }

                      const formatFileSize = (bytes) => {
                        if (bytes === 0) return "0 Bytes"
                        const k = 1024
                        const sizes = ["Bytes", "KB", "MB", "GB"]
                        const i = Math.floor(Math.log(bytes) / Math.log(k))
                        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
                      }

                      const getFileIcon = (mimeType) => {
                        if (mimeType?.startsWith("image/")) return "🖼️"
                        if (mimeType?.startsWith("video/")) return "🎥"
                        if (mimeType?.includes("pdf")) return "📄"
                        if (mimeType?.includes("word")) return "📝"
                        if (mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) return "📊"
                        return "📎"
                      }

                      return (
                        <Card key={document._id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="text-2xl mt-1">
                                  {document.file?.mimeType ? getFileIcon(document.file.mimeType) : "📎"}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{document.title}</h3>
                                    <Badge className={getDocumentTypeColor(document.type)}>{document.type}</Badge>
                                    {document.version > 1 && <Badge variant="outline">v{document.version}</Badge>}
                                  </div>
                                  {pet && (
                                    <p className="text-sm text-gray-600">
                                      <strong>Pet:</strong> {typeof pet === "object" ? pet.name : pet}
                                    </p>
                                  )}
                                  {document.description && (
                                    <p className="text-sm text-gray-600">{document.description}</p>
                                  )}
                                  {document.file && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                      <p>
                                        <strong>File:</strong> {document.file.originalName}
                                      </p>
                                      <p>
                                        <strong>Size:</strong>{" "}
                                        {document.fileSizeFormatted || formatFileSize(document.file.size)}
                                      </p>
                                      <p>
                                        <strong>Type:</strong> {document.file.mimeType}
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    Created:{" "}
                                    {document.createdAt
                                      ? format(new Date(document.createdAt), "MMM d, yyyy")
                                      : "Unknown"}
                                    {document.age && ` (${document.age})`}
                                  </p>
                                  {document.updatedAt !== document.createdAt && (
                                    <p className="text-xs text-gray-500">
                                      Updated:{" "}
                                      {document.updatedAt
                                        ? format(new Date(document.updatedAt), "MMM d, yyyy")
                                        : "Unknown"}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (document.file && document.file.url) {
                                      window.open(document.file.url, "_blank")
                                    } else {
                                      console.warn("No file URL available for document:", document._id)
                                    }
                                  }}
                                  disabled={!document.file?.url}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Medical Record Viewer Modal */}
        <Dialog open={!!viewingMedicalRecord} onOpenChange={() => setViewingMedicalRecord(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Medical Record Viewer</DialogTitle>
            </DialogHeader>
            {viewingMedicalRecord && (
              <MedicalRecordViewer record={viewingMedicalRecord} onClose={() => setViewingMedicalRecord(null)} />
            )}
          </DialogContent>
        </Dialog>

        {/* Follow-up Modal */}
        <Dialog open={showFollowupModal} onOpenChange={closeFollowupModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Follow-up</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFollowupSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="followupDate" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={followupDate ? undefined : "text-muted-foreground"}>
                      {followupDate ? format(new Date(followupDate), "PPP") : <span>Pick a date</span>}
                      <CalendarPicker className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={followupDate ? new Date(followupDate) : undefined}
                      onSelect={(date) => setFollowupDate(date?.toISOString())}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label htmlFor="followupNotes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <Textarea
                  id="followupNotes"
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="Enter notes about the follow-up"
                />
              </div>
              <DialogFooter>
                <Button type="submit">Add Follow-up</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Client Management</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading clients...</div>
          ) : (
            <>
              {clients.length === 0 ? (
                <div>No clients found.</div>
              ) : (
                <ul>
                  {clients.map((client) => (
                    <li key={client._id || client.id}>
                      <Link to={createPageUrl(`ClientManagement?clientId=${client._id || client.id}`)}>
                        {client.first_name} {client.last_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Button onClick={() => setShowForm("client")} className="mt-4">
                Add Client
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
