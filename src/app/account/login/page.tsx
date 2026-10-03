"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { registerFreeAccount } from "@/app/actions/register";

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "48px",
  padding: "12px 16px",
  fontSize: "15px",
  fontFamily: "var(--font-body)",
  color: "#39292a",
  backgroundColor: "#ffffff",
  border: "1px solid rgba(57, 41, 42, 0.22)",
  borderRadius: "5px",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

function LoginForm() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<"en" | "es">("en");
  
  // Modes: "signin" | "create"
  const [mode, setMode] = useState<"signin" | "create">("signin");

  // Sign in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Create account state
  const [name, setName] = useState("");
  const [newsletter, setNewsletter] = useState(true);

  // Focus states for clean warm border (matching Claude design)
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    if (searchParams?.get("create") === "1") {
      setMode("create");
    }
  }, [searchParams]);

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

  const handleSignInSubmit = async (e: React.FormEvent) => {
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(
        lang === "en"
          ? "Please enter your name."
          : "Por favor escribe tu nombre."
      );
      return;
    }
    if (!email.trim()) {
      setErrorMsg(
        lang === "en"
          ? "Please enter your email address."
          : "Por favor escribe tu correo electrónico."
      );
      return;
    }
    if (password.length < 8) {
      setErrorMsg(
        lang === "en"
          ? "Passwords must be at least 8 characters."
          : "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await registerFreeAccount({
      name: name.trim(),
      email: email.trim(),
      password,
      letter: newsletter,
      locale: lang,
    });

    if (!res.success) {
      setLoading(false);
      if (res.error === "ACCOUNT_EXISTS") {
        setErrorMsg(
          lang === "en"
            ? "An account with this email already exists. Please sign in instead."
            : "Ya existe una cuenta con este correo. Por favor inicia sesión."
        );
        setMode("signin");
      } else {
        setErrorMsg(res.error || "Failed to create account. Please try again.");
      }
      return;
    }

    // Auto sign-in after successful registration
    const callbackUrl = searchParams?.get("callbackUrl");
    const targetRoute =
      callbackUrl && !callbackUrl.startsWith("/admin")
        ? callbackUrl
        : "/account";

    const loginRes = await signIn("member-credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (loginRes?.error) {
      setMode("signin");
      setErrorMsg(
        lang === "en"
          ? "Account created! Please sign in with your credentials."
          : "¡Cuenta creada! Por favor inicia sesión con tus datos."
      );
    } else {
      window.location.href = targetRoute;
    }
  };

  const getInputStyle = (fieldName: string): React.CSSProperties => {
    const isFocused = focusedField === fieldName;
    return {
      ...baseInputStyle,
      borderColor: isFocused ? "#8c6d48" : "rgba(57, 41, 42, 0.22)",
      boxShadow: isFocused ? "0 0 0 1px rgba(140, 109, 72, 0.25)" : "none",
    };
  };

  return (
    <div
      style={{
        backgroundColor: "#f8efe2",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(36px, 5vw, 64px) 24px",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
          gap: "clamp(32px, 5vw, 56px)",
          alignItems: "start",
        }}
      >
        {/* Left Column: Account Intro & New Here Box */}
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "12.5px",
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
            {lang === "en" ? "Welcome" : "Bienvenida"}
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
                ? "Open a free account to post in La Gazette, save events and book your place in one tap."
                : "Abre una cuenta gratuita para participar en La Gazette, guardar eventos y reservar tu plaza en un toque."}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                alignItems: "center",
                marginTop: "4px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  setErrorMsg(null);
                }}
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
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#456f04";
                  e.currentTarget.style.borderColor = "#456f04";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#568b05";
                  e.currentTarget.style.borderColor = "#568b05";
                }}
              >
                {lang === "en" ? "Open a free account" : "Abre una cuenta gratuita"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In / Create Account Card */}
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
          {mode === "signin" ? (
            <>
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
                onSubmit={handleSignInSubmit}
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
                    onFocus={() => setFocusedField("signin-email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder={lang === "en" ? "you@email.com" : "tu@correo.com"}
                    required
                    autoFocus
                    style={getInputStyle("signin-email")}
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
                        fontSize: "12.5px",
                        color: "#7b1f2c",
                        textDecoration: "none",
                        fontFamily: "var(--font-body)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
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
                      onFocus={() => setFocusedField("signin-password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder={lang === "en" ? "Your password" : "Tu contraseña"}
                      required
                      style={{
                        ...getInputStyle("signin-password"),
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
                    transition: "opacity 0.15s ease, background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#5e1621";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#5e1621";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7b1f2c";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#7b1f2c";
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
            </>
          ) : (
            <>
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 500,
                  fontSize: "26px",
                  color: "#39292a",
                  margin: "0 0 10px",
                }}
              >
                {lang === "en" ? "Open a free account" : "Abre una cuenta gratuita"}
              </h2>

              <p
                style={{
                  fontSize: "14.5px",
                  lineHeight: "1.6",
                  color: "rgba(57,41,42,0.76)",
                  margin: "0 0 20px",
                }}
              >
                {lang === "en"
                  ? "Post in La Gazette, keep your credits and book in one tap. No joining fee if you join before launch."
                  : "Publica en La Gazette, conserva tus créditos y reserva en un toque. Sin cuota de alta si te unes antes del lanzamiento."}
              </p>

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
                onSubmit={handleCreateSubmit}
                style={{ display: "flex", flexDirection: "column", gap: "18px" }}
              >
                {/* Name */}
                <div>
                  <label
                    htmlFor="create-name"
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
                    {lang === "en" ? "YOUR NAME" : "TU NOMBRE"}
                  </label>
                  <input
                    id="create-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedField("create-name")}
                    onBlur={() => setFocusedField(null)}
                    placeholder={lang === "en" ? "First and last name" : "Nombre y apellidos"}
                    required
                    autoFocus
                    style={getInputStyle("create-name")}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="create-email"
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
                    id="create-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("create-email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder={lang === "en" ? "you@email.com" : "tu@correo.com"}
                    required
                    style={getInputStyle("create-email")}
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="create-password"
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
                    {lang === "en" ? "PASSWORD" : "CONTRASEÑA"}
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      id="create-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("create-password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder={lang === "en" ? "At least eight characters" : "Al menos 8 caracteres"}
                      required
                      minLength={8}
                      style={{
                        ...getInputStyle("create-password"),
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

                {/* Newsletter Checkbox */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "13.5px",
                    lineHeight: "1.5",
                    cursor: "pointer",
                    color: "rgba(57,41,42,0.85)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newsletter}
                    onChange={(e) => setNewsletter(e.target.checked)}
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "#7b1f2c",
                      marginTop: "2px",
                      cursor: "pointer",
                    }}
                  />
                  <span>
                    {lang === "en"
                      ? "Tell me when membership opens and what's on each month."
                      : "Avísame cuando abra la membresía y de los eventos de cada mes."}
                  </span>
                </label>

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
                    transition: "opacity 0.15s ease, background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#5e1621";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#5e1621";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7b1f2c";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#7b1f2c";
                  }}
                >
                  {loading
                    ? lang === "en"
                      ? "Creating account..."
                      : "Creando cuenta..."
                    : lang === "en"
                    ? "Open my account"
                    : "Crear mi cuenta"}
                </button>

                {/* Back to sign in */}
                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.55",
                    color: "rgba(57,41,42,0.76)",
                    textAlign: "center",
                  }}
                >
                  {lang === "en" ? "Already have one? " : "¿Ya tienes cuenta? "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setErrorMsg(null);
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      fontFamily: "var(--font-body)",
                      fontSize: "14px",
                      color: "#7b1f2c",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    {lang === "en" ? "Sign in" : "Iniciar sesión"}
                  </button>
                </div>
              </form>
            </>
          )}
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
