import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Syringe, CreditCard, Heart, Phone, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const quickActions = [
  {
    title: "Book TenantAppointment",
    description: "Schedule a visit for your pet",
    icon: Calendar,
    color: "from-blue-500 to-blue-600",
    hoverColor: "hover:from-blue-600 hover:to-blue-700",
    link: "MyAppointments"
  },
  {
    title: "Medical History",
    description: "View past treatments & records",
    icon: FileText,
    color: "from-green-500 to-green-600", 
    hoverColor: "hover:from-green-600 hover:to-green-700",
    link: "MedicalHistory"
  },
  {
    title: "TenantVaccination Schedule",
    description: "Check upcoming vaccines",
    icon: Syringe,
    color: "from-purple-500 to-purple-600",
    hoverColor: "hover:from-purple-600 hover:to-purple-700", 
    link: "MyVaccinations"
  },
  {
    title: "Invoices & Bills",
    description: "View payment history",
    icon: CreditCard,
    color: "from-orange-500 to-orange-600",
    hoverColor: "hover:from-orange-600 hover:to-orange-700",
    link: "MyInvoices" 
  }
];

export default function QuickActions({ pets }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-pink-500" />
        Quick Actions
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link key={action.title} to={createPageUrl(action.link)}>
            <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/70 backdrop-blur-sm border-0 overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      {/* Emergency Contact */}
      <Card className="mt-6 bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-semibold text-red-800">Emergency?</h4>
              <p className="text-sm text-red-600">Call us immediately for urgent care</p> 
            </div>
          </div>
          <div className="flex gap-2">
            <a href="tel:08296143115">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                Call Now
              </Button>
            </a>
            <a 
              href="https://wa.me/918296143115?text=EMERGENCY:%20I%20need%20urgent%20help%20with%20my%20pet" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}