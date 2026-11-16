"use client";

import React, { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/passwordReset";
import { BackArrow, ForwardArrow } from "@/components/Icons";
import { useLanguage } from "@/components/LanguageProvider";

export default function ForgotPasswordPage() {
  const { language } = useLanguage();
  const lang: "en" | "es" | "fr" = (language === "es" || language === "fr") ? language : "en";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = {
    en: {
      title: "Reset Your Password",
      subtitle: "Enter your member email address and we'll send you a secure link to create a new password.",
      invalidEmail: "Please enter a valid email address.",
      submittedMsg: (emailAddr: string) =>
        `If an account exists for ${emailAddr}, a reset link has been sent. Please check your inbox and spam folder.`,
      returnToSignIn: "Return to Sign In",
      emailLabel: "Email Address",
      sendingLink: "Sending link...",
      sendLink: "Send Reset Link",
      backToSignIn: "Back to Sign In",
      rateLimitMsg: "Too many password reset requests. Please wait a few minutes before trying again.",
      fallbackError: "Unable to send reset email right now. Please wait a moment and try again.",
    },
    es: {
      title: "Recuperar Contraseña",
      subtitle: "Introduce tu correo de socia y te enviaremos un enlace seguro para crear una nueva contraseña.",
      invalidEmail: "Por favor escribe un correo válido.",
      submittedMsg: (emailAddr: string) =>
        `Si existe una cuenta asociada a ${emailAddr}, te hemos enviado un enlace. Por favor revisa tu bandeja de entrada y spam.`,
      returnToSignIn: "Volver a Iniciar Sesión",
      emailLabel: "Correo electrónico",
      sendingLink: "Enviando enlace...",
      sendLink: "Enviar Enlace de Recuperación",
      backToSignIn: "Volver al acceso de socias",
      rateLimitMsg: "Demasiadas solicitudes de recuperación. Por favor espera unos minutos antes de volver a intentarlo.",
      fallbackError: "No se pudo enviar el correo de recuperación en este momento. Por favor inténtalo de nuevo en unos minutos.",
    },
    fr: {
      title: "Réinitialiser votre mot de passe",
      subtitle: "Saisissez votre adresse email de membre et nous vous enverrons un lien sécurisé pour créer un nouveau mot de passe.",
      invalidEmail: "Veuillez entrer une adresse email valide.",
      submittedMsg: (emailAddr: string) =>
        `Si un compte existe pour ${emailAddr}, un lien de réinitialisation vous a été envoyé. Veuillez vérifier votre boîte de réception et vos spams.`,
      returnToSignIn: "Retour à la connexion",
      emailLabel: "Adresse email",
      sendingLink: "Envoi du lien...",
      sendLink: "Envoyer le lien de réinitialisation",
      backToSignIn: "Retour à la connexion",
      rateLimitMsg: "Trop de demandes de réinitialisation. Veuillez patienter quelques minutes avant de réessayer.",
      fallbackError: "Impossible d'envoyer l'email de réinitialisation pour le moment. Veuillez patienter un instant et réessayer.",
    },
  }[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg(t.invalidEmail);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await requestPasswordReset(cleanEmail, lang);
      setLoading(false);

      if (res.success) {
        setSubmitted(true);
      } else {
        const raw = res.error || "";
        if (raw && raw.toLowerCase().includes("too many")) {
          setErrorMsg(t.rateLimitMsg);
        } else {
          setErrorMsg(t.fallbackError);
        }
      }
    } catch {
      setLoading(false);
      setErrorMsg(t.fallbackError);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--color-bg)",
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "440px",
          width: "100%",
          backgroundColor: "#fdf9f2",
          padding: "40px 32px",
          border: "1px solid var(--color-divider)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src="/assets/logo-mark-alpha.svg"
            alt="The Mothers"
            style={{ height: "56px", width: "auto", margin: "0 auto 16px" }}
          />
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "28px", marginBottom: "6px" }}>
            {t.title}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
            {t.subtitle}
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div
              style={{
                backgroundColor: "var(--color-status-confirmed)",
                color: "#285430",
                padding: "16px",
                borderRadius: "6px",
                fontSize: "14px",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}
            >
              {t.submittedMsg(email.trim().toLowerCase())}
            </div>
            <Link
              href="/account/login"
              className="btn btn-outline"
              style={{
                width: "100%",
                textAlign: "center",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <BackArrow /> {t.returnToSignIn}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {errorMsg && (
              <div
                style={{
                  backgroundColor: "var(--color-status-cancelled)",
                  color: "#993842",
                  padding: "10px 14px",
                  borderRadius: "4px",
                  fontSize: "13.5px",
                }}
              >
                {errorMsg}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                {t.emailLabel}
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
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                fontSize: "15px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                t.sendingLink
              ) : (
                <>
                  {t.sendLink} <ForwardArrow />
                </>
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <Link
                href="/account/login"
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <BackArrow /> {t.backToSignIn}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
