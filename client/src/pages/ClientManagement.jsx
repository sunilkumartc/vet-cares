import React, { useState, useEffect } from "react";
import { format, differenceInYears, addDays, intervalToDuration } from "date-fns";
import { Plus, Search, Users, Phone, Mail, MapPin, PawPrint, FileText, Syringe, CreditCard, Calendar, Eye, Edit, ArrowRight, X, Maximize2, Menu, DollarSign, StickyNote, PlusCircle, Activity, Heart, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiClient_entity as ApiClient, ApiPet, ApiMedicalRecord, ApiVaccination, ApiInvoice, ApiMemo, ApiProduct, ApiProductBatch, ApiStockMovement, ApiStaff } from "@/api/apiClient";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ClientForm from "../components/clients/ClientForm";
import PetForm from "../components/pets/PetForm";
import MedicalRecordForm from "../components/medical-records/MedicalRecordForm";
import VaccinationForm from "../components/vaccinations/VaccinationForm";
import InvoiceForm from "../components/billing/InvoiceForm";
import AddToBillForm from "../components/billing/AddToBillForm";
import TimelineEvent from '../components/clients/TimelineEvent';
import MemoWidget from "../components/memos/MemoWidget";
import MemoForm from "../components/memos/MemoForm";
import VitalTrendChart from "../components/vitals/VitalTrendChart";
import DateRangePicker from "../components/vitals/DateRangePicker";
import MedicalRecordViewer from '../components/customer/MedicalRecordViewer';

const getPreciseAge = (birthDate) => {
  if (!birthDate) return 'Unknown age';
  try {
    const duration = intervalToDuration({
      start: new Date(birthDate),
      end: new Date()
    });

    const parts = [];
    if (duration.years > 0) parts.push(`${duration.years}y`);
    if (duration.months > 0) parts.push(`${duration.months}m`);
    if (duration.days > 0) parts.push(`${duration.days}d`);
    
    if (parts.length === 0) {
        if (duration.seconds >= 0) return "Newborn"; // Handle very fresh birthdates
        return "Unknown age"; // Fallback for invalid calculations resulting in no parts
    }

    return parts.join(' ');
  } catch (e) {
    console.error("Error calculating age:", e);
    return 'Invalid date';
  }
};

