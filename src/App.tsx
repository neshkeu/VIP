import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { AppProvider } from "@/context/AppContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import DriversPage from "./pages/DriversPage";
import VehiclesPage from "./pages/VehiclesPage";
import CalendarPage from "./pages/CalendarPage";
import CashPage from "./pages/CashPage";
import DebtsPage from "./pages/DebtsPage";
import YandexPage from "./pages/YandexPage";
import CardsPage from "./pages/CardsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <AuthGuard>
                <AppLayout>
                  <Routes>
                    <Route path="/"         element={<Dashboard />} />
                    <Route path="/vehicles" element={<VehiclesPage />} />
                    <Route path="/drivers"  element={<DriversPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/cash"     element={<CashPage />} />
                    <Route path="/debts"    element={<DebtsPage />} />
                    <Route path="/yandex"   element={<YandexPage />} />
                    <Route path="/cards"    element={<CardsPage />} />
                    <Route path="*"         element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </AuthGuard>
            } />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
