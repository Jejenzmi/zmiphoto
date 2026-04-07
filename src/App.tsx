import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import KioskPage from "./pages/KioskPage";
import AdminPage from "./pages/AdminPage";
import GalleryPage from "./pages/GalleryPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VenueDashboard from "./pages/VenueDashboard";
import PartnerDashboard from "./pages/PartnerDashboard";
import OperatorDashboard from "./pages/OperatorDashboard";
import SuperadminDashboard from "./pages/SuperadminDashboard";
import DisplayPage from "./pages/DisplayPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30000,
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<ErrorBoundary><KioskPage /></ErrorBoundary>} />
              <Route path="/kiosk" element={<Navigate to="/" replace />} />
              <Route path="/kiosk/:kioskCode" element={<ErrorBoundary><KioskPage /></ErrorBoundary>} />
              <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AdminPage /></ProtectedRoute>} />
              <Route path="/operator" element={<ProtectedRoute allowedRoles={["operator", "admin", "superadmin"]}><OperatorDashboard /></ProtectedRoute>} />
              <Route path="/venue" element={<ProtectedRoute allowedRoles={["venue", "admin", "superadmin"]}><VenueDashboard /></ProtectedRoute>} />
              <Route path="/partner" element={<ProtectedRoute allowedRoles={["partner", "admin", "superadmin"]}><PartnerDashboard /></ProtectedRoute>} />
              <Route path="/superadmin" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperadminDashboard /></ProtectedRoute>} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/display/:kioskCode" element={<DisplayPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
