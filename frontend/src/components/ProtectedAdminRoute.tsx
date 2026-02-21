import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { User } from '../types/AuthTypes';

interface ProtectedAdminRouteProps {
  children: ReactNode;
  user: User | null | undefined;
}

const ProtectedAdminRoute = ({ children, user }: ProtectedAdminRouteProps) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
