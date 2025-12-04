import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import RtlLayout from "layouts/rtl";
import AdminLayout from "layouts/admin";
import AuthLayout from "layouts/auth";
import { useAuth } from "context/AuthContext";

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-lightPrimary text-lg font-semibold text-navy-700 dark:bg-navy-900 dark:text-white">
        Checking your session...
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        to="/auth/sign-in"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
};

const App = () => {
  return (
    <Routes>
      <Route path="auth/*" element={<AuthLayout />} />
      <Route
        path="admin/*"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      />
      <Route
        path="rtl/*"
        element={
          <RequireAuth>
            <RtlLayout />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/auth/sign-in" replace />} />
    </Routes>
  );
};

export default App;
