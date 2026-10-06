"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicClubSettings } from "@/app/actions/adminSettings";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * Admin-only mode banner. Shown under the header on every /admin page,
 * in place of the public countdown banner.
 */
export function AdminModeBanner() {
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const { language: lang } = useLanguage();

  useEffect(() => {
    getPublicClubSettings()
      .then((s) => setIsLive(!!s.membershipLive))
      .catch(() => setIsLive(false));
  }, []);

  if (isLive === null) return null;

  const linkStyle: React.CSSProperties = { color: "#c9a227", textDecoration: "underline", textUnderlineOffset: "2px" };

  const isFr = lang === "fr";
  const isEs = lang === "es";

  const liveBadge = isFr ? "ADHÉSION ACTIVE" : isEs ? "MEMBRESÍA ACTIVA" : "MEMBERSHIP LIVE";
  const preBadge = isFr ? "MODE PRÉ-ADHÉSION" : isEs ? "MODO PRE-MEMBRESÍA" : "PRE-MEMBERSHIP MODE";

  const preTextBefore = isFr
    ? "· Jusqu’à l’activation de l’adhésion dans "
    : isEs
    ? "· Hasta que actives la membresía en "
    : "· Until you activate membership in ";

  const settingsLabel = isFr ? "Paramètres" : isEs ? "Ajustes" : "Settings";

  const preTextAfter = isFr
    ? ". Les abonnements et frais d’adhésion sont prêts mais restent en sommeil jusqu’au lancement ; les mères s’abonnent depuis Mon Compte, sans candidature, sans pass — les non-membres réservent avec des crédits au tarif non-membre."
    : isEs
    ? ". Las suscripciones y cuotas de alta están listas pero inactivas hasta el lanzamiento; las madres se suscriben desde Mi Cuenta, sin solicitud, sin pase — las no socias reservan con créditos a precio de no socia."
    : ". Subscriptions and joining fees are built and kept ready, but stay dormant until launch; mothers subscribe from My Account, no application, No Event Pass — non-members book with credits at the non-member price.";

  const liveTextBefore = isFr
    ? "· Les abonnements et tarifs membres / non-membres sont actifs sur tout le site. Modifiez cela dans "
    : isEs
    ? "· Las suscripciones y precios para socias / no socias están activos en todo el sitio. Modifícalo en "
    : "· Subscriptions and member / non-member prices are active across the site. Change this in ";

  const deskCta = isFr ? "Bureau de pré-lancement →" : isEs ? "Mostrador de prelanzamiento →" : "Pre-launch desk →";

  return (
    <div style={{ background: "#2e1e1e", color: "#f8efe2" }}>
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "13px clamp(18px,4vw,34px)",
          fontSize: "12.5px",
          lineHeight: 1.6,
          fontFamily: "'Lora', Georgia, serif",
        }}
      >
        <div>
          <strong style={{ fontWeight: 600, color: "#c9a227", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "11px" }}>
            {isLive ? liveBadge : preBadge}
          </strong>{" "}
          {isLive ? (
            <>
              {liveTextBefore}
              <Link href="/admin/settings" style={linkStyle}>{settingsLabel}</Link>.
            </>
          ) : (
            <>
              {preTextBefore}
              <Link href="/admin/settings" style={linkStyle}>{settingsLabel}</Link>
              {preTextAfter}
            </>
          )}
        </div>
        {!isLive && (
          <Link
            href="/admin/pre-launch"
            style={{
              display: "inline-block",
              marginTop: "8px",
              color: "#f8efe2",
              border: "1px solid rgba(248,239,226,0.4)",
              borderRadius: "4px",
              padding: "4px 12px",
              whiteSpace: "nowrap",
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: "12px",
              textDecoration: "none",
            }}
          >
            {deskCta}
          </Link>
        )}
      </div>
    </div>
  );
}
