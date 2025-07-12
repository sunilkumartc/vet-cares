import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Pages from "@/pages/index.jsx"
import LandingPage from "@/pages/LandingPage.jsx"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { TenantResolver } from "@/components/TenantResolver"

function App() {
  // Check if we're on the main domain (not a subdomain)
  const isMainDomain = window.location.hostname === 'vetvault.in' || 
                      window.location.hostname === 'www.vetvault.in' ||
                      window.location.hostname.includes('vercel.app');

  if (isMainDomain) {
    return (
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<LandingPage />} />
            <Route path="/features" element={<LandingPage />} />
            <Route path="/about" element={<LandingPage />} />
            <Route path="/contact" element={<LandingPage />} />
            <Route path="/login" element={<Pages />} />
            <Route path="/signup" element={<LandingPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
          <Toaster />
        </Router>
      </ThemeProvider>
    );
  }

  // For subdomains, use the existing app structure
  return (
    <ThemeProvider>
      <TenantResolver>
        <Pages />
        <Toaster />
      </TenantResolver>
    </ThemeProvider>
  )
}

export default App 