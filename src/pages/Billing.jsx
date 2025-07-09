
import React, { useState, useEffect } from "react";
import { Plus, Search, CreditCard, FileText, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantInvoice, TenantPet, TenantClient, TenantProduct, TenantProductBatch, TenantStockMovement } from "@/api/tenant-entities";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, format, isWithinInterval, parseISO } from "date-fns";

import InvoiceForm from "../components/billing/InvoiceForm";
import InvoiceList from "../components/billing/InvoiceList";
import InvoiceStats from "../components/billing/InvoiceStats";

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [pets, setPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]); // New state for products
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date() // Today
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, pets, clients, searchTerm, activeTab, dateRange]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [invoiceData, petData, clientData, productData] = await Promise.all([ // Added productData
        TenantInvoice.list('-invoice_date'),
        TenantPet.list(),
        TenantClient.list(),
        TenantProduct.list() // Fetch products
      ]);
      setInvoices(invoiceData);
      setPets(petData);
      setClients(clientData);
      setProducts(productData); // Set products state
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = invoices;

    // Filter by date range
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(invoice => {
        const invoiceDate = parseISO(invoice.invoice_date);
        return isWithinInterval(invoiceDate, {
          start: dateRange.from,
          end: dateRange.to
        });
      });
    }

    // Filter by status
    if (activeTab !== "all") {
      filtered = filtered.filter(invoice => invoice.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => {
        const pet = pets.find(p => p.id === invoice.pet_id);
        const client = clients.find(c => c.id === invoice.client_id);

        const invoiceMatch = invoice.invoice_number?.toLowerCase().includes(lowercasedFilter);
        const petMatch = pet?.name.toLowerCase().includes(lowercasedFilter);
        const clientMatch = client && `${client.first_name} ${client.last_name}`.toLowerCase().includes(lowercasedFilter);

        return invoiceMatch || petMatch || clientMatch;
      });
    }

    setFilteredInvoices(filtered);
  };

  const checkStockForInvoice = async (invoiceData) => {
    for (const item of invoiceData.items) {
      if (item.product_id) {
        const product = await TenantProduct.get(item.product_id);
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
        const product = await TenantProduct.get(item.product_id);

        // Get all active batches for the product, sorted by expiry date (FEFO)
        const batches = await TenantProductBatch.filter(
          { product_id: item.product_id, status: 'active' },
          'expiry_date'
        );

        for (const batch of batches) {
          if (quantityToDeduct <= 0) break;

          const quantityFromThisBatch = Math.min(quantityToDeduct, batch.quantity_on_hand);
          
          if (quantityFromThisBatch > 0) {
            const newBatchQuantity = batch.quantity_on_hand - quantityFromThisBatch;
            const newProductStock = product.total_stock - quantityFromThisBatch;
            
            // Update batch
            await TenantProductBatch.update(batch.id, {
              quantity_on_hand: newBatchQuantity,
              status: newBatchQuantity === 0 ? 'depleted' : 'active'
            });

            // Update product's total stock
            await TenantProduct.update(product.id, { total_stock: newProductStock });

            // Create stock movement record for traceability
            await TenantStockMovement.create({
              product_id: item.product_id,
              batch_id: batch.id,
              movement_type: 'sale',
              quantity: -quantityFromThisBatch,
              reference_id: invoice.id,
              movement_date: new Date().toISOString(),
              staff_member: staffMember,
              previous_stock: product.total_stock,
              new_stock: newProductStock
            });
            
            quantityToDeduct -= quantityFromThisBatch;
          }
        }
      }
    }
  };

  const handleSubmit = async (invoiceData) => {
    try {
      const isNewInvoice = !editingInvoice;
      const isBecomingPaid = invoiceData.status === 'paid' && (isNewInvoice || editingInvoice?.status !== 'paid');

      if (isBecomingPaid) {
        const stockCheck = await checkStockForInvoice(invoiceData);
        if (!stockCheck.sufficient) {
          alert(`Insufficient stock for "${stockCheck.productName}". Cannot complete sale. Please adjust inventory or invoice items.`);
          return;
        }
      }

      let savedInvoice;
      if (editingInvoice) {
        savedInvoice = await TenantInvoice.update(editingInvoice.id, invoiceData);
      } else {
        savedInvoice = await TenantInvoice.create(invoiceData);
      }

      if (isBecomingPaid) {
        await deductStockForInvoice(savedInvoice);
      }
      
      setShowForm(false);
      setEditingInvoice(null);
      loadInitialData(); // Reload all data to reflect changes
    } catch (error) {
      console.error('Error saving invoice and updating stock:', error);
      alert('Failed to save invoice. Please try again.');
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingInvoice(null);
  };

  const getStatusCount = (status) => {
    return invoices.filter(inv => inv.status === status).length;
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-600 mt-1">Manage invoices and track payments</p>
        </div>
        <Button 
          onClick={() => { setEditingInvoice(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </div>

      {!showForm && (
        <div className="space-y-4">
          <InvoiceStats invoices={filteredInvoices} loading={loading} />
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by invoice number, pet, or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-[240px] justify-start">
                    <CalendarIcon className="h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Quick Ranges</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({
                            from: new Date(),
                            to: new Date()
                          })}
                        >
                          Today
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({
                            from: addDays(new Date(), -7),
                            to: new Date()
                          })}
                        >
                          Last 7 days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({
                            from: addDays(new Date(), -30),
                            to: new Date()
                          })}
                        >
                          Last 30 days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({
                            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                            to: new Date()
                          })}
                        >
                          This month
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">From Date</h4>
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">To Date</h4>
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft" className="relative">
                Draft
                {getStatusCount('draft') > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getStatusCount('draft')}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="overdue" className="relative">
                Overdue
                {getStatusCount('overdue') > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getStatusCount('overdue')}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              <InvoiceList
                invoices={filteredInvoices}
                pets={pets}
                clients={clients}
                loading={loading}
                onEdit={handleEdit}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          pets={pets}
          clients={clients}
          products={products} // Pass products to InvoiceForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
