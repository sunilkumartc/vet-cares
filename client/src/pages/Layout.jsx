import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Heart, Calendar, Users, PawPrint, FileText, Syringe, CreditCard, 
  LogOut, AlertTriangle, Search, Plus, Phone, Mail, ArrowRight, X, 
  ShoppingCart, Package, Settings, ChevronDown, FileSliders, BarChart3, 
  Building2 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User } from "@/api/tenant-entities";
import { ApiClient_entity as ApiClient, ApiPet, ApiMedicalRecord } from "@/api/apiClient";
import { hasPageAccess, getCurrentUser, filterByTenant } from "@/utils/permissions.jsx";
import { format } from "date-fns";
import ClientForm from "../components/clients/ClientForm";
import { useTheme } from "@/contexts/ThemeContext";
import ClientSessionManager from "@/lib/clientSession";

const adminNavigation = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: Heart },
  { title: "Appointments", url: createPageUrl("Appointments"), icon: Calendar },
  { title: "Diagnostic Reports", url: createPageUrl("DiagnosticReports"), icon: FileText },
  { title: "Sales & Dispense", url: createPageUrl("SalesDispense"), icon: ShoppingCart },
  { title: "Inventory", url: createPageUrl("InventoryManagement"), icon: Package },
  { title: "Billing", url: createPageUrl("Billing"), icon: CreditCard },
  { title: "Staff Management", url: createPageUrl("StaffManagement"), icon: Users },
  { title: "Analytics", url: createPageUrl("Analytics"), icon: BarChart3 },
  { title: "Tenant Management", url: createPageUrl("TenantManagement"), icon: Building2 },
];

const settingsNavigation = [
  { title: "Clinic Profile", url: createPageUrl("Settings"), icon: Settings },
  { title: "Client Management", url: createPageUrl("Clients"), icon: Users },
  { title: "Pet Management", url: createPageUrl("Pets"), icon: PawPrint },
  { title: "Vaccine Settings", url: createPageUrl("VaccineSettings"), icon: Syringe },
  { title: "Report Templates", url: createPageUrl("ReportTemplates"), icon: FileSliders },
];

