
import React from 'react';
import { Navigate } from 'https://esm.sh/react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';
import { User } from '../types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: User['role'][];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner text="Authenticating..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If user's role is not in the allowed list, redirect them to the home page.
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;