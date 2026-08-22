"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getPublicEvents } from "@/app/actions/events";

interface EventItem {
  id: string;
  title: string;
  category: string;
  stage: string;
  neighbourhood: string;
  dateStr: string;
  timeStr: string;
  creditCost: number;
  isFreeWalk: boolean;
  isSignature: boolean;
  status: "confirmed" | "published_pending" | "cancelled" | "completed";
  capacityMember: number;
  bookedMember: number;
  guestPriceCents: number;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  stageAffinity?: string | null;
}

export default function EventsCalendarPage() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLang = localStorage.getItem("tm_lang");
    if (savedLang === "es" || savedLang === "en") {
      setLang(savedLang);
    }

    async function loadData() {
      setLoading(true);
      const res = await getPublicEvents();
      setLoading(false);
      if (res.success) {
        setEvents(res.events as any || []);
        setCategories(res.categories || []);
      }
    }
    loadData();
  }, []);

  const filteredEvents = selectedCategory === "All"
    ? events
    : events.filter((e) => e.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "64px clamp(24px, 5vw, 64px) 96px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-accent-2)",
            marginBottom: "8px"
          }}>
            {lang === "en" ? "Barcelona Events Calendar" : "Calendario de Eventos en Barcelona"}
          </div>
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(32px, 4vw, 44px)",
            fontWeight: 400,
            color: "var(--color-text-main)",
            marginBottom: "12px"
          }}>
            {lang === "en" ? "Small rooms, easy conversations." : "Salas íntimas, conversaciones fáciles."}
          </h1>
          <p style={{
            fontSize: "15.5px",
            color: "var(--color-text-muted)",
            maxWidth: "580px",
            margin: "0 auto",
            lineHeight: 1.6
          }}>
            {lang === "en"
              ? "All events are priced explicitly in credits. Meeting points are released to confirmed attendees prior to the event."
              : "Todos los eventos tienen precio transparente en créditos. La dirección exacta se comparte con las asistentes confirmadas."}
          </p>
        </div>

        {/* Dynamic Category Filter Chips */}
        <div style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "40px"
        }}>
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`btn ${selectedCategory === "All" ? "btn-primary" : "btn-secondary"}`}
            style={{
              padding: "8px 18px",
              fontSize: "13.5px",
              borderRadius: "999px",
            }}
          >
            {lang === "en" ? "All" : "Todos"}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`btn ${selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "btn-primary" : "btn-secondary"}`}
              style={{
                padding: "8px 18px",
                fontSize: "13.5px",
                borderRadius: "999px",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="card" style={{ padding: "64px", textAlign: "center", backgroundColor: "#fff" }}>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px", color: "var(--color-accent)" }}>
              {lang === "en" ? "Loading Barcelona club calendar..." : "Cargando calendario del club en Barcelona..."}
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="card" style={{ padding: "64px", textAlign: "center", backgroundColor: "#fff" }}>
            <h3 style={{ fontSize: "20px", color: "var(--color-accent)" }}>
              {lang === "en" ? "No events scheduled in this category" : "No hay eventos programados en esta categoría"}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginTop: "8px" }}>
              {lang === "en" ? "Select 'All' to browse all upcoming gatherings." : "Selecciona 'Todos' para ver los próximos encuentros."}
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "28px",
          }}>
            {filteredEvents.map((evt) => {
              const spotsLeft = Math.max(0, evt.capacityMember - evt.bookedMember);
              const isPending = evt.status === "published_pending";

              return (
                <div
                  key={evt.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "28px",
                    backgroundColor: "#ffffff",
                    position: "relative",
                    border: "1px solid var(--color-divider)",
                  }}
                >
                  <div>
                    {/* Top status & credits row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: isPending ? "#fef7ee" : "var(--color-status-confirmed)",
                          color: isPending ? "#8a5800" : "#285430",
                        }}
                      >
                        {isPending
                          ? lang === "en" ? "Pending Min. Threshold" : "Pendiente de Mínimo"
                          : lang === "en" ? "Confirmed" : "Confirmado"}
                      </span>

                      <span style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--color-accent)",
                      }}>
                        {evt.isFreeWalk
                          ? lang === "en" ? "Included" : "Incluido"
                          : `${evt.creditCost} credits`}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "20px",
                      lineHeight: 1.3,
                      marginBottom: "12px",
                      color: "var(--color-text-main)",
                    }}>
                      {evt.title}
                    </h3>

                    {/* Metadata */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
                      <div>📅 {evt.dateStr} · {evt.timeStr}</div>
                      <div>📍 {evt.neighbourhood}</div>
                      <div>👶 {evt.stage}</div>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--color-divider)",
                  }}>
                    <span style={{ fontSize: "13px", color: spotsLeft <= 3 ? "var(--color-accent)" : "var(--color-text-muted)", fontWeight: spotsLeft <= 3 ? 600 : 400 }}>
                      {spotsLeft} {lang === "en" ? "spots left" : "plazas disponibles"}
                    </span>

                    <Link
                      href={`/events/${evt.id}`}
                      className="btn btn-outline"
                      style={{ padding: "8px 16px", fontSize: "13px" }}
                    >
                      {lang === "en" ? "View & Book" : "Ver y Reservar"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
