"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyResetToken, completePasswordReset } from "@/app/actions/passwordReset";

export default function ResetPasswordPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [memberInfo, setMemberInfo] = useState<{ email: string; firstName: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "es">("en");

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    async function checkToken() {
      if (!token) return;
      const res = await verifyResetToken(token);
      setLoading(false);
      if (res.valid) {
        setTokenValid(true);
        setMemberInfo({ email: res.email || "", firstName: res.firstName || "Member" });
      } else {
        setTokenValid(false);
      }
    }
    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg(
        lang === "en" ? "Password must be at least 8 characters long." : "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(
        lang === "en" ? "Passwords do not match." : "Las contraseñas no coinciden."
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const res = await completePasswordReset(token, password);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setErrorMsg(res.error || "Failed to update password. Link may have expired.");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>Verifying password reset link...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{ maxWidth: "520px", margin: "80px auto", padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontSize: "28px", color: "var(--color-accent)", marginBottom: "12px" }}>
          {lang === "en" ? "Link Expired or Invalid" : "Enlace Caducado o Inválido"}
        </h2>
        <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "28px" }}>
          {lang === "en"
            ? "This password reset link is invalid or has expired (links expire after 2 hours). Please request a new one."
            : "Este enlace de recuperación no es válido o ha caducado (caducan a las 2 horas). Por favor solicita uno nuevo."}
        </p>
        <Link href="/account/forgot-password" className="btn btn-primary">
          {lang === "en" ? "Request New Reset Link" : "Solicitar Nuevo Enlace"}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ maxWidth: "520px", margin: "80px auto", padding: "32px", textAlign: "center" }}>
        <div style={{
          backgroundColor: "var(--color-status-confirmed)",
          color: "#285430",
          display: "inline-block",
          padding: "6px 14px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "uppercase",
          marginBottom: "16px"
        }}>
          {lang === "en" ? "Password Updated" : "Contraseña Actualizada"}
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", marginBottom: "16px" }}>
          {lang === "en" ? "Your password has been changed" : "Tu contraseña ha sido modificada"}
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "32px" }}>
          {lang === "en"
            ? "You can now sign in to your member account with your new credentials."
            : "Ya puedes iniciar sesión en tu cuenta de socia con tu nueva contraseña."}
        </p>
        <Link href="/account/login" className="btn btn-primary" style={{ padding: "12px 28px" }}>
          {lang === "en" ? "Sign In to Account →" : "Iniciar Sesión →"}
        </Link>
      </div>
    );
  }

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
        maxWidth: "460px",
        width: "100%",
        backgroundColor: "#fdf9f2",
        padding: "40px 32px",
        border: "1px solid var(--color-divider)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600, marginBottom: "6px" }}>
            The Mothers · Security
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "28px", margin: "0 0 6px" }}>
            {lang === "en" ? "Choose a New Password" : "Crear Nueva Contraseña"}
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--color-text-muted)", margin: 0 }}>
            {lang === "en"
              ? `Account: ${memberInfo?.email}`
              : `Cuenta: ${memberInfo?.email}`}
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
              {lang === "en" ? "New Password (min. 8 characters)" : "Nueva Contraseña (mín. 8 caracteres)"}
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              {lang === "en" ? "Confirm New Password" : "Confirmar Nueva Contraseña"}
            </label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", marginTop: "8px", fontSize: "15px" }}
          >
            {submitting
              ? lang === "en" ? "Updating..." : "Actualizando..."
              : lang === "en" ? "Update Password →" : "Actualizar Contraseña →"}
          </button>
        </form>
      </div>
    </div>
  );
}
