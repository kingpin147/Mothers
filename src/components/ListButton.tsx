"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export interface ListButtonProps {
  tone?: "outline" | "filled" | "gold";
  label?: string;
  source?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ListButton({
  tone = "outline",
  label,
  source = "site",
  className = "",
  style = {},
}: ListButtonProps) {
  const { data: session } = useSession();
  const { language: lang } = useLanguage();
  const isEn = lang === "en";

  const [mode, setMode] = useState<"idle" | "asking" | "done">("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isWaitlisted, setIsWaitlisted] = useState(false);

  const dark = tone === "gold";

  const checkStatus = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("tm_pre_joined_list") === "true";
    setIsWaitlisted(saved);
  };

  useEffect(() => {
    checkStatus();

    import("@/app/actions/adminSettings").then(({ getPublicClubSettings }) => {
      getPublicClubSettings().then((s) => {
        if (s.membershipLive) setIsLive(true);
      }).catch(() => {});
    });

    const handleSync = () => checkStatus();
    window.addEventListener("tmp_list_joined", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("tmp_list_joined", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const isMember = (session?.user as any)?.role === "member" && !!(session?.user as any)?.memberId;

  const currentMode = mode === "asking" ? "asking" : isWaitlisted && !isLive ? "done" : "idle";

  const join = async (targetEmail: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail.trim().toLowerCase(), source }),
      });
      if (res.ok) {
        localStorage.setItem("tm_pre_joined_list", "true");
        setIsWaitlisted(true);
        setMode("idle");
        setError("");
        window.dispatchEvent(new Event("tmp_list_joined"));
      } else {
        setError(isEn ? "Could not join list. Try again." : "No se pudo unir a la lista.");
      }
    } catch {
      setError(isEn ? "Something went wrong." : "Algo ha fallado.");
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    const v = email.trim();
    if (!v || !v.includes("@") || !v.includes(".")) {
      setError(isEn ? "Please enter a valid email." : "Por favor, introduce un correo válido.");
      return;
    }
    join(v);
  };

  const handleClick = () => {
    if (isLive) {
      if (!isMember) {
        window.location.href = "/membership";
      }
      return;
    }
    // Signed in user: one-click join with their email
    if (session?.user?.email && !isWaitlisted) {
      join(session.user.email);
      return;
    }
    setMode("asking");
    setError("");
  };

  const handleRemoveFromList = () => {
    localStorage.removeItem("tm_pre_joined_list");
    setIsWaitlisted(false);
    setEmail("");
    setError("");
    setMode("idle");
    window.dispatchEvent(new Event("tmp_list_joined"));
  };

  const defaultLabel = isLive
    ? isMember
      ? (isEn ? "You're a member" : "Ya eres socia")
      : (isEn ? "Become a member" : "Hazte socia")
    : label || (isEn ? "Join the list" : "Unirme a la lista");

  const doneColor = dark ? "#c9a227" : "#3b5e04";
  const doneBg = dark ? "rgba(201,162,39,0.12)" : "rgba(86,139,5,0.08)";
  const mutedColor = dark ? "rgba(248,239,226,0.78)" : "rgba(57,41,42,0.72)";
  const errorColor = dark ? "#f0b8bf" : "#993842";

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: "8px 10px",
        alignItems: "center",
        fontFamily: "'Lora', Georgia, serif",
        ...style,
      }}
    >
      {currentMode === "idle" && (
        <>
          {tone === "outline" && (
            <button
              type="button"
              onClick={handleClick}
              style={{
                border: "1px solid #7b1f2c",
                background: "transparent",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "12px 24px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(123,31,44,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {defaultLabel}
            </button>
          )}

          {tone === "filled" && (
            <button
              type="button"
              onClick={handleClick}
              style={{
                border: "1px solid #7b1f2c",
                background: "#7b1f2c",
                color: "#fdf8f2",
                borderRadius: "4px",
                padding: "12px 22px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#5e1621";
                e.currentTarget.style.borderColor = "#5e1621";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#7b1f2c";
                e.currentTarget.style.borderColor = "#7b1f2c";
              }}
            >
              {defaultLabel}
            </button>
          )}

          {tone === "gold" && (
            <button
              type="button"
              onClick={handleClick}
              style={{
                flex: "none",
                border: "1px solid #c9a227",
                background: "transparent",
                color: "#c9a227",
                borderRadius: "4px",
                padding: "11px 22px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14.5px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#c9a227";
                e.currentTarget.style.color = "#39292a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#c9a227";
              }}
            >
              {defaultLabel}
            </button>
          )}
        </>
      )}

      {currentMode === "asking" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") {
                  setMode("idle");
                  setError("");
                }
              }}
              placeholder={isEn ? "you@email.com" : "tu@correo.com"}
              aria-label="Your email"
              style={{
                width: "230px",
                maxWidth: "100%",
                border: `1px solid ${error ? "#993842" : "rgba(57,41,42,0.28)"}`,
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                padding: "11px 13px",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14.5px",
                color: "#39292a",
                outline: "none",
                boxShadow: error ? "0 0 0 2px rgba(153,56,66,0.2)" : "none",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.currentTarget.style.borderColor = "#c9a227";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(201, 162, 39, 0.35)";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.currentTarget.style.borderColor = "rgba(57,41,42,0.28)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            />

            {dark ? (
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                style={{
                  border: "1px solid #c9a227",
                  backgroundColor: "#c9a227",
                  color: "#39292a",
                  borderRadius: "4px",
                  padding: "11px 18px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  whiteSpace: "nowrap",
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? (isEn ? "Joining…" : "Uniéndome…") : isEn ? "Join" : "Unirme"}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                style={{
                  border: "1px solid #7b1f2c",
                  backgroundColor: "#7b1f2c",
                  color: "#fdf8f2",
                  borderRadius: "4px",
                  padding: "11px 18px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  whiteSpace: "nowrap",
                  cursor: loading ? "wait" : "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#5e1621")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#7b1f2c")}
              >
                {loading ? (isEn ? "Joining…" : "Uniéndome…") : isEn ? "Join" : "Unirme"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setError("");
              }}
              style={{
                border: "none",
                background: "transparent",
                padding: "4px",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "13px",
                color: mutedColor,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                cursor: "pointer",
              }}
            >
              {isEn ? "Cancel" : "Cancelar"}
            </button>
          </div>

          {error && (
            <div style={{ fontSize: "12.5px", color: errorColor, marginTop: "2px" }}>
              {error}
            </div>
          )}
        </div>
      )}

      {currentMode === "done" && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: `1px solid ${doneColor}`,
            backgroundColor: doneBg,
            borderRadius: "4px",
            padding: "0 0 0 14px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "15px",
            color: doneColor,
            whiteSpace: "nowrap",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span style={{ paddingLeft: "2px" }}>
            {isEn ? "You're on the list" : "Estás en la lista"}
          </span>
          <button
            type="button"
            onClick={handleRemoveFromList}
            aria-label="Leave list"
            title={isEn ? "Clear status" : "Borrar estado"}
            style={{
              width: "40px",
              height: "40px",
              border: "none",
              background: "transparent",
              color: doneColor,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              borderRadius: "4px",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
