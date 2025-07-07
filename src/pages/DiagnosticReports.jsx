
import React, { useState, useEffect } from "react";
import { Plus, Search, FileText, Download, Eye, Edit, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TenantDiagnosticReport, TenantPet, TenantClient, TenantReportTemplate } from "@/api/tenant-entities";

import DiagnosticReportForm from "../components/diagnostic/DiagnosticReportForm";
import DiagnosticReportList from "../components/diagnostic/DiagnosticReportList";

export default function DiagnosticReports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [pets, setPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, filterType, filterStatus]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [reportData, petData, clientData, templateData] = await Promise.all([
        TenantDiagnosticReport.list('-report_date'),
        TenantPet.list(),
        TenantClient.list(),
        TenantReportTemplate.list(),
      ]);
      setReports(reportData);
      setPets(petData);
      setClients(clientData);
      setTemplates(templateData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Filter by search term
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(report => {
        const pet = pets.find(p => p.id === report.pet_id);
        const client = clients.find(c => c.id === report.client_id);
        
        return (
          report.report_id?.toLowerCase().includes(lowercasedFilter) ||
          report.observations?.toLowerCase().includes(lowercasedFilter) || // Changed from specimen_site to observations
          pet?.name?.toLowerCase().includes(lowercasedFilter) ||
          client?.first_name?.toLowerCase().includes(lowercasedFilter) ||
          client?.last_name?.toLowerCase().includes(lowercasedFilter)
        );
      });
    }

    // Filter by report type
    if (filterType !== "all") {
      filtered = filtered.filter(report => report.report_type === filterType);
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter(report => report.status === filterStatus);
    }

    setFilteredReports(filtered);
  };

  const handleSubmit = async (reportData) => {
    try {
      if (editingReport) {
        await TenantDiagnosticReport.update(editingReport.id, reportData);
      } else {
        await TenantDiagnosticReport.create(reportData);
      }
      setShowForm(false);
      setEditingReport(null);
      loadInitialData();
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    }
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingReport(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diagnostic Reports</h1>
          <p className="text-gray-600 mt-1">Generate and manage cytology, histopathology, and other diagnostic reports</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => { setEditingReport(null); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            New Report
          </Button>
        </div>
      </div>

      {!showForm && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by report ID, pet name, client, or specimen site..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cytology">Cytology</SelectItem>
                <SelectItem value="histopathology">Histopathology</SelectItem>
                <SelectItem value="blood_work">Blood Work</SelectItem>
                <SelectItem value="urine_analysis">Urine Analysis</SelectItem>
                <SelectItem value="fecal_exam">Fecal Exam</SelectItem>
                <SelectItem value="skin_scraping">Skin Scraping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DiagnosticReportList
            reports={filteredReports}
            pets={pets}
            clients={clients}
            templates={templates}
            loading={loading}
            onEdit={handleEdit}
          />
        </div>
      )}

      {showForm && (
        <DiagnosticReportForm
          report={editingReport}
          pets={pets}
          clients={clients}
          templates={templates}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
