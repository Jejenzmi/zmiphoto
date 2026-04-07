import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

type AllowedRole = "superadmin" | "admin" | "operator" | "venue" | "partner";

interface Props {
  children: ReactNode;
  allowedRoles?: AllowedRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    const roleRoutes: Record<string, string> = {
      superadmin: "/superadmin",
      admin: "/admin",
      operator: "/operator",
      venue: "/venue",
      partner: "/partner",
    };
    return <Navigate to={roleRoutes[userRole] || "/"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
