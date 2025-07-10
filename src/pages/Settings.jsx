import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, Bell, Database } from 'lucide-react';
import VaccineManagement from '../components/settings/VaccineManagement';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('vaccines');

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your clinic's settings and configurations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vaccines" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Vaccines
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vaccines" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Vaccine Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VaccineManagement />
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">WhatsApp Notifications</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure WhatsApp notification settings for invoices, medical records, and reminders.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Send invoice notifications</span>
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Send medical record notifications</span>
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Send vaccination reminders</span>
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                    </div>

                  </div>
                </div>
                

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Storage</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">S3 Bucket</span>
                        <span className="text-sm font-mono">vetinvoice</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Region</span>
                        <span className="text-sm font-mono">eu-north-1</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Files uploaded</span>
                        <span className="text-sm font-mono">1,234</span>
                      </div>
                    </div>
                  </div>
                  

                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">WhatsApp Integration</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Status and configuration of WhatsApp Business API integration.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Status</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600">Connected</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Messages sent today</span>
                      <span className="text-sm font-mono">23</span>
                    </div>

                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 