const clientNavigation = [
  { title: "My Pets", url: createPageUrl("MyPets"), icon: PawPrint },
  { title: "Billing", url: createPageUrl("MyInvoices"), icon: CreditCard },
  { title: "My Profile", url: createPageUrl("MyProfile"), icon: Users },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getColor, getBranding, getTenantInfo } = useTheme();
  const tenant = getTenantInfo();
  
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [staffSession, setStaffSession] = React.useState(null);
  
  // Debug logging - moved after state declarations
  console.log('Layout Debug:', {
    currentPageName,
    pathname: location.pathname,
    hasStaffSession: !!staffSession,
    hasUser: !!user,
    staffSessionData: staffSession ? { 
      name: staffSession.name, 
      role: staffSession.role,
      tenantId: staffSession.tenant_id || staffSession.tenantId 
    } : null,
    userData: user ? { 
      name: user.name, 
      email: user.email,
      tenantId: user.tenant_id || user.tenantId 
    } : null,
    tenantInfo: tenant,
    localStorage: {
      staffSession: localStorage.getItem('staffSession') ? 'exists' : 'null',
      clientSession: localStorage.getItem('clientSession') ? 'exists' : 'null'
    }
  });
  
  const [showGlobalSearch, setShowGlobalSearch] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [clients, setClients] = React.useState([]);
  const [pets, setPets] = React.useState([]);
  const [medicalRecords, setMedicalRecords] = React.useState([]);
  const [filteredClients, setFilteredClients] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [showClientForm, setShowClientForm] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  // Helper function to get current tenant ID
  const getCurrentTenantId = () => {
    // Priority order: staffSession > user > tenant context
    if (staffSession?.tenant_id) return staffSession.tenant_id;
    if (staffSession?.tenantId) return staffSession.tenantId;
    if (user?.tenant_id) return user.tenant_id;
    if (user?.tenantId) return user.tenantId;
    if (tenant?.id) return tenant.id;
    if (tenant?._id) return tenant._id;
    
    console.warn('No tenant ID found in any context');
    return null;
  };

  const canAccess = (pageTitle, permissions) => {
    if (!permissions || permissions.length === 0) return false;
    if (permissions.includes("all")) return true;
  
    // Normalize title to match permission keys
    const normalizedTitle = pageTitle.toLowerCase().replace(/ /g, '_');
    return permissions.includes(normalizedTitle);
  };

  React.useEffect(() => {
    // If loading is finished, and we have a staff session,
    // but we are on the Home page, redirect to the Dashboard.
    if (!loading && staffSession && currentPageName === 'Home') {
      navigate(createPageUrl('Dashboard'));
    }
  }, [loading, staffSession, currentPageName, navigate]);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const staffSessionData = localStorage.getItem('staffSession');
        console.log('Loading sessions - staffSessionData:', staffSessionData ? 'exists' : 'null');
        
        if (staffSessionData) {
          const parsedStaffSession = JSON.parse(staffSessionData);
          console.log('Setting staff session:', parsedStaffSession);
          setStaffSession(parsedStaffSession);
        } else {
          const clientSessionData = localStorage.getItem('clientSession');
          console.log('Loading sessions - clientSessionData:', clientSessionData ? 'exists' : 'null');
          
          if (clientSessionData) {
            const parsedClientSession = JSON.parse(clientSessionData);
            console.log('Setting client session:', parsedClientSession);
            setUser(parsedClientSession);
          } else {
            console.log('No session data found, trying User.me()');
            const currentUser = await User.me();
            console.log('User.me() result:', currentUser);
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.log("No authenticated user found:", error);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  React.useEffect(() => {
    if (showGlobalSearch && clients.length === 0) {
      loadSearchData();
    }
  }, [showGlobalSearch]);

  React.useEffect(() => {
    const filtered = clients.filter(client => {
      const clientPets = pets.filter(p => p.client_id === (client._id || client.id));
      return (
        client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm) ||
        clientPets.some(pet => pet.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    setFilteredClients(filtered);
  }, [clients, pets, searchTerm]);

  // FIXED: Load search data with proper tenant filtering
  const loadSearchData = async () => {
    setSearchLoading(true);
    try {
      const currentTenantId = getCurrentTenantId();
      console.log('Loading search data with tenant ID:', currentTenantId);
      
      if (!currentTenantId) {
        console.error('No tenant ID available for filtering');
        setSearchLoading(false);
        return;
      }

      // Option 1: If your API supports tenant filtering via query parameters
      try {
        const [clientData, petData, recordData] = await Promise.all([
          ApiClient.list('-created_date', { tenant_id: currentTenantId }),
          ApiPet.list('-created_date', { tenant_id: currentTenantId }),
          ApiMedicalRecord.list('-visit_date', { tenant_id: currentTenantId })
        ]);

        console.log('Filtered search data (API level):', {
          clients: clientData?.length || 0,
          pets: petData?.length || 0,
          records: recordData?.length || 0,
          tenantId: currentTenantId
        });

        setClients(clientData || []);
        setPets(petData || []);
        setMedicalRecords(recordData || []);
      } catch (apiError) {
        console.warn('API-level filtering failed, trying frontend filtering:', apiError);
        
        // Option 2: If your API doesn't support tenant filtering, filter on frontend
        const [allClients, allPets, allRecords] = await Promise.all([
          ApiClient.list('-created_date'),
          ApiPet.list('-created_date'),
          ApiMedicalRecord.list('-visit_date')
        ]);

        // Filter by tenant ID on the frontend
        const clientData = allClients.filter(client => 
          client.tenant_id === currentTenantId || client.tenantId === currentTenantId
        );
        const petData = allPets.filter(pet => 
          pet.tenant_id === currentTenantId || pet.tenantId === currentTenantId
        );
        const recordData = allRecords.filter(record => 
          record.tenant_id === currentTenantId || record.tenantId === currentTenantId
        );

        console.log('Filtered search data (Frontend level):', {
          clients: clientData?.length || 0,
          pets: petData?.length || 0,
          records: recordData?.length || 0,
          tenantId: currentTenantId
        });

        setClients(clientData || []);
        setPets(petData || []);
        setMedicalRecords(recordData || []);
      }
    } catch (error) {
      console.error('Error loading search data:', error);
      // Show user-friendly error
      alert('Failed to load client data. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClientSelect = (client) => {
    setShowGlobalSearch(false);
    setSearchTerm("");
    navigate(`${createPageUrl("ClientManagement")}?clientId=${client._id || client.id}`);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    if (staffSession) {
      localStorage.removeItem('staffSession');
    } else if (user) {
      ClientSessionManager.clearSession();
    }
    window.location.href = createPageUrl('Home');
  };

  const handleClientFormSubmit = async (clientData) => {
    try {
      // FIXED: Include tenant ID when creating new client
      const currentTenantId = getCurrentTenantId();
      const clientDataWithTenant = {
        ...clientData,
        tenant_id: currentTenantId,
        tenantId: currentTenantId // Include both formats for compatibility
      };

      console.log('Creating client with tenant ID:', clientDataWithTenant);
      
      await ApiClient.create(clientDataWithTenant);
      setShowClientForm(false);
      
      // Reload search data to include the new client
      await loadSearchData();
      alert("Client added successfully!");
    } catch (error) {
      console.error("Error creating new client from layout:", error);
      alert("Failed to add client. Please try again.");
    }
  };

  const handleClientFormCancel = () => setShowClientForm(false);

  // New function to close sidebar on mobile after link click
  const handleNavLinkClick = () => {
    // Only auto-close on mobile (window width < 1024px, matching lg breakpoint)
    if (window.innerWidth < 1024) {
      const trigger = document.querySelector('.sidebar-trigger');
      if (trigger) {
        trigger.click(); // Simulate click on trigger to close the sidebar
      }
    }
  };

  // ENHANCED: Global Search Modal with tenant-aware display
  const GlobalSearchModal = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-500" />
            <Input
              type="text"
              placeholder="Search by client name, pet name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-base"
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={() => setShowGlobalSearch(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          {/* NEW: Display current tenant info */}
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
            <Building2 className="w-3 h-3" />
            <span>
              Searching in: {getBranding('clinicName') || tenant?.name || 'Current Clinic'} 
              {getCurrentTenantId() && (
                <span className="ml-1 text-gray-400">({getCurrentTenantId()})</span>
              )}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {searchLoading ? (
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Loading clients...
            </div>
          ) : filteredClients.length > 0 ? (
            <ul className="space-y-2">
              {filteredClients.map((client) => {
                const clientPets = pets.filter((p) => p.client_id === (client._id || client.id));
                const lastVisit = medicalRecords
                  .filter((r) => clientPets.some((p) => (p._id || p.id) === (r.pet_id || r._id)))
                  .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
                return (
                  <li key={client._id || client.id} className="p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between" onClick={() => handleClientSelect(client)}>
                    <div>
                      <h3 className="font-semibold text-blue-800">{client.first_name} {client.last_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><PawPrint className="w-3 h-3" />{clientPets.map((p) => p.name).join(", ") || "No pets"}</span>
                        {lastVisit && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Last visit: {format(new Date(lastVisit.visit_date), "PP")}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <PawPrint className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No clients found{searchTerm ? ` matching "${searchTerm}"` : ''}.</p>
              {!getCurrentTenantId() && (
                <p className="text-red-500 text-xs mt-2">
                  ⚠️ No tenant ID found - results may be incomplete
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (currentPageName === 'StaffLogin' || currentPageName === 'Home' || currentPageName === 'PetInsurance' || currentPageName === 'DNATrace') {
    return <>{children}</>;
  }

  const adminPages = ['Dashboard', 'Analytics', 'Appointments', 'ClientManagement', 'Clients', 'Pets', 'MedicalRecords', 'Vaccinations', 'Billing', 'StaffManagement', 'PetMedicalHistory', 'InvoiceDetails', 'PetDetails', 'ClientDetails', 'SalesDispense', 'InventoryManagement', 'VaccineSettings', 'DiagnosticReports', 'ReportTemplates', 'Settings', 'TenantManagement'];
  const clientPages = ['MyPets', 'MyInvoices', 'MyProfile', 'PetProfile', 'PetMedicalHistory'];
  const isAdminPage = adminPages.includes(currentPageName);
  const isClientPage = clientPages.includes(currentPageName);

  if (loading || loggingOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        {loggingOut && <p className="ml-4">Logging out...</p>}
      </div>
    );
  }

  // Show admin navigation for staff sessions (regardless of page type)
  if (staffSession) {
    // Use the new permission system
    if (!hasPageAccess(currentPageName)) {
      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center text-center p-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-800">Access Denied</h1>
          <p className="text-red-600 mt-2">You do not have permission to view this page.</p>
          <p className="text-sm text-gray-500 mt-2">Required permission: {currentPageName}</p>
          <Link to={createPageUrl("Dashboard")} className="mt-6"><Button variant="outline">Return to Dashboard</Button></Link>
        </div>
      );
    }

    return (
      <>
        {showGlobalSearch && <GlobalSearchModal />}
        {showClientForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <ClientForm onSubmit={handleClientFormSubmit} onCancel={handleClientFormCancel} />
          </div>
        )}
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-gray-50">
            <Sidebar className="border-r border-gray-200 bg-white">
              <SidebarHeader>
                <div className="flex items-center gap-3 p-4">
                  {console.log('Sidebar branding - logo:', getBranding('logo'), 'clinicName:', getBranding('clinicName'))}
                  {getBranding('logo') ? (
                    <img 
                      src={getBranding('logo')} 
                      alt="Clinic Logo" 
                      className="w-10 h-10 object-contain rounded-lg"
                      onError={(e) => {
                        console.warn('Logo failed to load:', getBranding('logo'));
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                      onLoad={() => {
                        console.log('Logo loaded successfully:', getBranding('logo'));
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBranding('logo') ? 'hidden' : ''}`}
                    style={{ backgroundColor: getColor('primary') }}
                  >
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-800">
                      {getBranding('clinicName') || window?.portalName || 'Clinic Portal'}
                    </h2>
                    <p className="text-xs text-gray-500">Staff Portal</p>
                  </div>
                </div>
              </SidebarHeader>
              <SidebarContent className="flex flex-col">
                <nav className="flex-1 px-4 py-4 space-y-2">
                  {/* Main Navigation Section */}
                  <div>
                    <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</p>
                    {adminNavigation
                      .filter((item) => staffSession?.permissions?.includes("all") || canAccess(item.title, staffSession.permissions))
                      .map((item) => (
                        <Link
                          key={item.title}
                          to={item.url}
                          onClick={handleNavLinkClick} // Added onClick to auto-close sidebar on mobile
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            location.pathname === item.url.split('?')[0]
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      ))}
                  </div>

                  {/* Collapsible Settings Section */}
                  <div>
                    <p className="px-4 pt-6 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</p>
                    <button
                      onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                      className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isSettingsOpen && (
                      <div className="pl-6 mt-1 space-y-1">
                        {settingsNavigation
                          .filter((item) => staffSession?.permissions?.includes("all") || canAccess(item.title, staffSession.permissions))
                          .map((item) => (
                            <Link
                              key={item.title}
                              to={item.url}
                              onClick={handleNavLinkClick} // Added onClick to auto-close sidebar on mobile
                              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                location.pathname.startsWith(item.url)
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                            >
                              <item.icon className="w-5 h-5" />
                              <span>{item.title}</span>
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>
                </nav>
              </SidebarContent>

              <SidebarFooter>
                <div className="px-3 py-4 space-y-2 text-center">
                  <p className="text-sm font-semibold">{staffSession.name}</p>
                  <p className="text-xs text-gray-500">{staffSession.role?.name || staffSession.role}</p>
                  <Button variant="outline" size="sm" onClick={handleLogout} className="w-full"><LogOut className="w-4 h-4 mr-2" />Sign Out</Button>
                </div>
              </SidebarFooter>
            </Sidebar>

            <main className="flex-1 flex flex-col overflow-hidden">
              {/* Top Bar with Main Menu Actions Moved to Left */}
              <div className="bg-white border-b border-gray-200 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SidebarTrigger className="sidebar-trigger lg:hidden hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" /> {/* Added className="sidebar-trigger" */}
                    
                    {/* Main Menu - Action Buttons */}
                    <button
                      onClick={() => setShowGlobalSearch(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    >
                      <Search className="w-4 h-4 text-green-600" />
                      <span>Search Client/Patient</span>
                    </button>
                    
                    <button
                      onClick={() => setShowClientForm(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                    >
                      <Plus className="w-4 h-4 text-purple-600" />
                      <span>Add New Client</span>
                    </button>
                  </div>
                  
                  {/* Right side is intentionally empty to push buttons to the left */}
                  <div></div>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-gray-50">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </>
    );
  }

  // Show client navigation only for client users (not staff)
  if (user && !staffSession) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50">
          <Sidebar className="border-r border-gray-200 bg-white">
            <SidebarHeader>
              <div className="flex items-center gap-2 px-2">
                <PawPrint className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-800">Pet Portal</h2>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <nav className="flex-1 px-4 py-4 space-y-1">
                <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</p>
                  {clientNavigation.map((item) => (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={handleNavLinkClick} // Added onClick to auto-close sidebar on mobile
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        location.pathname === item.url.split('?')[0]
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  ))}
              </nav>
            </SidebarContent>
            <SidebarFooter>
              <div className="px-3 py-4 space-y-2 text-center">
                <p className="text-sm font-semibold">{ClientSessionManager.getDisplayName()}</p>
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full"><LogOut className="w-4 h-4 mr-2" />Sign Out</Button>
              </div>
            </SidebarFooter>
          </Sidebar>
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <SidebarTrigger className="sidebar-trigger lg:hidden" /> {/* Added className="sidebar-trigger" */}
              <h1 className="text-xl font-semibold text-gray-800">{currentPageName === 'MyProfile' ? 'My Profile' : currentPageName}</h1>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p>Redirecting to home...</p>
      {(() => {
        if (typeof window !== 'undefined') {
          window.location.href = createPageUrl('Home');
        }
        return null;
      })()}
    </div>
  );
}
