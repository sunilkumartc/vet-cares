import React, { useState, useEffect } from "react";
import { Plus, Search, CreditCard, FileText, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TenantInvoice,
  TenantPet,
  TenantClient,
  TenantProduct,
  TenantProductBatch,
  TenantStockMovement,
} from "@/api/tenant-entities";
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
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  // ✅ Product cache for quick lookups
  const productIndex = React.useMemo(() => {
    const m = new Map();
    for (const p of products) {
      if (p.id) m.set(String(p.id), p);
      if (p._id) m.set(String(p._id), p);
      if (p.product_id) m.set(String(p.product_id), p);
    }
    return m;
  }, [products]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, pets, clients, searchTerm, activeTab, dateRange]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [invoiceData, petData, clientData, productData] = await Promise.all([
        TenantInvoice.list("-invoice_date"),
        TenantPet.list(),
        TenantClient.list(),
        TenantProduct.list(),
      ]);
      setInvoices(invoiceData);
      setPets(petData);
      setClients(clientData);
      setProducts(productData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeId = (v) => {
    if (!v) return undefined;
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (typeof v === "object") {
      return String(v._id ?? v.id ?? v.product_id ?? v.value ?? "");
    }
    return undefined;
  };

  const filterInvoices = () => {
    let filtered = invoices;

    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = parseISO(invoice.invoice_date);
        return isWithinInterval(invoiceDate, {
          start: dateRange.from,
          end: dateRange.to,
        });
      });
    }

    if (activeTab !== "all") {
      filtered = filtered.filter((invoice) => invoice.status === activeTab);
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter((invoice) => {
        const pet = pets.find((p) => (p._id || p.id) === invoice.pet_id);
        const client = clients.find((c) => (c._id || c.id) === invoice.client_id);
        const invoiceMatch = invoice.invoice_number?.toLowerCase().includes(lowercasedFilter);
        const petMatch = pet?.name.toLowerCase().includes(lowercasedFilter);
        const clientMatch =
          client && `${client.first_name} ${client.last_name}`.toLowerCase().includes(lowercasedFilter);
        return invoiceMatch || petMatch || clientMatch;
      });
    }

    setFilteredInvoices(filtered);
  };

  const getProductSafe = async (productId) => {
    try {
      return await TenantProduct.get(productId);
    } catch {
      return null;
    }
  };

  const checkStockForInvoice = async (items) => {
    if (!Array.isArray(items) || items.length === 0) return { sufficient: true };
    for (const item of items) {
      const productId = normalizeId(item.product_id || item.product);
      if (!productId) continue;
      const cached = productIndex.get(productId);
      const product = cached || (await getProductSafe(productId));
      if (!product) {
        return { sufficient: false, productName: "Unknown Product" };
      }
      if ((Number(product.total_stock) || 0) < (Number(item.quantity) || 0)) {
        return { sufficient: false, productName: product.name };
      }
    }
    return { sufficient: true };
  };

  const deductStockForInvoice = async (invoice, submittedItems) => {
    const staffMember = "Staff"; // Placeholder for logged-in user
    const errors = [];
    const items = Array.isArray(submittedItems) ? submittedItems : invoice.items || [];

    for (const item of items) {
      const productId = normalizeId(item.product_id || item.product);
      const qtyNeeded = Number(item.quantity) || 0;
      if (!productId || qtyNeeded <= 0) continue;

      let product = productIndex.get(productId) || (await getProductSafe(productId));
      if (!product) {
        errors.push(`Missing product (${productId}).`);
        continue;
      }

      let remaining = qtyNeeded;
      let batches = [];
      try {
        batches = await TenantProductBatch.filter({ product_id: productId, status: "active" }, "expiry_date");
      } catch {
        batches = [];
      }

      if (!batches || batches.length === 0) {
        const newStock = Math.max(0, (Number(product.total_stock) || 0) - remaining);
        try {
          await TenantProduct.update(product.id ?? product._id, { total_stock: newStock });
          product.total_stock = newStock;
        } catch {
          errors.push(`Stock update failed for ${product.name}`);
        }
        try {
          await TenantStockMovement.create({
            product_id: productId,
            batch_id: null,
            movement_type: "sale",
            quantity: -remaining,
            reference_id: invoice.id ?? invoice._id,
            movement_date: new Date().toISOString(),
            staff_member: staffMember,
            previous_stock: (Number(product.total_stock) || 0) + remaining,
            new_stock: product.total_stock,
          });
        } catch {}
        continue;
      }

      for (const batch of batches) {
        if (remaining <= 0) break;
        const avail = Number(batch.quantity_on_hand) || 0;
        if (avail <= 0) continue;
        const take = Math.min(avail, remaining);
        const newBatchQty = avail - take;

        try {
          await TenantProductBatch.update(batch.id ?? batch._id, {
            quantity_on_hand: newBatchQty,
            status: newBatchQty === 0 ? "depleted" : batch.status,
          });
        } catch {
          errors.push(`Batch update failed (${batch.batch_id})`);
          continue;
        }

        const newProdStock = Math.max(0, (Number(product.total_stock) || 0) - take);
        try {
          await TenantProduct.update(product.id ?? product._id, { total_stock: newProdStock });
          product.total_stock = newProdStock;
        } catch {
          errors.push(`Product stock update failed (${product.name})`);
        }

        try {
          await TenantStockMovement.create({
            product_id: productId,
            batch_id: batch.id ?? batch._id,
            movement_type: "sale",
            quantity: -take,
            reference_id: invoice.id ?? invoice._id,
            movement_date: new Date().toISOString(),
            staff_member: staffMember,
            previous_stock: (Number(product.total_stock) || 0) + take,
            new_stock: product.total_stock,
          });
        } catch {}

        remaining -= take;
      }

      if (remaining > 0) {
        errors.push(`Not enough stock deducted for ${product.name} (short ${remaining}).`);
      }
    }

    return errors;
  };

  const handleSubmit = async (invoiceData) => {
    try {
      const isNewInvoice = !editingInvoice;
      const wasPaidBefore = editingInvoice?.status === "paid";
      const willBePaid = invoiceData.status === "paid";
      const isBecomingPaid = willBePaid && !wasPaidBefore;

      const submittedItems = Array.isArray(invoiceData.items) ? invoiceData.items : [];

      if (isBecomingPaid) {
        const stockCheck = await checkStockForInvoice(submittedItems);
        if (!stockCheck.sufficient) {
          alert(`Insufficient stock for "${stockCheck.productName}". Cannot complete sale.`);
          return;
        }
      }

      let savedInvoice;
      try {
        if (editingInvoice) {
          savedInvoice = await TenantInvoice.update(editingInvoice._id || editingInvoice.id, invoiceData);
        } else {
          savedInvoice = await TenantInvoice.create(invoiceData);
        }
      } catch (err) {
        console.error("[Billing] Invoice save failed:", err);
        alert("Failed to save invoice. Please try again.");
        return;
      }

      if (isBecomingPaid) {
        const stockErrors = await deductStockForInvoice(savedInvoice, submittedItems);
        if (stockErrors.length > 0) {
          alert(`Invoice saved, but inventory updates failed:\n- ${stockErrors.join("\n- ")}`);
        }
      }

      setShowForm(false);
      setEditingInvoice(null);
      loadInitialData();
    } catch (error) {
      console.error("[Billing] Unexpected error:", error);
      alert("Something went wrong. Please try again.");
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

  const getStatusCount = (status) => invoices.filter((inv) => inv.status === status).length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-600 mt-1">Manage invoices and track payments</p>
        </div>
        <Button
          onClick={() => {
            setEditingInvoice(null);
            setShowForm(true);
          }}
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
                    {dateRange.from
                      ? dateRange.to
                        ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                        : format(dateRange.from, "LLL dd, y")
                      : "Pick a date range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Quick Ranges</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDateRange({ from: new Date(), to: new Date() })}>
                          Today
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({ from: addDays(new Date(), -7), to: new Date() })}
                        >
                          Last 7 days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({ from: addDays(new Date(), -30), to: new Date() })}
                        >
                          Last 30 days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDateRange({
                              from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                              to: new Date(),
                            })
                          }
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
                        onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">To Date</h4>
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
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
                {getStatusCount("draft") > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getStatusCount("draft")}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="overdue" className="relative">
                Overdue
                {getStatusCount("overdue") > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getStatusCount("overdue")}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <InvoiceList invoices={filteredInvoices} pets={pets} clients={clients} loading={loading} onEdit={handleEdit} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          pets={pets}
          clients={clients}
          products={products}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
