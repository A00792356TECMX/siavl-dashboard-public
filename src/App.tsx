import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Expedientes from "./pages/Expedientes";
import Pagos from "./pages/Pagos";
import Lotes from "./pages/Lotes";
import Documentos from "./pages/Documentos";
import CLG from "./pages/CLG";
import PlaceholderModule from "./pages/PlaceholderModule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/usuarios"
              element={
                <DashboardLayout>
                  <Usuarios />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/expedientes"
              element={
                <DashboardLayout>
                  <Expedientes />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/pagos"
              element={
                <DashboardLayout>
                  <Pagos />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/lotes"
              element={
                <DashboardLayout>
                  <Lotes />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/documentos"
              element={
                <DashboardLayout>
                  <Documentos />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/clg"
              element={
                <DashboardLayout>
                  <CLG />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/notificaciones"
              element={
                <DashboardLayout>
                  <PlaceholderModule 
                    title="Notificaciones" 
                    description="Centro de notificaciones del sistema"
                  />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/logs"
              element={
                <DashboardLayout>
                  <PlaceholderModule 
                    title="Logs del Sistema" 
                    description="Historial de actividad y auditoría"
                  />
                </DashboardLayout>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
