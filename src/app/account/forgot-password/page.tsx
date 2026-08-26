"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/passwordReset";

export default function ForgotPasswordPage() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg(
        lang === "en" ? "Please enter a valid email address." : "Por favor escribe un correo válido."
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const res = await requestPasswordReset(email, lang);
    setLoading(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      setErrorMsg(res.error || "Unable to send reset email. Please try again.");
    }
  };

  return (
    <div style={{
      backgroundColor: "var(--color-bg)",
      minHeight: "80vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px"
    }}>
      <div className="card" style={{
        maxWidth: "440px",
        width: "100%",
        backgroundColor: "#fdf9f2",
        padding: "40px 32px",
        border: "1px solid var(--color-divider)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src="/assets/logo-mark-alpha.svg"
            alt="The Mothers"
            style={{ height: "56px", width: "auto", margin: "0 auto 16px" }}
          />
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "28px", marginBottom: "6px" }}>
            {lang === "en" ? "Reset Your Password" : "Recuperar Contraseña"}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
            {lang === "en"
              ? "Enter your member email address and we'll send you a secure link to create a new password."
              : "Introduce tu correo de socia y te enviaremos un enlace seguro para crear una nueva contraseña."}
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{
              backgroundColor: "var(--color-status-confirmed)",
              color: "#285430",
              padding: "16px",
              borderRadius: "6px",
              fontSize: "14px",
              lineHeight: "1.6",
              marginBottom: "24px"
            }}>
              {lang === "en"
                ? `If an account exists for ${email}, a reset link has been sent. Please check your inbox and spam folder.`
                : `Si existe una cuenta asociada a ${email}, te hemos enviado un enlace. Por favor revisa tu bandeja de entrada.`}
            </div>
            <Link href="/account/login" className="btn btn-outline" style={{ width: "100%", textAlign: "center", fontSize: "14px" }}>
              ← {lang === "en" ? "Return to Sign In" : "Volver a Iniciar Sesión"}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {errorMsg && (
              <div style={{
                backgroundColor: "var(--color-status-cancelled)",
                color: "#993842",
                padding: "10px 14px",
                borderRadius: "4px",
                fontSize: "13.5px"
              }}>
                {errorMsg}
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", marginTop: "6px", fontSize: "15px" }}
            >
              {loading
                ? lang === "en" ? "Sending link..." : "Enviando enlace..."
                : lang === "en" ? "Send Reset Link →" : "Enviar Enlace de Recuperación →"}
            </button>

            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <Link href="/account/login" style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                ← {lang === "en" ? "Back to Sign In" : "Volver al acceso de socias"}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
