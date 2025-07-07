import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { TenantResolver } from "@/components/TenantResolver"

function App() {
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