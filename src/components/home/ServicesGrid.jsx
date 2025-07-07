
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Stethoscope, Smile, Heart, Sparkles, Siren, HeartHandshake, Utensils, Shield, Fingerprint, Home, Pill, Bone, Scissors, Award, HelpCircle, BriefcaseMedical, Syringe } from "lucide-react";
import { Service } from '@/api/tenant-entities';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const iconMap = {
  ShieldCheck, Stethoscope, Smile, Heart, Sparkles, Siren, HeartHandshake,
  Utensils, Shield, Fingerprint, Home, Pill, Bone, Scissors, Award,
  BriefcaseMedical, Syringe,
};

const Icon = ({ name, className }) => {
  const LucideIcon = iconMap[name] || HelpCircle;
  return <LucideIcon className={className} />;
};

const ServiceItem = ({ title, icon, link }) => {
  const content = (
    <div className="flex flex-col items-center text-center group">
      <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors duration-300 transform group-hover:scale-110">
        <Icon name={icon} className="w-10 h-10 text-blue-600" />
      </div>
      <p className="font-semibold text-gray-700 text-sm">{title}</p>
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8">
    {Array.from({ length: 16 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center">
        <Skeleton className="w-20 h-20 rounded-2xl mb-3" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

export default function ServicesGrid() {
  const [services, setServices] = useState({ clinical: [], additional: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const allServices = await Service.list();
        const clinical = allServices.filter(s => s.category === 'clinical_services');
        const additional = allServices.filter(s => s.category === 'additional_services');
        setServices({ clinical, additional });
      } catch (error) {
        console.error("Failed to fetch services:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-12">
      <div>
        <div className="flex items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Clinical Services</h3>
          <hr className="flex-grow ml-4 border-t border-gray-300" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8">
          {services.clinical.map(service => (
            <ServiceItem key={service.id} title={service.title} icon={service.icon} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Additional Services</h3>
          <hr className="flex-grow ml-4 border-t border-gray-300" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8">
          {services.additional.map(service => {
            // Add links for specific services
            let link = null;
            if (service.title === 'TenantPet Insurance') {
              link = createPageUrl('PetInsurance');
            } else if (service.title === 'DNA Trace') {
              link = createPageUrl('DNATTrace');
            }
            
            return <ServiceItem key={service.id} title={service.title} icon={service.icon} link={link} />;
          })}
        </div>
      </div>
    </div>
  );
}
