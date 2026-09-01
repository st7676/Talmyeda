import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { token, claims } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (roles && claims && !roles.includes(claims.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
