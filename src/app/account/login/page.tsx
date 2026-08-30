"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  // Redirect if already authenticated
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
        backgroundColor: "#FEFDF9",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Page label */}
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "12px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent, #7b1f2c)",
            marginBottom: "14px",
          }}
        >
          {lang === "en" ? "MEMBER ACCOUNT" : "CUENTA DE SOCIA"}
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(34px, 6vw, 46px)",
            fontWeight: 400,
            lineHeight: 1.1,
            color: "#39292a",
            margin: "0 0 14px",
          }}
        >
          {lang === "en" ? "Welcome back." : "Bienvenida de nuevo."}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "15px",
            lineHeight: "1.6",
            color: "rgba(57,41,42,0.62)",
            margin: "0 0 32px",
          }}
        >
          {lang === "en"
            ? "Log in to view your credits and your upcoming experiences."
            : "Inicia sesión para ver tus créditos y tus próximas experiencias."}
        </p>

        {/* Card */}
        <div
          style={{
            backgroundColor: "#fdf9f2",
            border: "1px solid rgba(57,41,42,0.14)",
            borderRadius: "8px",
            padding: "clamp(28px, 5vw, 40px)",
            textAlign: "left",
          }}
        >
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
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#39292a",
                  marginBottom: "7px",
                  fontFamily: "var(--font-body)",
                }}
              >
                {lang === "en" ? "Email" : "Correo electrónico"}
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === "en" ? "you@email.com" : "tu@correo.com"}
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
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#39292a",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {lang === "en" ? "Password" : "Contraseña"}
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
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px 24px",
                marginTop: "4px",
                border: "1px solid #7b1f2c",
                backgroundColor: "transparent",
                color: "#7b1f2c",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "15px",
                borderRadius: "4px",
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.02em",
                transition: "background-color 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7b1f2c";
                  (e.currentTarget as HTMLButtonElement).style.color = "#f8efe2";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#7b1f2c";
              }}
            >
              {loading
                ? lang === "en"
                  ? "Logging in..."
                  : "Iniciando sesión..."
                : lang === "en"
                ? "Log in"
                : "Entrar"}
            </button>
          </form>

          {/* Footer link */}
          <p
            style={{
              fontSize: "13px",
              color: "rgba(57,41,42,0.62)",
              margin: "20px 0 0",
              textAlign: "center",
              lineHeight: 1.55,
            }}
          >
            {lang === "en" ? "Not a member?" : "¿No eres socia?"}{" "}
            <Link
              href="/events"
              style={{
                color: "#7b1f2c",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                fontWeight: 500,
              }}
            >
              {lang === "en"
                ? "Take a €35 Event Pass for a single event"
                : "Compra un Event Pass por 35€ para un evento"}
            </Link>
          </p>
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
            backgroundColor: "#FEFDF9",
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
