"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "48px",
  padding: "12px 16px",
  fontSize: "15px",
  fontFamily: "var(--font-body)",
  color: "#39292a",
  backgroundColor: "#ffffff",
  border: "1px solid rgba(57,41,42,0.22)",
  borderRadius: "5px",
  boxSizing: "border-box",
  outline: "none",
};

function LoginForm() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<"en" | "es">("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  // Handle authenticated redirects
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as any)?.role;
      const isAdmin =
        role === "owner" ||
        role === "manager" ||
        role === "host" ||
        role === "super_admin";
      const callbackUrl = searchParams?.get("callbackUrl");

      if (isAdmin) {
        window.location.href = callbackUrl || "/admin";
      } else {
        const memberTarget =
          callbackUrl && !callbackUrl.startsWith("/admin")
            ? callbackUrl
            : "/account";
        window.location.href = memberTarget;
      }
    }
  }, [status, session, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg(
        lang === "en"
          ? "Please enter both email and password."
          : "Por favor escribe tu correo y contraseña."
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const callbackUrl = searchParams?.get("callbackUrl");

    // 1. Try Member Credentials first
    let res = await signIn("member-credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    let targetRoute =
      callbackUrl && !callbackUrl.startsWith("/admin")
        ? callbackUrl
        : "/account";

    // 2. If member sign in failed, automatically try Admin Credentials
    if (res?.error) {
      res = await signIn("admin-credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      targetRoute = callbackUrl || "/admin";
    }

    setLoading(false);

    if (res?.error) {
      setErrorMsg(
        lang === "en"
          ? "Invalid email or password. Please check your credentials and try again."
          : "Correo o contraseña incorrectos. Por favor compruébalos e inténtalo de nuevo."
      );
    } else {
      window.location.href = targetRoute;
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f8efe2",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "920px",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
          gap: "clamp(32px, 5vw, 56px)",
          alignItems: "center",
        }}
      >
        {/* Left Column: Account Intro & New Here Box */}
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent, #7b1f2c)",
              marginBottom: "12px",
            }}
          >
            {lang === "en" ? "YOUR ACCOUNT" : "TU CUENTA"}
          </div>

          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(36px, 5vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "#39292a",
              margin: "0 0 14px",
            }}
          >
            {lang === "en" ? "Welcome back." : "Bienvenida de nuevo."}
          </h1>

          <p
            style={{
              fontSize: "16px",
              lineHeight: "1.6",
              color: "rgba(57,41,42,0.72)",
              margin: "0 0 28px",
              maxWidth: "42ch",
            }}
          >
            {lang === "en"
              ? "Sign in to see your bookings, your credits and your invite code."
              : "Inicia sesión para ver tus reservas, tus créditos y tu código de invitación."}
          </p>

          {/* New Here Card */}
          <div
            style={{
              backgroundColor: "rgba(86, 139, 5, 0.08)",
              border: "1px solid rgba(86, 139, 5, 0.3)",
              borderRadius: "8px",
              padding: "24px 26px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxWidth: "440px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "18px",
                color: "#39292a",
                margin: 0,
              }}
            >
              {lang === "en" ? "New here?" : "¿Eres nueva?"}
            </h3>

            <p
              style={{
                fontSize: "14.5px",
                lineHeight: "1.55",
                color: "rgba(57,41,42,0.78)",
                margin: 0,
              }}
            >
              {lang === "en"
                ? "Book your first event and your account comes with it — or open a free account now to post in The Circle. No joining fee if you join before launch."
                : "Reserva tu primer evento y tu cuenta vendrá incluida — o crea una cuenta gratuita para participar en The Circle. Sin cuota de alta si te unes antes del lanzamiento."}
            </p>

            <div style={{ marginTop: "4px" }}>
              <Link
                href="/events"
                style={{
                  display: "inline-block",
                  padding: "11px 20px",
                  backgroundColor: "#568b05",
                  color: "#ffffff",
                  border: "1px solid #568b05",
                  borderRadius: "4px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  textDecoration: "none",
                  transition: "background-color 0.15s ease",
                }}
              >
                {lang === "en" ? "Book your first event" : "Reserva tu primer evento"}
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Form Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(57,41,42,0.16)",
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(57, 41, 42, 0.05)",
            padding: "clamp(28px, 4vw, 38px)",
            textAlign: "left",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 500,
              fontSize: "26px",
              color: "#39292a",
              margin: "0 0 20px",
            }}
          >
            {lang === "en" ? "Sign in" : "Iniciar sesión"}
          </h2>

          {/* Error message */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: "rgba(153,56,66,0.07)",
                border: "1px solid rgba(153,56,66,0.25)",
                color: "#993842",
                padding: "11px 14px",
                borderRadius: "5px",
                fontSize: "13.5px",
                marginBottom: "20px",
                lineHeight: 1.5,
              }}
            >
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#39292a",
                  marginBottom: "7px",
                  fontFamily: "var(--font-body)",
                }}
              >
                {lang === "en" ? "EMAIL" : "CORREO ELECTRÓNICO"}
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === "en" ? "rachel@aqg.gmail.com" : "tu@correo.com"}
                required
                autoFocus
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: "7px",
                }}
              >
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#39292a",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {lang === "en" ? "PASSWORD" : "CONTRASEÑA"}
                </label>
                <Link
                  href="/account/forgot-password"
                  style={{
                    fontSize: "12px",
                    color: "rgba(57,41,42,0.55)",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  {lang === "en" ? "Forgot password?" : "¿Olvidaste la contraseña?"}
                </Link>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    ...inputStyle,
                    paddingRight: "44px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword
                      ? lang === "en"
                        ? "Hide password"
                        : "Ocultar contraseña"
                      : lang === "en"
                      ? "Show password"
                      : "Ver contraseña"
                  }
                  title={
                    showPassword
                      ? lang === "en"
                        ? "Hide password"
                        : "Ocultar contraseña"
                      : lang === "en"
                      ? "Show password"
                      : "Ver contraseña"
                  }
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: "6px",
                    cursor: "pointer",
                    color: "rgba(57, 41, 42, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#39292a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(57, 41, 42, 0.5)";
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.75} />
                  ) : (
                    <Eye size={18} strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px 24px",
                marginTop: "6px",
                border: "1px solid #7b1f2c",
                backgroundColor: "#7b1f2c",
                color: "#f8efe2",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "15.5px",
                borderRadius: "4px",
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.02em",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.92";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              }}
            >
              {loading
                ? lang === "en"
                  ? "Signing in..."
                  : "Iniciando sesión..."
                : lang === "en"
                ? "Sign in"
                : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8efe2",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              border: "2px solid rgba(57,41,42,0.2)",
              borderTop: "2px solid #7b1f2c",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