export default function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [pets, setPets] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [clientInvoices, setClientInvoices] = useState([]); // State for invoices of the selected client
  const [clientMemos, setClientMemos] = useState([]); // State for memos of the selected client
  const [products, setProducts] = useState([]); // State for products (inventory)
  const [staff, setStaff] = useState([]); // Added staff state
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState('');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false); // New state for InvoiceForm modal
  const [editingInvoice, setEditingInvoice] = useState(null); // New state for invoice being edited/created
  const [editingRecord, setEditingRecord] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAddToBillForm, setShowAddToBillForm] = useState(false);
  const [billingTarget, setBillingTarget] = useState({ client: null, pet: null });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = searchParams.get('clientId');
  const [selectedPetId, setSelectedPetId] = useState(null);

  // New states for displayed (filtered) data
  const [displayedHistory, setDisplayedHistory] = useState([]);
  const [displayedRecords, setDisplayedRecords] = useState([]);
  const [displayedVaccinations, setDisplayedVaccinations] = useState([]);
  const [displayedInvoices, setDisplayedInvoices] = useState([]);
  const [displayedMemos, setDisplayedMemos] = useState([]);
  
  // Vital trends state
  const [vitalDateRange, setVitalDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [vitalResolution, setVitalResolution] = useState('day');
  const [viewingMedicalRecord, setViewingMedicalRecord] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    // Auto-select client when data loads and clientId is in URL
    if (clientId && clients.length > 0) {
      const client = clients.find(c => (c._id || c.id) === clientId);
      if (client) {
        if (!selectedClient || (selectedClient._id || selectedClient.id) !== clientId) {
            setSelectedClient(client);
            setIsFullScreen(true);
        }
      } else {
        // If client ID from URL is not found, clear it to avoid being stuck.
        setSearchParams({}, { replace: true });
      }
    }
  }, [clients, clientId, selectedClient, setSearchParams]);

  useEffect(() => {
    if (selectedClient) {
      loadSelectedClientSpecificData(selectedClient._id || selectedClient.id);
    } else {
      // Clear client-specific data when no client is selected or full-screen view is closed
      setClientInvoices([]);
      setClientMemos([]);
      setProducts([]);
    }
  }, [selectedClient]);

  // New useEffect to handle all filtering logic
  useEffect(() => {
    if (isFullScreen && selectedClient) {
      const allClientRecords = getClientRecords(selectedClient._id || selectedClient.id);
      const allClientVaccinations = getClientVaccinations(selectedClient._id || selectedClient.id);
      const allClientInvoices = getClientInvoices(selectedClient._id || selectedClient.id);
      const allClientMemos = getClientMemos(selectedClient._id || selectedClient.id);
      const allCombinedHistory = getCombinedHistory(selectedClient._id || selectedClient.id);

      setDisplayedRecords(selectedPetId ? allClientRecords.filter(r => r.pet_id === selectedPetId) : allClientRecords);
      setDisplayedVaccinations(selectedPetId ? allClientVaccinations.filter(v => v.pet_id === selectedPetId) : allClientVaccinations);
      setDisplayedInvoices(selectedPetId ? allClientInvoices.filter(i => i.pet_id === selectedPetId) : allClientInvoices);

      const filteredMemos = allClientMemos.filter(memo => {
        if (!selectedPetId) return true;
        return memo.pet_id === selectedPetId || memo.pet_id === null;
      });
      setDisplayedMemos(filteredMemos);

      const filteredHistory = allCombinedHistory.filter(h => {
        if (!selectedPetId) return true; // No pet filter, show all history
        // TenantPet filter is active, show history for selected pet OR client-level memos (which don't have a pet_id)
        return h.pet_id === selectedPetId || (h.type === 'memo' && h.pet_id === null);
      });
      setDisplayedHistory(filteredHistory);
    }
  }, [selectedClient, selectedPetId, medicalRecords, vaccinations, clientInvoices, clientMemos, pets, isFullScreen]); // Added isFullScreen to trigger when view changes



  const handlePetSelect = (petId) => {
    // Toggle selection: if the same pet is clicked again, show all. Otherwise, select the pet.
    setSelectedPetId(currentId => (currentId === petId ? null : petId));
  };
  
  const loadAllData = async () => {
    try {
      const [clientData, petData, recordData, vaccinationData, staffData] = await Promise.all([
        ApiClient.list('-created_date'),
        ApiPet.list('-created_date'),
        ApiMedicalRecord.list('-visit_date'),
        ApiVaccination.list('-next_due_date'),
        ApiStaff.list('-created_date'), // Fetch staff
      ]);

      setClients(clientData);
      setPets(petData);
      setMedicalRecords(recordData);
      setVaccinations(vaccinationData);
      setStaff(staffData); // Set staff state
    } catch (error) {
      console.error('Error loading general data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedClientSpecificData = async (clientId) => {
    setLoading(true); // Indicate loading for the detailed client view
    try {
      const [invoiceData, memoData, productData] = await Promise.all([
        ApiInvoice.filter({ client_id: clientId }, '-invoice_date'),
        ApiMemo.filter({ client_id: clientId }, '-created_date'),
        ApiProduct.list(), // Load all products for selection in forms
      ]);

      setClientInvoices(invoiceData);
      setClientMemos(memoData);
      setProducts(productData);
    } catch (error) {
      console.error('Error loading selected client specific data:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleFormSubmit = async (formData, formType) => {
    try {
      switch (formType) {
        case 'client':
          if (editingRecord) {
            console.log('Updating client with editingRecord:', editingRecord);
            console.log('Client ID being used:', editingRecord._id || editingRecord.id);
            await ApiClient.update(editingRecord._id || editingRecord.id, formData);
          } else {
            await ApiClient.create(formData);
          }
          break;
        case 'pet':
          if (editingRecord) {
                    await ApiPet.update(editingRecord._id || editingRecord.id, formData);
      } else {
        await ApiPet.create({ ...formData, client_id: selectedClient._id || selectedClient.id });
          }
          break;
        case 'medical':
          if (editingRecord && (editingRecord._id || editingRecord.id)) { // Check for existing ID to update
            await ApiMedicalRecord.update(editingRecord._id || editingRecord.id, formData);
          } else { // Create new, potentially with pre-filled pet_id
            await ApiMedicalRecord.create(formData);
          }
          break;
        case 'vaccination':
          if (editingRecord && (editingRecord._id || editingRecord.id)) { // Check for existing ID to update
            await ApiVaccination.update(editingRecord._id || editingRecord.id, formData);
          } else { // Create new, potentially with pre-filled pet_id
            await ApiVaccination.create(formData);
          }
          break;
        case 'memo': // ApiMemo is still handled by showForm
          if (editingRecord) {
            await ApiMemo.update(editingRecord._id || editingRecord.id, formData);
          } else {
            await ApiMemo.create(formData);
          }
          break;
      }
      
      setShowForm('');
      setEditingRecord(null);
      
      // Always reload all data to ensure medical records and vaccinations are updated
      await loadAllData();
      
      // If we have a selected client, also reload their specific data
      if (selectedClient) {
        await loadSelectedClientSpecificData(selectedClient._id || selectedClient.id);
      }
      
      alert(`${formType === 'medical' ? 'Medical record' : formType} saved successfully!`);
    } catch (error) {
      console.error('Error saving data:', error);
      alert(`Failed to save ${formType}. Please try again.`);
    }
  };

  const handleCreateInvoice = (petId = null) => {
    setEditingInvoice({
      client_id: selectedClient._id || selectedClient.id,
      pet_id: petId,
      items: [{ product_id: '', service: '', description: '', quantity: 1, unit_price: 0, total: 0, is_manual: false }],
      status: 'draft',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: addDays(new Date(), 30).toISOString().split('T')[0],
      tax_rate: 8,
    });
    setShowInvoiceForm(true);
  };

  const checkStockForInvoice = async (invoiceData) => {
    for (const item of invoiceData.items) {
      if (item.product_id) { // Only check stock for actual products from inventory
        const product = products.find(p => p.id === item.product_id);
        if (!product || product.total_stock < item.quantity) {
          return { sufficient: false, productName: product?.name || 'Unknown TenantProduct' };
        }
      }
    }
    return { sufficient: true };
  };

  const deductStockForInvoice = async (invoice) => {
    const staffMember = "Staff"; // Placeholder for logged-in user

    for (const item of invoice.items) {
      if (item.product_id) {
        let quantityToDeduct = item.quantity;
        const product = products.find(p => p.id === item.product_id);
        if (!product) continue;

        const batches = await TenantProductBatch.filter(
          { product_id: item.product_id, status: 'active' },
          'expiry_date'
        );

        // Sort batches by expiry date to use oldest stock first (FIFO-like)
        batches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

        for (const batch of batches) {
          if (quantityToDeduct <= 0) break;

          const quantityFromThisBatch = Math.min(quantityToDeduct, batch.quantity_on_hand);

          if (quantityFromThisBatch > 0) {
            const newBatchQuantity = batch.quantity_on_hand - quantityFromThisBatch;
            const newProductStock = product.total_stock - quantityFromThisBatch;

            await TenantProductBatch.update(batch.id, {
              quantity_on_hand: newBatchQuantity,
              status: newBatchQuantity === 0 ? 'depleted' : 'active'
            });

            await TenantProduct.update(product.id, { total_stock: newProductStock });

            await TenantStockMovement.create({
              product_id: item.product_id,
              batch_id: batch.id,
              movement_type: 'sale',
              quantity: -quantityFromThisBatch,
              reference_id: invoice.id,
              movement_date: new Date().toISOString(),
              staff_member: staffMember,
              previous_stock: product.total_stock + quantityFromThisBatch, // Correct previous stock for the product
              new_stock: newProductStock
            });

            quantityToDeduct -= quantityFromThisBatch;
            // Update products state immediately to reflect the deduction
            setProducts(prevProducts => prevProducts.map(p =>
              p.id === product.id ? { ...p, total_stock: newProductStock } : p
            ));
          }
        }
      }
    }
  };

  const handleInvoiceSubmit = async (invoiceData) => {
    setLoading(true);
    try {
      const isNewInvoice = !editingInvoice?.id; // Check if editingInvoice exists and has an ID
      const isBecomingPaid = invoiceData.status === 'paid' && editingInvoice?.status !== 'paid';

      if (isBecomingPaid) {
        const stockCheck = await checkStockForInvoice(invoiceData);
        if (!stockCheck.sufficient) {
          alert(`Insufficient stock for "${stockCheck.productName}". Cannot complete sale. Please adjust inventory or invoice items.`);
          setLoading(false);
          return;
        }
      }

      let savedInvoice;
      if (isNewInvoice) {
        savedInvoice = await TenantInvoice.create(invoiceData);
      } else {
        savedInvoice = await TenantInvoice.update(editingInvoice.id, invoiceData);
      }

      if (isBecomingPaid) {
        await deductStockForInvoice(savedInvoice);
      }

      setShowInvoiceForm(false);
      setEditingInvoice(null);
      await loadSelectedClientSpecificData(selectedClient.id); // Reload specific client data including invoices and products
      alert("Invoice saved successfully!");
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("Failed to save invoice: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBillSubmit = async (itemData) => { // Renamed from handleAddToBill
    const { client, pet } = billingTarget;
    if (!client || !pet) {
      alert('Error: Client or pet not selected for billing.');
      return;
    }

    try {
      // Check stock availability if it's a product from inventory
      if (itemData.product_id) {
        const product = products.find(p => p.id === itemData.product_id); // Fixed: use itemData.product_id instead of item.product_id
        if (!product || product.total_stock < itemData.quantity) {
          alert(`Insufficient stock for "${itemData.service || product?.name}". Available: ${product?.total_stock || 0}, Required: ${itemData.quantity}`);
          return;
        }
      }

      const allInvoices = clientInvoices; // Use clientInvoices for this client
      const today = format(new Date(), 'yyyy-MM-dd');

      let draftInvoice = allInvoices.find(inv =>
          inv.client_id === client.id &&
          inv.status === 'draft' &&
          format(new Date(inv.invoice_date), 'yyyy-MM-dd') === today
      );

      const newItem = {
        ...itemData,
        unit_price: parseFloat(itemData.unit_price) || 0,
        quantity: parseFloat(itemData.quantity) || 1,
        total: (parseFloat(itemData.quantity) || 1) * (parseFloat(itemData.unit_price) || 0)
      };

      if (draftInvoice) {
        const updatedItems = [...(draftInvoice.items || []), newItem];
        const subtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
        const taxRate = draftInvoice.tax_rate || 8; // Use existing tax rate or default to 8%
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;

        await ApiInvoice.update(draftInvoice.id, {
          items: updatedItems,
          subtotal: subtotal,
          tax_amount: tax,
          total_amount: total
        });
      } else {
        const subtotal = newItem.total;
        const taxRate = 8; // Default tax rate for new invoices
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;

        await ApiInvoice.create({
            client_id: client.id,
            pet_id: pet.id,
            invoice_number: `DRAFT-${Date.now()}`,
            invoice_date: today,
            status: 'draft',
            items: [newItem],
            subtotal: subtotal,
            tax_rate: taxRate,
            tax_amount: tax,
            total_amount: total
        });
      }

      setShowAddToBillForm(false);
      setBillingTarget({ client: null, pet: null });
      alert('Charge added to draft invoice successfully!');
      loadSelectedClientSpecificData(selectedClient.id); // Reload specific client data to refresh invoices
    } catch (error) {
      console.error('Error adding to bill:', error);
      alert('Failed to add charge. Please try again. ' + error.message);
    }
  };

  const handleAddMedicalRecord = (petId = null) => {
    // If petId is provided, pre-fill the pet_id for the new record
    setEditingRecord(petId ? { pet_id: petId } : null);
    setShowForm('medical');
  };

  const handleAddVaccination = (petId = null) => {
    // If petId is provided, pre-fill the pet_id for the new vaccination
    setEditingRecord(petId ? { pet_id: petId } : null);
    setShowForm('vaccination');
  };

  const handleCancel = () => {
    setShowForm('');
    setEditingRecord(null);
    setShowAddToBillForm(false);
    setShowInvoiceForm(false); // Added for new invoice form
    setEditingInvoice(null); // Added for new invoice form
    setBillingTarget({ client: null, pet: null });
  };

  const handleCloseClient = () => {
    setSelectedClient(null);
    setIsFullScreen(false);
    setSelectedPetId(null); // Reset pet filter on close
    // Navigate to Dashboard instead of staying on Client Management
    navigate(createPageUrl('Dashboard'));
  };

  const getClientPets = (clientId) => pets.filter(p => p.client_id === clientId);
  const getClientRecords = (clientId) => {
    const clientPets = getClientPets(clientId);
    const petIds = clientPets.map(p => p._id || p.id);
    return medicalRecords.filter(r => petIds.includes(r.pet_id || r._id));
  };
  const getClientVaccinations = (clientId) => {
    const clientPets = getClientPets(clientId);
    const petIds = clientPets.map(p => p._id || p.id);
    return vaccinations.filter(v => petIds.includes(v.pet_id || v._id));
  };
  const getClientInvoices = (clientId) => clientInvoices.filter(i => i.client_id === clientId);
  const getClientMemos = (clientId) => {
    const clientPets = getClientPets(clientId);
    const petIds = clientPets.map(p => p._id || p.id);
    return clientMemos.filter(m =>
      (m.client_id === clientId || (m.pet_id && petIds.includes(m.pet_id || m._id))) &&
      m.is_active !== false
    ); // Only active memos
  };

  const getCombinedHistory = (clientId) => {
    const records = getClientRecords(clientId).map(r => ({ ...r, type: 'medical', date: r.visit_date }));
    const vaccines = getClientVaccinations(clientId).map(v => ({ ...v, type: 'vaccine', date: v.date_administered }));
    const clientMemos = getClientMemos(clientId).map(m => ({ ...m, type: 'memo', date: m.created_date })); // Added memos

    return [...records, ...vaccines, ...clientMemos].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (clientId && !selectedClient) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="flex items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-lg text-gray-600">Loading client details...</p>
        </div>
      </div>
    );
  }
  
  if (showForm) {
    const veterinarians = staff.filter(s => s.role === 'veterinarian' && s.status === 'active');
    const forms = {
      client: <ClientForm client={editingRecord} onSubmit={(data) => handleFormSubmit(data, 'client')} onCancel={handleCancel} />,
      pet: <PetForm pet={editingRecord} clients={selectedClient ? [selectedClient] : clients} onSubmit={(data) => handleFormSubmit(data, 'pet')} onCancel={handleCancel} />,
      medical: <MedicalRecordForm record={editingRecord} pets={getClientPets(selectedClient?._id || selectedClient?.id)} clients={selectedClient ? [selectedClient] : clients} veterinarians={veterinarians} onSubmit={(data) => handleFormSubmit(data, 'medical')} onCancel={handleCancel} />,
      vaccination: <VaccinationForm vaccination={editingRecord} pets={getClientPets(selectedClient?._id || selectedClient?.id)} clients={selectedClient ? [selectedClient] : clients} veterinarians={veterinarians} onSubmit={(data) => handleFormSubmit(data, 'vaccination')} onCancel={handleCancel} />,
      memo: <MemoForm memo={editingRecord} client={selectedClient} onSubmit={(data) => handleFormSubmit(data, 'memo')} onCancel={handleCancel} />
    };
    return (
      <div className={isFullScreen ? 'fixed inset-0 bg-white z-40 overflow-auto' : ''}>
        {forms[showForm]}
      </div>
    );
  }

  if (showInvoiceForm) { // New condition for InvoiceForm
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
        <div className="w-full max-w-7xl max-h-full overflow-y-auto">
          <InvoiceForm
            invoice={editingInvoice}
            clients={selectedClient ? [selectedClient] : []} // Pass selected client as a single-element array
            pets={getClientPets(selectedClient?._id || selectedClient?.id)}
            products={products} // Pass products for inventory selection
            onSubmit={handleInvoiceSubmit}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  if (showAddToBillForm) {
    return (
      <AddToBillForm
        client={billingTarget.client}
        pet={billingTarget.pet}
        products={products} // Pass products to AddToBillForm
        onSubmit={handleAddToBillSubmit} // Changed to handleAddToBillSubmit
        onCancel={handleCancel}
      />
    );
  }

  if (isFullScreen && selectedClient) {
    const clientPets = getClientPets(selectedClient._id || selectedClient.id);
    
    return (
      <div className="fixed inset-0 bg-white z-40 flex">
        <div className="flex-1 flex flex-col">
          {/* Top Header - TenantClient Info Bar */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseClient}
                  className="text-white hover:bg-white/20"
                >
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
                  onClick={handleCloseClient} // Changed to navigate to dashboard
                  className="bg-white/10 text-white border-white/30 hover:bg-white/25 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowForm('client'); setEditingRecord(selectedClient); }}
                  className="bg-purple-500/80 text-white border-purple-300/50 hover:bg-purple-500/100 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Client
                </Button>
              </div>
            </div>
          </div>

          {/* TenantPet Cards Section - Now with selection logic */}
          <div className="bg-gray-100 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientPets.map(pet => {
                const petRecords = getClientRecords(selectedClient._id || selectedClient.id).filter(r => (r.pet_id || r._id) === (pet._id || pet.id));
                const recentRecord = petRecords.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
                const petVaccinations = getClientVaccinations(selectedClient._id || selectedClient.id).filter(v => (v.pet_id || v._id) === (pet._id || pet.id));
                const overdueVaccinations = petVaccinations.filter(v => new Date(v.next_due_date) < new Date());

                return (
                  <Card 
                    key={pet._id || pet.id} 
                    onClick={() => handlePetSelect(pet._id || pet.id)}
                                          className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 ${
                          selectedPetId === (pet._id || pet.id) ? 'border-blue-500 shadow-xl bg-blue-50' : 'hover:border-blue-300 bg-white'
                      }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                            {pet.photo_url ? (
                              <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                            ) : (
                              <PawPrint className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div>
                            {pet.pet_id && (
                              <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded mb-1">
                                ID: {pet.pet_id}
                              </div>
                            )}
                            <CardTitle className="text-lg font-bold text-gray-900">
                              {pet.name}
                            </CardTitle>
                            <div className="text-sm text-gray-600 capitalize">
                              {pet.species} • {pet.breed || 'Mixed'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setShowForm('pet'); 
                              setEditingRecord(pet); 
                            }}
                            className="px-2"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddMedicalRecord(pet.id);
                            }}
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-purple-50 text-purple-700 hover:bg-purple-100 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddVaccination(pet.id);
                            }}
                          >
                            <Syringe className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-50 text-green-700 hover:bg-green-100 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBillingTarget({ client: selectedClient, pet: pet });
                              setShowAddToBillForm(true);
                            }}
                          >
                            <DollarSign className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-xs">
                        {pet.birth_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Age:</span>
                            <span>{getPreciseAge(pet.birth_date)}</span>
                          </div>
                        )}
                        {pet.weight && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Weight:</span>
                            <span>{pet.weight} kg</span>
                          </div>
                        )}
                        {recentRecord && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Visit:</span>
                            <span>{format(new Date(recentRecord.visit_date), 'dd-MM-yyyy')}</span>
                          </div>
                        )}
                        {overdueVaccinations.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {overdueVaccinations.length} Overdue Vaccine{overdueVaccinations.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Add New Pet Card */}
              <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => { setSelectedPetId(null); setShowForm('pet'); setEditingRecord(null); }}>
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
                onClick={() => { handleCreateInvoice(); }} // New handler for invoice creation
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Create Bill
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingRecord(null);
                  setShowForm('memo');
                }}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <StickyNote className="w-4 h-4 mr-1" />
                Add Memo
              </Button>
            </div>
          </div>

          {/* Main Content Area with Tabs - Now using filtered data */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-6">
              <Tabs defaultValue="history" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="history">
                    Timeline ({displayedHistory.length})
                  </TabsTrigger>
                  <TabsTrigger value="records">
                    Medical Records ({displayedRecords.length})
                  </TabsTrigger>
                  <TabsTrigger value="vaccines">
                    Vaccinations ({displayedVaccinations.length})
                  </TabsTrigger>
                  <TabsTrigger value="billing">
                    Billing ({displayedInvoices.length})
                  </TabsTrigger>
                  <TabsTrigger value="memos">
                    Internal Memos ({displayedMemos.length})
                  </TabsTrigger>
                  <TabsTrigger value="vitals" disabled={!selectedPetId}>
                    <Activity className="w-4 h-4 mr-2" />
                    Vital Trends
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="mt-6">
                  {displayedHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No history found {selectedPetId ? `for ${pets.find(p=>p.id === selectedPetId)?.name}` : 'for this client'}.</p>
                    </div>
                  ) : (
                    <div>
                      {displayedHistory.map((event) => {
                        const pet = pets.find(p => p.id === event.pet_id);

                        if (event.type === 'medical') {
                          return (
                            <TimelineEvent key={`hist-med-${event.id}`} date={event.date} icon={FileText} color="blue" title={`Medical Visit for ${pet?.name}`}>
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
                              </div>
                            </TimelineEvent>
                          );
                        }

                        if (event.type === 'vaccine') {
                          const isOverdue = new Date(event.next_due_date) < new Date();
                          return (
                            <TimelineEvent key={`hist-vac-${event.id}`} date={event.date} icon={Syringe} color="purple" title={`Vaccination for ${pet?.name}`}>
                              <p className="font-medium">{event.vaccine_name}</p>
                              <p className={`text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                Next due on {format(new Date(event.next_due_date), 'MMM d, yyyy')}
                                {isOverdue && ' (Overdue)'}
                              </p>
                            </TimelineEvent>
                          );
                        }

                        if (event.type === 'memo') {
                          const categoryColors = {
                            behavioral: 'red',
                            medical_preference: 'blue',
                            payment: 'orange',
                            appointment_preference: 'green',
                            handling: 'purple',
                            owner_preference: 'cyan',
                            clinic_workflow: 'yellow',
                            general: 'gray'
                          };

                          const memoColor = categoryColors[event.category] || 'gray';
                          const petName = pet ? ` for ${pet.name}` : '';
                          const isUrgent = event.priority === 'urgent';

                          return (
                            <TimelineEvent
                              key={`hist-memo-${event.id}`}
                              date={event.date}
                              icon={StickyNote}
                              color={memoColor}
                              title={`Internal Memo${petName}`}
                              badgeText={isUrgent ? 'URGENT' : null} // Use badgeText for urgent, category specific badge inside
                            >
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs ${
                                    event.category === 'behavioral' ? 'bg-red-100 text-red-800' :
                                    event.category === 'medical_preference' ? 'bg-blue-100 text-blue-800' :
                                    event.category === 'payment' ? 'bg-orange-100 text-orange-800' :
                                    event.category === 'appointment_preference' ? 'bg-green-100 text-green-800' :
                                    event.category === 'handling' ? 'bg-purple-100 text-purple-800' :
                                    event.category === 'owner_preference' ? 'bg-cyan-100 text-cyan-800' :
                                    event.category === 'clinic_workflow' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {event.category.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                  </Badge>
                                  {event.priority === 'urgent' && (
                                    <Badge className="bg-red-100 text-red-700 text-xs">
                                      URGENT
                                    </Badge>
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
                                      Expires: {format(new Date(event.expires_on), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TimelineEvent>
                          );
                        }

                        return null;
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
                    displayedRecords.map(record => {
                      const pet = pets.find(p => p.id === record.pet_id);
                      return (
                        <Card key={record.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <FileText className="w-8 h-8 text-green-500 mt-1" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{pet?.name}</h3>
                                    <Badge variant="outline">{format(new Date(record.visit_date), 'MMM d, yyyy')}</Badge>
                                  </div>
                                  <p className="text-gray-900">{record.subjective}</p>
                                  {record.assessment && (
                                    <p className="text-sm text-gray-600"><strong>Diagnosis:</strong> {record.assessment}</p>
                                  )}
                                  {record.plan && (
                                    <p className="text-sm text-gray-600"><strong>Treatment:</strong> {record.plan}</p>
                                  )}
                                  {record.veterinarian && (
                                    <p className="text-xs text-gray-500">By: {record.veterinarian}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setShowForm('medical'); setEditingRecord(record); }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
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
                    displayedVaccinations.map(vaccine => {
                      const pet = pets.find(p => p.id === vaccine.pet_id);
                      const isOverdue = new Date(vaccine.next_due_date) < new Date();
                      return (
                        <Card key={vaccine.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <Syringe className={`w-8 h-8 mt-1 ${isOverdue ? 'text-red-500' : 'text-purple-500'}`} />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{pet?.name}</h3>
                                    <Badge className={isOverdue ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'}>
                                      {vaccine.vaccine_name}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    <strong>Given:</strong> {format(new Date(vaccine.date_administered), 'MMM d, yyyy')}
                                  </p>
                                  <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                    <strong>Due:</strong> {format(new Date(vaccine.next_due_date), 'MMM d, yyyy')}
                                    {isOverdue && ' (Overdue)'}
                                  </p>
                                  {vaccine.veterinarian && (
                                    <p className="text-xs text-gray-500">By: {vaccine.veterinarian}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setShowForm('vaccination'); setEditingRecord(vaccine); }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
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
                    displayedInvoices.map(invoice => {
                      const pet = pets.find(p => p.id === invoice.pet_id);
                      const statusColors = {
                        draft: 'bg-gray-100 text-gray-800',
                        sent: 'bg-blue-100 text-blue-800',
                        paid: 'bg-green-100 text-green-800',
                        overdue: 'bg-red-100 text-red-800',
                        cancelled: 'bg-gray-100 text-gray-800'
                      };
                      return (
                        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <CreditCard className="w-8 h-8 text-orange-500 mt-1" />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">#{invoice.invoice_number}</h3>
                                    <Badge className={statusColors[invoice.status]}>
                                      {invoice.status}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-900">₹{invoice.total_amount?.toFixed(2)}</p>
                                  <p className="text-sm text-gray-600">
                                    {pet?.name} • {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                                  </p>
                                  {invoice.due_date && (
                                    <p className="text-sm text-gray-600">
                                      Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
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
                                  onClick={() => { setEditingInvoice(invoice); setShowInvoiceForm(true); }} // Changed to use new invoice handler
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="memos" className="mt-6">
                  <MemoWidget
                    clientId={selectedClient.id}
                    client={selectedClient}
                    memoData={displayedMemos} // Use filtered memos
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
                      {/* Date Range Picker */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Vital Trends for {pets.find(p => p.id === selectedPetId)?.name}
                          </h3>
                          <p className="text-sm text-gray-600">Track weight, blood pressure, heart rate, and temperature over time</p>
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
                          <DateRangePicker
                            dateRange={vitalDateRange}
                            onDateRangeChange={setVitalDateRange}
                          />
                        </div>
                      </div>

                      {/* Vital Charts Grid */}
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
              </Tabs>
            </div>
          </div>
        </div>
        {/* MedicalRecordViewer Dialog for printing */}
        <MedicalRecordViewer
          record={viewingMedicalRecord}
          onClose={() => setViewingMedicalRecord(null)}
          pets={pets}
          clients={clients}
          staff={staff}
        />
      </div>
    );
  }
}
