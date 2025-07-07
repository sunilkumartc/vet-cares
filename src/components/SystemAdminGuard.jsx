import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle } from "lucide-react";

export default function SystemAdminGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("systemAdminToken");
      const isSystemAdmin = localStorage.getItem("isSystemAdmin");

      if (!token || !isSystemAdmin) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Verify token with server
      const response = await fetch("http://localhost:3001/api/admin/verify", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        // Token invalid, clear storage
        localStorage.removeItem("systemAdminToken");
        localStorage.removeItem("systemAdminUser");
        localStorage.removeItem("isSystemAdmin");
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("systemAdminToken");
    localStorage.removeItem("systemAdminUser");
    localStorage.removeItem("isSystemAdmin");
    navigate("/system-admin-login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying system admin access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900 mt-4">
              Access Denied
            </CardTitle>
            <p className="text-gray-600 mt-2">
              You need system administrator privileges to access this page.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => navigate("/system-admin-login")}
              className="w-full"
            >
              Go to System Admin Login
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* System Admin Header */}
      <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <span className="font-semibold">System Admin Portal</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-white hover:bg-blue-700"
        >
          Logout
        </Button>
      </div>
      
      {/* Protected Content */}
      {children}
    </div>
  );
} 