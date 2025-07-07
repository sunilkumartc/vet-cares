import React, { useState, useEffect } from "react";
import { TenantReportTemplate } from "@/api/tenant-entities";
import ReportTemplateSettings from "../components/diagnostic/ReportTemplateSettings";

export default function ReportTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templateData = await TenantReportTemplate.list();
      setTemplates(templateData);
    } catch (error) {
      console.error('Error loading report templates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <ReportTemplateSettings
        templates={templates}
        // The onSubmit handler in the component will refetch the templates internally
        // So we just pass a function to trigger re-render if needed, or it can be empty
        onSubmit={loadTemplates}
      />
    </div>
  );
}