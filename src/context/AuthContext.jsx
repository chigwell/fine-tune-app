import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearAuth,
  getAuthEmail,
  getAuthToken,
  isTokenExpired,
  setAuthSession,
} from "utils/auth";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const AuthContext = createContext({
  status: "checking",
  email: "",
  login: () => {},
  logout: () => {},
  refreshAuth: () => Promise.resolve(),
});

export const AuthProvider = ({ children }) => {
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState(getAuthEmail());
  const navigate = useNavigate();
  const location = useLocation();

  const validateSession = useCallback(async () => {
    const token = getAuthToken();
    const storedEmail = getAuthEmail();

    if (!token || !storedEmail) {
      clearAuth();
      setStatus("unauthenticated");
      setEmail("");
      return;
    }

    if (isTokenExpired(token)) {
      clearAuth();
      setStatus("unauthenticated");
      setEmail("");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.valid && data?.email) {
        setAuthSession(data.email, token);
        setEmail(data.email);
        setStatus("authenticated");
      } else {
        clearAuth();
        setEmail("");
        setStatus("unauthenticated");
      }
    } catch (err) {
      // On network issues, fall back to existing session without clearing to avoid flapping.
      if (email) {
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    }
  }, [email]);

  useEffect(() => {
    validateSession();
  }, [location.pathname, validateSession]);

  const login = useCallback((nextEmail, token) => {
    setAuthSession(nextEmail, token);
    setEmail(nextEmail);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setEmail("");
    setStatus("unauthenticated");
    navigate("/auth/sign-in");
  }, [navigate]);

  const value = useMemo(
    () => ({
      status,
      email,
      login,
      logout,
      refreshAuth: validateSession,
    }),
    [status, email, login, logout, validateSession]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
