import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FcGoogle } from "react-icons/fc";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status: authStatus, login } = useAuth();
  const fromPath = useMemo(
    () =>
      typeof location.state?.from === "string" ? location.state.from : "/admin",
    [location.state]
  );
  const googleButtonRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(
    typeof window !== "undefined" && !!window.google
  );
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (authStatus === "authenticated") {
      navigate(fromPath, { replace: true });
    }
  }, [authStatus, fromPath, navigate]);

  const handleCredentialResponse = useCallback(
    async (response) => {
      const credential = response?.credential;
      if (!credential) {
        setError("Unable to retrieve Google credential. Please try again.");
        return;
      }

      setStatusMessage("Verifying your account...");
      setError("");

      try {
        const verifyResponse = await fetch(`${API_BASE_URL}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: credential }),
        });

        const data = await verifyResponse.json().catch(() => null);

        if (!verifyResponse.ok) {
          throw new Error(data?.reason || "Verification failed");
        }

        if (!data?.valid) {
          throw new Error(data?.reason || "Invalid token");
        }

        if (!data?.email) {
          throw new Error("No email returned from verification.");
        }

        login(data.email, credential);
        navigate(fromPath, { replace: true });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to sign in right now. Please try again.";
        setError(message);
      } finally {
        setStatusMessage("");
      }
    },
    [fromPath, navigate, login]
  );

  useEffect(() => {
    const scriptId = "google-identity-client";
    const handleScriptLoad = () => setScriptReady(true);

    if (window.google) {
      setScriptReady(true);
      return undefined;
    }

    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener("load", handleScriptLoad);
      return () => existing.removeEventListener("load", handleScriptLoad);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = scriptId;
    script.onload = handleScriptLoad;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.removeEventListener("load", handleScriptLoad);
    };
  }, []);

  useEffect(() => {
    const googleReady =
      scriptReady && !!GOOGLE_CLIENT_ID && typeof window !== "undefined";
    if (!googleReady || !googleButtonRef.current || !window.google?.accounts)
      return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      ux_mode: "popup",
    });

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: 360,
      shape: "pill",
      type: "standard",
      text: "continue_with",
    });
    window.google.accounts.id.prompt();
  }, [handleCredentialResponse, scriptReady]);

  const showConfigurationError = !GOOGLE_CLIENT_ID;

  return (
    <div className="mt-16 mb-16 flex h-full w-full items-center justify-center px-2 md:mx-0 md:px-0 lg:mb-10 lg:items-center lg:justify-start">
      <div className="mt-[10vh] w-full max-w-full flex-col items-center md:pl-4 lg:pl-0 xl:max-w-[420px]">
        <h4 className="mb-2.5 text-4xl font-bold text-navy-700 dark:text-white">
          Sign In
        </h4>
        <p className="mb-9 ml-1 text-base text-gray-600">
          Use Google to access your Fine-tune account.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex w-full items-center justify-left">
            <div
              ref={googleButtonRef}
              className="flex w-full justify-left"
            />
          </div>

          {(!scriptReady || !window.google?.accounts || !GOOGLE_CLIENT_ID) && (
            <button
              type="button"
              onClick={() => window.google?.accounts?.id?.prompt?.()}
              className="linear flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-[12px] text-base font-medium text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-navy-800 dark:text-white"
              disabled={!scriptReady || !window.google?.accounts}
            >
              <FcGoogle className="text-xl" />
              {scriptReady && window.google?.accounts
                ? "Launch Google Sign-In"
                : "Loading Google Sign-In..."}
            </button>
          )}

          {showConfigurationError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 dark:border-red-400/40 dark:bg-red-900/30 dark:text-red-200">
              Google OAuth is not configured. Set REACT_APP_GOOGLE_CLIENT_ID to
              enable sign-in.
            </div>
          )}

          {statusMessage && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-700 dark:border-blue-400/40 dark:bg-blue-900/40 dark:text-blue-100">
              {statusMessage}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 dark:border-red-400/40 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
