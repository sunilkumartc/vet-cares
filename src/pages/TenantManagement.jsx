import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Edit, Trash2, Eye, Settings, Users, Building, Globe, Palette, 
  CheckCircle, XCircle, AlertTriangle, BarChart3, CreditCard, Shield,
  Activity, Database, Zap, Calendar, DollarSign, TrendingUp, AlertCircle,
  Mail, Phone, MapPin, Clock, Star, Download, Upload, RefreshCw
} from "lucide-react";
import { dbUtils } from "@/api/mongodb.js";
import { TenantManager } from "@/lib/tenant";
import SystemAdminGuard from "@/components/SystemAdminGuard";

function TenantManagementContent() {
  const [tenants, setTenants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    timezone: 'UTC',
    currency: 'USD',
    language: 'en',
    theme_json: JSON.stringify(TenantManager.getDefaultTheme(), null, 2),
    features_json: JSON.stringify({
      appointments: true,
      billing: true,
      inventory: true,
      analytics: true,
      staffManagement: true,
      clientPortal: true,
      telemedicine: false,
      labIntegration: false,
      pharmacyIntegration: false
    }, null, 2),
    billing_plan: 'basic',
    status: 'active',
    max_staff: 10,
    max_clients: 1000,
    max_storage_gb: 10,
    custom_branding: false,
    sso_enabled: false,
    api_access: false
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      await dbUtils.connect();
      const collection = dbUtils.getCollection('tenants');
      const tenantData = await collection.find({}).toArray();
      setTenants(dbUtils.formatResponse(tenantData));
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const tenantData = {
        ...formData,
        theme_json: formData.theme_json,
        features_json: formData.features_json,
        created_date: editingTenant ? editingTenant.created_date : new Date().toISOString(),
        updated_date: new Date().toISOString()
      };

      await dbUtils.connect();
      const collection = dbUtils.getCollection('tenants');
      
      if (editingTenant) {
        await collection.updateOne(
          { _id: await dbUtils.toObjectId(editingTenant.id) },
          { $set: tenantData }
        );
      } else {
        await collection.insertOne({
          _id: await dbUtils.generateId(),
          ...dbUtils.addTimestamps(tenantData)
        });
      }

      setShowForm(false);
      setEditingTenant(null);
      resetForm();
      loadTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      alert('Failed to save tenant. Please try again.');
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name || '',
      slug: tenant.slug || '',
      domain: tenant.domain || '',
      contact_email: tenant.contact_email || '',
      contact_phone: tenant.contact_phone || '',
      address: tenant.address || '',
      timezone: tenant.timezone || 'UTC',
      currency: tenant.currency || 'USD',
      language: tenant.language || 'en',
      theme_json: tenant.theme_json || JSON.stringify(TenantManager.getDefaultTheme(), null, 2),
      features_json: tenant.features_json || JSON.stringify({}, null, 2),
      billing_plan: tenant.billing_plan || 'basic',
      status: tenant.status || 'active',
      max_staff: tenant.max_staff || 10,
      max_clients: tenant.max_clients || 1000,
      max_storage_gb: tenant.max_storage_gb || 10,
      custom_branding: tenant.custom_branding || false,
      sso_enabled: tenant.sso_enabled || false,
      api_access: tenant.api_access || false
    });
    setShowForm(true);
  };

  const handleDelete = async (tenant) => {
    if (confirm(`Are you sure you want to delete ${tenant.name}? This action cannot be undone and will permanently remove all tenant data.`)) {
      try {
        await dbUtils.connect();
        const collection = dbUtils.getCollection('tenants');
        await collection.deleteOne({ _id: await dbUtils.toObjectId(tenant.id) });
        loadTenants();
      } catch (error) {
        console.error('Error deleting tenant:', error);
        alert('Failed to delete tenant. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      domain: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      theme_json: JSON.stringify(TenantManager.getDefaultTheme(), null, 2),
      features_json: JSON.stringify({
        appointments: true,
        billing: true,
        inventory: true,
        analytics: true,
        staffManagement: true,
        clientPortal: true,
        telemedicine: false,
        labIntegration: false,
        pharmacyIntegration: false
      }, null, 2),
      billing_plan: 'basic',
      status: 'active',
      max_staff: 10,
      max_clients: 1000,
      max_storage_gb: 10,
      custom_branding: false,
      sso_enabled: false,
      api_access: false
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: XCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      suspended: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getBillingPlanBadge = (plan) => {
    const planConfig = {
      basic: { color: 'bg-blue-100 text-blue-800', label: 'Basic' },
      professional: { color: 'bg-purple-100 text-purple-800', label: 'Professional' },
      enterprise: { color: 'bg-orange-100 text-orange-800', label: 'Enterprise' }
    };
    
    const config = planConfig[plan] || planConfig.basic;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.domain?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedTenants = [...filteredTenants].sort((a, b) => {
    const aValue = a[sortBy] || '';
    const bValue = b[sortBy] || '';
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getTenantStats = (tenant) => {
    return {
      staff_count: tenant.staff_count || 0,
      client_count: tenant.client_count || 0,
      appointment_count: tenant.appointment_count || 0,
      revenue: tenant.revenue || 0,
      storage_used: tenant.storage_used || 0,
      last_activity: tenant.last_activity || tenant.updated_date
    };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4">Loading tenants...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-600 mt-2">Manage multi-tenant clinics and their configurations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadTenants}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="created_date">Created Date</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="billing_plan">Billing Plan</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedTenants.map((tenant) => {
          const stats = getTenantStats(tenant);
          return (
            <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    <p className="text-sm text-gray-600">{tenant.slug}.base44.com</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(tenant.status)}
                    {getBillingPlanBadge(tenant.billing_plan)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" />
                  <span>{tenant.domain || 'No custom domain'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{stats.staff_count} staff</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building className="w-4 h-4" />
                    <span>{stats.client_count} clients</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{stats.appointment_count} appointments</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>${stats.revenue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Database className="w-4 h-4" />
                  <span>{stats.storage_used}GB / {tenant.max_storage_gb || 10}GB</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Last active: {new Date(stats.last_activity).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setActiveTab("overview");
                    }}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(tenant)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://${tenant.slug}.base44.com`, '_blank')}
                    className="flex-1"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Launch
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(tenant)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tenant Details Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  {selectedTenant.name} - Tenant Details
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTenant(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{getTenantStats(selectedTenant).staff_count}</div>
                        <div className="text-sm text-gray-600">Staff Members</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Building className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">{getTenantStats(selectedTenant).client_count}</div>
                        <div className="text-sm text-gray-600">Clients</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold">{getTenantStats(selectedTenant).appointment_count}</div>
                        <div className="text-sm text-gray-600">Appointments</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold">${getTenantStats(selectedTenant).revenue.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Revenue</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span>{selectedTenant.contact_email || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span>{selectedTenant.contact_phone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{selectedTenant.address || 'Not provided'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Timezone:</span>
                          <span>{selectedTenant.timezone || 'UTC'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Currency:</span>
                          <span>{selectedTenant.currency || 'USD'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Language:</span>
                          <span>{selectedTenant.language || 'en'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Storage Used:</span>
                          <span>{getTenantStats(selectedTenant).storage_used}GB / {selectedTenant.max_storage_gb || 10}GB</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Usage Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                          <div className="text-lg font-semibold">Monthly Active Users</div>
                          <div className="text-2xl font-bold text-blue-600">247</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <Activity className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <div className="text-lg font-semibold">API Calls</div>
                          <div className="text-2xl font-bold text-green-600">12.5K</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                          <div className="text-lg font-semibold">Growth Rate</div>
                          <div className="text-2xl font-bold text-purple-600">+15%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="billing" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Billing Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Current Plan</h4>
                          {getBillingPlanBadge(selectedTenant.billing_plan)}
                          <p className="text-sm text-gray-600 mt-2">
                            {selectedTenant.billing_plan === 'basic' && 'Basic features for small clinics'}
                            {selectedTenant.billing_plan === 'professional' && 'Advanced features for growing clinics'}
                            {selectedTenant.billing_plan === 'enterprise' && 'Full features for large clinics'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Usage Limits</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Staff Members:</span>
                              <span>{getTenantStats(selectedTenant).staff_count} / {selectedTenant.max_staff || 10}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Clients:</span>
                              <span>{getTenantStats(selectedTenant).client_count} / {selectedTenant.max_clients || 1000}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Storage:</span>
                              <span>{getTenantStats(selectedTenant).storage_used}GB / {selectedTenant.max_storage_gb || 10}GB</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">User Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">User management features will be implemented here.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tenant Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Features</h4>
                          <div className="space-y-2">
                            {Object.entries(JSON.parse(selectedTenant.features_json || '{}')).map(([feature, enabled]) => (
                              <div key={feature} className="flex items-center gap-2">
                                <CheckCircle className={`w-4 h-4 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Customization</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Palette className="w-4 h-4" />
                              <span>Custom Branding: {selectedTenant.custom_branding ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span>SSO: {selectedTenant.sso_enabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              <span>API Access: {selectedTenant.api_access ? 'Enabled' : 'Disabled'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Security & Compliance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Security Status</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>SSL Certificate: Valid</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Data Encryption: Enabled</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Backup: Daily</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Compliance</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>HIPAA Compliant</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>GDPR Compliant</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>ISO 27001</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tenant Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Clinic Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          placeholder="Enter clinic name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="slug">Subdomain Slug *</Label>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="clinic-name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="domain">Custom Domain (Optional)</Label>
                      <Input
                        id="domain"
                        value={formData.domain}
                        onChange={(e) => handleChange('domain', e.target.value)}
                        placeholder="petsrus.com"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <select
                          id="status"
                          value={formData.status}
                          onChange={(e) => handleChange('status', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="billing_plan">Billing Plan</Label>
                        <select
                          id="billing_plan"
                          value={formData.billing_plan}
                          onChange={(e) => handleChange('billing_plan', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="basic">Basic</option>
                          <option value="professional">Professional</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <select
                          id="timezone"
                          value={formData.timezone}
                          onChange={(e) => handleChange('timezone', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_email">Contact Email</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          value={formData.contact_email}
                          onChange={(e) => handleChange('contact_email', e.target.value)}
                          placeholder="contact@clinic.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_phone">Contact Phone</Label>
                        <Input
                          id="contact_phone"
                          value={formData.contact_phone}
                          onChange={(e) => handleChange('contact_phone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Enter clinic address"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <select
                          id="currency"
                          value={formData.currency}
                          onChange={(e) => handleChange('currency', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CAD">CAD (C$)</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <select
                          id="language"
                          value={formData.language}
                          onChange={(e) => handleChange('language', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="space-y-4">
                    <div>
                      <Label htmlFor="features_json">Features Configuration (JSON)</Label>
                      <Textarea
                        id="features_json"
                        value={formData.features_json}
                        onChange={(e) => handleChange('features_json', e.target.value)}
                        rows={8}
                        placeholder="Enter features JSON configuration"
                      />
                    </div>

                    <div>
                      <Label htmlFor="theme_json">Theme Configuration (JSON)</Label>
                      <Textarea
                        id="theme_json"
                        value={formData.theme_json}
                        onChange={(e) => handleChange('theme_json', e.target.value)}
                        rows={8}
                        placeholder="Enter theme JSON configuration"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="max_staff">Max Staff Members</Label>
                        <Input
                          id="max_staff"
                          type="number"
                          value={formData.max_staff}
                          onChange={(e) => handleChange('max_staff', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_clients">Max Clients</Label>
                        <Input
                          id="max_clients"
                          type="number"
                          value={formData.max_clients}
                          onChange={(e) => handleChange('max_clients', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="max_storage_gb">Max Storage (GB)</Label>
                      <Input
                        id="max_storage_gb"
                        type="number"
                        value={formData.max_storage_gb}
                        onChange={(e) => handleChange('max_storage_gb', parseInt(e.target.value))}
                        min="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="custom_branding"
                          checked={formData.custom_branding}
                          onChange={(e) => handleChange('custom_branding', e.target.checked)}
                        />
                        <Label htmlFor="custom_branding">Enable Custom Branding</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="sso_enabled"
                          checked={formData.sso_enabled}
                          onChange={(e) => handleChange('sso_enabled', e.target.checked)}
                        />
                        <Label htmlFor="sso_enabled">Enable SSO</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="api_access"
                          checked={formData.api_access}
                          onChange={(e) => handleChange('api_access', e.target.checked)}
                        />
                        <Label htmlFor="api_access">Enable API Access</Label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingTenant ? 'Update Tenant' : 'Create Tenant'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingTenant(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function TenantManagement() {
  return (
    <SystemAdminGuard>
      <TenantManagementContent />
    </SystemAdminGuard>
  );
} 