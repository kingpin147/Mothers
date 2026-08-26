"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "es">("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg(
        lang === "en" ? "Please enter both email and password." : "Por favor escribe tu correo y contraseña."
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // 1. Try Member Credentials first
    let res = await signIn("member-credentials", {
      email,
      password,
      redirect: false,
    });

    let targetRoute = "/account";

    // 2. If member sign in failed, automatically try Admin Credentials
    if (res?.error) {
      res = await signIn("admin-credentials", {
        email,
        password,
        redirect: false,
      });
      targetRoute = "/admin";
    }

    setLoading(false);

    if (res?.error) {
      setErrorMsg(
        lang === "en"
          ? "Invalid email or password. Please check your credentials and try again."
          : "Correo o contraseña incorrectos. Por favor compruébalos e inténtalo de nuevo."
      );
    } else {
      router.push(targetRoute);
      router.refresh();
    }
  };

  return (
    <div style={{
      backgroundColor: "var(--color-bg)",
      minHeight: "85vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px"
    }}>
      <div className="card" style={{
        maxWidth: "460px",
        width: "100%",
        backgroundColor: "#fdf9f2",
        padding: "40px 32px",
        border: "1px solid var(--color-divider)"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img
            src="/assets/logo-mark-alpha.svg"
            alt="The Mothers"
            style={{ height: "56px", width: "auto", margin: "0 auto 16px" }}
          />
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "28px", marginBottom: "6px" }}>
            {lang === "en" ? "Sign In to The Mothers" : "Acceso a The Mothers"}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
            {lang === "en"
              ? "Sign in with your member or operator account."
              : "Introduce tu correo y contraseña para acceder."}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: "var(--color-status-cancelled)",
            color: "#993842",
            padding: "10px 14px",
            borderRadius: "4px",
            fontSize: "13.5px",
            marginBottom: "20px"
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              {lang === "en" ? "Email Address" : "Correo electrónico"}
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>
                {lang === "en" ? "Password" : "Contraseña"}
              </label>
              <Link
                href="/account/forgot-password"
                style={{ fontSize: "12px", color: "var(--color-accent)" }}
              >
                {lang === "en" ? "Forgot password?" : "¿Olvidaste la contraseña?"}
              </Link>
            </div>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", marginTop: "8px", fontSize: "15px" }}
          >
            {loading
              ? lang === "en" ? "Signing in..." : "Iniciando sesión..."
              : lang === "en" ? "Sign In" : "Entrar"}
          </button>
        </form>

        <div style={{
          marginTop: "24px",
          paddingTop: "16px",
          borderTop: "1px solid var(--color-divider)",
          textAlign: "center"
        }}>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
            {lang === "en" ? "Not a member yet?" : "¿Aún no eres socia?"}{" "}
            <Link href="/membership/apply" style={{ fontWeight: 600 }}>
              {lang === "en" ? "Apply to join" : "Solicitar membresía"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
