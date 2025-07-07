import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Clients from "./Clients";

import Appointments from "./Appointments";

import Pets from "./Pets";

import MedicalRecords from "./MedicalRecords";

import Vaccinations from "./Vaccinations";

import Billing from "./Billing";

import InvoiceDetails from "./InvoiceDetails";

import MyPets from "./MyPets";

import PetDetails from "./PetDetails";

import MedicalHistory from "./MedicalHistory";

import MyInvoices from "./MyInvoices";

import Home from "./Home";

import StaffManagement from "./StaffManagement";

import StaffLogin from "./StaffLogin";

import StaffDashboard from "./StaffDashboard";

import PetInsurance from "./PetInsurance";

import DNATrace from "./DNATrace";

import PetMedicalHistory from "./PetMedicalHistory";

import ClientDetails from "./ClientDetails";

import ClientManagement from "./ClientManagement";

import SalesDispense from "./SalesDispense";

import InventoryManagement from "./InventoryManagement";

import VaccineSettings from "./VaccineSettings";

import DiagnosticReports from "./DiagnosticReports";

import ReportTemplates from "./ReportTemplates";

import MyProfile from "./MyProfile";

import Analytics from "./Analytics";
import TenantManagement from "./TenantManagement";
import SystemAdminLogin from "./SystemAdminLogin";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Clients: Clients,
    
    Appointments: Appointments,
    
    Pets: Pets,
    
    MedicalRecords: MedicalRecords,
    
    Vaccinations: Vaccinations,
    
    Billing: Billing,
    
    InvoiceDetails: InvoiceDetails,
    
    MyPets: MyPets,
    
    PetDetails: PetDetails,
    
    MedicalHistory: MedicalHistory,
    
    MyInvoices: MyInvoices,
    
    Home: Home,
    
    StaffManagement: StaffManagement,
    
    StaffLogin: StaffLogin,
    
    StaffDashboard: StaffDashboard,
    
    PetInsurance: PetInsurance,
    
    DNATrace: DNATrace,
    
    PetMedicalHistory: PetMedicalHistory,
    
    ClientDetails: ClientDetails,
    
    ClientManagement: ClientManagement,
    
    SalesDispense: SalesDispense,
    
    InventoryManagement: InventoryManagement,
    
    VaccineSettings: VaccineSettings,
    
    DiagnosticReports: DiagnosticReports,
    
    ReportTemplates: ReportTemplates,
    
    MyProfile: MyProfile,
    
    Analytics: Analytics,
    TenantManagement: TenantManagement,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/Appointments" element={<Appointments />} />
                
                <Route path="/Pets" element={<Pets />} />
                
                <Route path="/MedicalRecords" element={<MedicalRecords />} />
                
                <Route path="/Vaccinations" element={<Vaccinations />} />
                
                <Route path="/Billing" element={<Billing />} />
                
                <Route path="/InvoiceDetails" element={<InvoiceDetails />} />
                
                <Route path="/MyPets" element={<MyPets />} />
                
                <Route path="/PetDetails" element={<PetDetails />} />
                
                <Route path="/MedicalHistory" element={<MedicalHistory />} />
                
                <Route path="/MyInvoices" element={<MyInvoices />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/StaffManagement" element={<StaffManagement />} />
                
                <Route path="/StaffLogin" element={<StaffLogin />} />
                
                <Route path="/StaffDashboard" element={<StaffDashboard />} />
                
                <Route path="/PetInsurance" element={<PetInsurance />} />
                
                <Route path="/DNATrace" element={<DNATrace />} />
                
                <Route path="/PetMedicalHistory" element={<PetMedicalHistory />} />
                
                <Route path="/ClientDetails" element={<ClientDetails />} />
                
                <Route path="/ClientManagement" element={<ClientManagement />} />
                
                <Route path="/SalesDispense" element={<SalesDispense />} />
                
                <Route path="/InventoryManagement" element={<InventoryManagement />} />
                
                <Route path="/VaccineSettings" element={<VaccineSettings />} />
                
                <Route path="/DiagnosticReports" element={<DiagnosticReports />} />
                
                <Route path="/ReportTemplates" element={<ReportTemplates />} />
                
                <Route path="/MyProfile" element={<MyProfile />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/TenantManagement" element={<TenantManagement />} />
                
                {/* System Admin Routes */}
                <Route path="/system-admin-login" element={<SystemAdminLogin />} />
                <Route path="/tenant-management" element={<TenantManagement />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}