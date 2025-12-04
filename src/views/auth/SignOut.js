import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// Replace this import with your real logout function or auth context hook

import { useAuth } from "context/AuthContext";

export default function SignOut() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  useEffect(() => {
    // Call your logout logic (clear tokens, inform server, etc.)
    if (typeof logout === "function") {
      try {
        logout();
      } catch (e) {
        // swallow errors or log them as needed
      }
    } else {
      // fallback: remove common token storage
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    }

    // Redirect to sign-in
    navigate("/auth/sign-in", { replace: true });
  }, [navigate, logout]);

  // no UI needed
  return null;
}
