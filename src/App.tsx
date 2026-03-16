import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import DriversPage from "./pages/DriversPage";
import VehiclesPage from "./pages/VehiclesPage";
import CalendarPage from "./pages/CalendarPage";
import CashPage from "./pages/CashPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <AuthGuard>
              <AppLayout>
                <Routes>
                  <Route path="/"          element={<Dashboard />} />
                  <Route path="/drivers"   element={<DriversPage />} />
                  <Route path="/vehicles"  element={<VehiclesPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/cash"     element={<CashPage />} />
                  <Route path="*"          element={<NotFound />} />
                </Routes>
              </AppLayout>
            </AuthGuard>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
