"use client";

import React, { useState } from "react";
import { joinWaitlist } from "@/app/actions/waitlist";
import { Locale } from "@/lib/i18n";
import { tStr } from "@/lib/i18nEngine";

export function WaitlistForm({ lang }: { lang: Locale }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;

    const res = await joinWaitlist({ firstName, lastName, email });

    if (res.success) {
      setSuccess(true);
    } else {
      setError(
        lang === "en"
          ? "Something went wrong. Please try again."
          : "Algo salió mal. Por favor, inténtalo de nuevo."
      );
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={{ backgroundColor: "var(--color-status-confirmed)", padding: "20px", borderRadius: "8px", border: "1px solid rgba(86,139,5,0.3)", color: "var(--color-accent-2)" }}>
        <h4 style={{ margin: "0 0 8px", fontSize: "16px", color: "var(--color-accent-2)" }}>
          {lang === "en" ? "You're on the list!" : "¡Estás en la lista!"}
        </h4>
        <p style={{ margin: 0, fontSize: "14px" }}>
          {lang === "en" 
            ? "We will notify you as soon as a spot opens up." 
            : "Te avisaremos en cuanto se libere una plaza."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.5)", padding: "24px", borderRadius: "8px", border: "1px solid var(--color-divider)" }}>
      <h4 style={{ margin: "0 0 16px", fontSize: "16px", fontFamily: "var(--font-heading)" }}>
        {lang === "fr" ? "Rejoindre la liste d'attente" : lang === "es" ? "Únete a la Lista de Espera" : "Join the Waitlist"}
      </h4>
      {error && (
        <div style={{ color: "var(--color-accent)", fontSize: "13px", marginBottom: "12px" }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <input 
            type="text" 
            name="firstName" 
            placeholder={tStr("First name", lang)} 
            className="input" 
            required 
          />
          <input 
            type="text" 
            name="lastName" 
            placeholder={tStr("Last name", lang)} 
            className="input" 
            required 
          />
        </div>
        <input 
          type="email" 
          name="email" 
          placeholder={tStr("Your email", lang)} 
          className="input" 
          required 
        />
        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "4px" }}
        >
          {loading 
            ? (lang === "en" ? "Joining..." : "Uniéndose...") 
            : (lang === "en" ? "Join Waitlist" : "Unirse a la lista")}
        </button>
      </form>
    </div>
  );
}
