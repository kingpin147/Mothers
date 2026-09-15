"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminFaqs, saveFaq, toggleFaqActive, deleteFaq } from "@/app/actions/adminCms";
import { FAQ_GROUPS } from "@/lib/faqData";
import { BackArrow, ForwardArrow } from "@/components/Icons";

const WINE = "#7b1f2c";
const AMBER = "#a8752c";
const GREEN = "#3f6604";
const GREY = "rgba(57,41,42,0.55)";

const GROUP_ORDER = FAQ_GROUPS;
const POLICY_RE = /€\s?\d|\b\d+\s?(credits?|months?|hours?|days?)\b/i;

export default function AdminFaqPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Composer State
  const [composing, setComposing] = useState(false);
  const [draftQ, setDraftQ] = useState("");
  const [draftGroup, setDraftGroup] = useState<string>("Joining");
  const [draftA, setDraftA] = useState("");
  const [draftQes, setDraftQes] = useState("");
  const [draftAes, setDraftAes] = useState("");
  const [draftTried, setDraftTried] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Edit State
  const [openId, setOpenId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editGroup, setEditGroup] = useState("Joining");
  const [editA, setEditA] = useState("");
  const [editQes, setEditQes] = useState("");
  const [editAes, setEditAes] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchFaqs = async () => {
    setLoading(true);
    const res = await getAdminFaqs();
    setLoading(false);
    if (res.success && res.faqs) {
      setFaqs(res.faqs);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  // --- Stats ---
  const totalCount = faqs.length;
  const publishedCount = faqs.filter((f) => f.active).length;
  const draftCount = totalCount - publishedCount;
  const missingEsCount = faqs.filter((f) => !f.questionEs || f.questionEs.trim() === "").length;
  const policyCount = faqs.filter((f) => POLICY_RE.test(f.answerEn || "")).length;

  // --- Filtering ---
  const q = query.trim().toLowerCase();

  const matchItem = (f: any) => {
    const groupMatched = selectedGroup === "all" || (f.category || "Joining") === selectedGroup;
    let statusMatched = true;
    if (statusFilter === "published") statusMatched = f.active === true;
    if (statusFilter === "draft") statusMatched = f.active === false;
    if (statusFilter === "missing") statusMatched = !f.questionEs || f.questionEs.trim() === "";
    if (statusFilter === "policy") statusMatched = POLICY_RE.test(f.answerEn || "");
    const textMatched =
      !q ||
      `${f.questionEn} ${f.answerEn} ${f.questionEs || ""} ${f.answerEs || ""}`
        .toLowerCase()
        .includes(q);
    return groupMatched && statusMatched && textMatched;
  };

  const shown = faqs.filter(matchItem);

  // Group shown items
  const uniqueGroups = Array.from(
    new Set([...GROUP_ORDER, ...faqs.map((f) => f.category || "Joining")])
  );

  const groupedFaqs = uniqueGroups
    .map((grpName) => {
      const items = shown.filter((f) => (f.category || "Joining") === grpName);
      return {
        name: grpName,
        items,
        note: `${items.length} ${items.length === 1 ? "question" : "questions"}`,
      };
    })
    .filter((g) => g.items.length > 0);

  const noResults = groupedFaqs.length === 0 && !loading;

  // --- Handlers ---
  const handleSaveFaqCreate = async (publishImmediately: boolean) => {
    if (!draftQ.trim() || !draftA.trim()) {
      setDraftTried(true);
      return;
    }
    setSavingDraft(true);
    const maxSort = faqs.reduce((m, f) => Math.max(m, f.sortOrder || 0), 0);
    const res = await saveFaq({
      category: draftGroup,
      questionEn: draftQ.trim(),
      answerEn: draftA.trim(),
      questionEs: draftQes.trim(),
      answerEs: draftAes.trim(),
      active: publishImmediately,
      sortOrder: maxSort + 10,
    });
    setSavingDraft(false);
    if (res.success) {
      setComposing(false);
      setDraftQ("");
      setDraftGroup("Joining");
      setDraftA("");
      setDraftQes("");
      setDraftAes("");
      setDraftTried(false);
      fetchFaqs();
    } else {
      alert(res.error || "Save failed.");
    }
  };

  const handleTogglePublish = async (f: any) => {
    const nextStatus = !f.active;
    setActionLoadingId(f.id);
    const res = await toggleFaqActive(f.id, nextStatus);
    setActionLoadingId(null);
    if (res.success) {
      setFaqs(faqs.map((item) => (item.id === f.id ? { ...item, active: nextStatus } : item)));
    } else {
      alert(res.error || "Failed to update status.");
    }
  };

  const handleDeleteFaq = async (f: any) => {
    if (!confirm(`Are you sure you want to delete "${f.questionEn}"?`)) return;
    setActionLoadingId(f.id);
    const res = await deleteFaq(f.id);
    setActionLoadingId(null);
    if (res.success) {
      if (openId === f.id) setOpenId(null);
      fetchFaqs();
    } else {
      alert(res.error || "Failed to delete.");
    }
  };

  const handleOpenEdit = (f: any) => {
    if (openId === f.id) {
      setOpenId(null);
    } else {
      setOpenId(f.id);
      setEditQ(f.questionEn || "");
      setEditGroup(f.category || "Joining");
      setEditA(f.answerEn || "");
      setEditQes(f.questionEs || "");
      setEditAes(f.answerEs || "");
      setEditActive(f.active);
    }
  };

  const handleSaveEdit = async (f: any, forcedActive?: boolean) => {
    if (!editQ.trim() || !editA.trim()) return;
    setSavingEdit(true);
    const finalActive = forcedActive !== undefined ? forcedActive : editActive;
    const res = await saveFaq({
      id: f.id,
      category: editGroup,
      questionEn: editQ.trim(),
      answerEn: editA.trim(),
      questionEs: editQes.trim(),
      answerEs: editAes.trim(),
      sortOrder: f.sortOrder,
      active: finalActive,
    });
    setSavingEdit(false);
    if (res.success) {
      setOpenId(null);
      fetchFaqs();
    } else {
      alert(res.error || "Save failed.");
    }
  };

  const handleReorder = async (item: any, direction: number) => {
    const groupName = item.category || "Joining";
    const sameGroup = faqs.filter((f) => (f.category || "Joining") === groupName);
    const idx = sameGroup.findIndex((f) => f.id === item.id);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sameGroup.length) return;

    const currentOrder = sameGroup[idx].sortOrder;
    const swapOrder = sameGroup[swapIdx].sortOrder;

    // If both items have same sortOrder, ensure distinct values
    const safeCurrentOrder = currentOrder === swapOrder ? (direction > 0 ? swapOrder + 10 : swapOrder - 10) : swapOrder;
    const safeSwapOrder = currentOrder;

    // Optimistic UI update
    const list = [...faqs];
    const realIdx = list.findIndex((f) => f.id === sameGroup[idx].id);
    const realSwapIdx = list.findIndex((f) => f.id === sameGroup[swapIdx].id);
    if (realIdx >= 0) list[realIdx] = { ...list[realIdx], sortOrder: safeCurrentOrder };
    if (realSwapIdx >= 0) list[realSwapIdx] = { ...list[realSwapIdx], sortOrder: safeSwapOrder };
    setFaqs([...list].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));

    await saveFaq({
      id: sameGroup[idx].id,
      category: groupName,
      sortOrder: safeCurrentOrder,
      questionEn: sameGroup[idx].questionEn,
      answerEn: sameGroup[idx].answerEn,
      questionEs: sameGroup[idx].questionEs,
      answerEs: sameGroup[idx].answerEs,
      active: sameGroup[idx].active,
    });

    await saveFaq({
      id: sameGroup[swapIdx].id,
      category: groupName,
      sortOrder: safeSwapOrder,
      questionEn: sameGroup[swapIdx].questionEn,
      answerEn: sameGroup[swapIdx].answerEn,
      questionEs: sameGroup[swapIdx].questionEs,
      answerEs: sameGroup[swapIdx].answerEs,
      active: sameGroup[swapIdx].active,
    });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2" }}>
      <div
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "22px",
          }}
        >
          <div style={{ flex: "1 1 400px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "12px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "9px",
              }}
            >
              <Link href="/admin" style={{ color: "#7b1f2c", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                <BackArrow /> Dashboard
              </Link>
              <span>·</span>
              <span>Content</span>
              <span>·</span>
              <span>FAQ</span>
            </div>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(30px, 4vw, 42px)",
                lineHeight: 1.1,
                margin: "0 0 9px",
              }}
            >
              The questions we answer
            </h1>
            <p
              style={{
                fontSize: "14.5px",
                lineHeight: 1.6,
                color: "rgba(57,41,42,0.72)",
                margin: 0,
                maxWidth: "70ch",
                textWrap: "pretty" as any,
              }}
            >
              Grouped as they appear on the public page, in the order they appear. Where the Spanish is
              missing, the page shows the English — so a gap is visible here, never on the page.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <Link
              href="/faq"
              style={{
                border: "1px solid rgba(57,41,42,0.3)",
                color: "#39292a",
                borderRadius: "4px",
                padding: "9px 15px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13.5px",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              View the public page
            </Link>
            <button
              type="button"
              onClick={() => setComposing(!composing)}
              style={{
                border: "1px solid #7b1f2c",
                background: composing ? "rgba(123,31,44,0.08)" : "transparent",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "9px 15px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {composing ? "Close" : "Add a question"}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 168px), 1fr))",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: "#39292a",
              }}
            >
              {totalCount}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
                lineHeight: 1.4,
              }}
            >
              Questions
            </div>
            <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              across {GROUP_ORDER.length} groups
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: GREEN,
              }}
            >
              {publishedCount}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
                lineHeight: 1.4,
              }}
            >
              Published
            </div>
            <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              {draftCount === 0
                ? "nothing in draft"
                : draftCount === 1
                ? "one still a draft"
                : `${draftCount} still in draft`}
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: AMBER,
              }}
            >
              {missingEsCount}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
                lineHeight: 1.4,
              }}
            >
              Missing Spanish
            </div>
            <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              the page shows English
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: WINE,
              }}
            >
              {policyCount}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
                lineHeight: 1.4,
              }}
            >
              Quote a policy figure
            </div>
            <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              flagged if settings change
            </div>
          </div>
        </div>

        {/* Composer */}
        {composing && (
          <div
            style={{
              border: "1px solid rgba(123,31,44,0.4)",
              borderRadius: "8px",
              background: "#fdf6f2",
              padding: "20px 22px",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "20px",
                margin: "0 0 12px",
              }}
            >
              A new question
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: "14px",
                marginBottom: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "13px",
                    marginBottom: "6px",
                  }}
                >
                  Question, in English
                </label>
                <input
                  type="text"
                  value={draftQ}
                  onChange={(e) => {
                    setDraftQ(e.target.value);
                    setDraftTried(false);
                  }}
                  placeholder="As a member would ask it"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(57,41,42,0.25)",
                    borderRadius: "4px",
                    padding: "10px 12px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                    background: "#fff",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "13px",
                    marginBottom: "6px",
                  }}
                >
                  Group
                </label>
                <select
                  value={draftGroup}
                  onChange={(e) => setDraftGroup(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(57,41,42,0.25)",
                    borderRadius: "4px",
                    padding: "10px 12px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                    background: "#fff",
                  }}
                >
                  {GROUP_ORDER.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: "14px",
                marginBottom: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "13px",
                    marginBottom: "6px",
                  }}
                >
                  Answer, in English
                </label>
                <textarea
                  rows={4}
                  value={draftA}
                  onChange={(e) => {
                    setDraftA(e.target.value);
                    setDraftTried(false);
                  }}
                  placeholder="Plainly, in our voice. Spanish can follow later."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(57,41,42,0.25)",
                    borderRadius: "4px",
                    padding: "10px 12px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "13.5px",
                    lineHeight: 1.65,
                    background: "#fff",
                    resize: "vertical",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "13px",
                    marginBottom: "6px",
                  }}
                >
                  Question, in Spanish (optional)
                </label>
                <input
                  type="text"
                  value={draftQes}
                  onChange={(e) => setDraftQes(e.target.value)}
                  placeholder="Pregunta en español"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(57,41,42,0.25)",
                    borderRadius: "4px",
                    padding: "10px 12px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                    background: "#fff",
                    marginBottom: "10px",
                  }}
                />
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "13px",
                    marginBottom: "6px",
                  }}
                >
                  Answer, in Spanish (optional)
                </label>
                <textarea
                  rows={3}
                  value={draftAes}
                  onChange={(e) => setDraftAes(e.target.value)}
                  placeholder="Respuesta en español."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(57,41,42,0.25)",
                    borderRadius: "4px",
                    padding: "10px 12px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "13.5px",
                    lineHeight: 1.65,
                    background: "#fff",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => handleSaveFaqCreate(true)}
                disabled={savingDraft}
                style={{
                  border: `1px solid ${GREEN}`,
                  background: GREEN,
                  color: "#fff",
                  borderRadius: "4px",
                  padding: "10px 18px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                {savingDraft ? "Publishing..." : "✓ Publish now"}
              </button>
              <button
                type="button"
                onClick={() => handleSaveFaqCreate(false)}
                disabled={savingDraft}
                style={{
                  border: "1px solid #7b1f2c",
                  background: "transparent",
                  color: "#7b1f2c",
                  borderRadius: "4px",
                  padding: "10px 16px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                {savingDraft ? "Saving..." : "Save as draft"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposing(false);
                  setDraftTried(false);
                }}
                style={{
                  border: "1px solid rgba(57,41,42,0.28)",
                  background: "transparent",
                  color: "#39292a",
                  borderRadius: "4px",
                  padding: "10px 16px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <span style={{ fontSize: "12px", color: draftTried ? WINE : "rgba(57,41,42,0.62)" }}>
                {draftTried
                  ? "It needs both a question and an answer."
                  : "Choose 'Publish now' to make live immediately, or 'Save as draft' to review first."}
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            border: "1px solid rgba(57,41,42,0.16)",
            borderRadius: "8px",
            background: "#fffdfa",
            padding: "16px 18px",
            marginBottom: "16px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a question or its answer"
            style={{
              flex: "1 1 240px",
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 13px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              background: "#fff",
            }}
          />

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              background: "#fff",
            }}
          >
            <option value="all">Every group</option>
            {GROUP_ORDER.map((grp) => (
              <option key={grp} value={grp}>
                {grp}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              background: "#fff",
            }}
          >
            <option value="all">All questions</option>
            <option value="published">Published only</option>
            <option value="draft">Drafts only</option>
            <option value="missing">Missing Spanish</option>
            <option value="policy">Quotes a policy figure</option>
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "#fffdfa",
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "8px",
            }}
          >
            Loading FAQs...
          </div>
        ) : (
          <>
            {/* Grouped Question List */}
            {groupedFaqs.map((g) => (
              <div key={g.name} style={{ marginBottom: "22px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "14px",
                    flexWrap: "wrap",
                    marginBottom: "10px",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 500,
                      fontSize: "22px",
                      lineHeight: 1.2,
                      margin: 0,
                    }}
                  >
                    {g.name}
                  </h2>
                  <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)" }}>{g.note}</span>
                </div>

                <div
                  style={{
                    border: "1px solid rgba(57,41,42,0.16)",
                    borderRadius: "8px",
                    background: "#fffdfa",
                    overflow: "hidden",
                  }}
                >
                  {g.items.map((f, idx) => {
                    const isOpen = openId === f.id;
                    const hasMissingEs = !f.questionEs || f.questionEs.trim() === "";
                    const hasPolicy = POLICY_RE.test(f.answerEn || "");
                    const isDraft = !f.active;
                    const rowBg = isDraft
                      ? "rgba(57,41,42,0.03)"
                      : hasMissingEs
                      ? "rgba(168,117,44,0.04)"
                      : "transparent";
                    const isRowLoading = actionLoadingId === f.id;

                    return (
                      <div
                        key={f.id}
                        style={{
                          borderBottom:
                            idx < g.items.length - 1 ? "1px solid rgba(57,41,42,0.1)" : "none",
                          padding: "15px 18px",
                          background: rowBg,
                        }}
                      >
                        {/* Question row */}
                        <div
                          style={{
                            display: "flex",
                            gap: "16px",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            alignItems: "flex-start",
                          }}
                        >
                          {/* Left: question content */}
                          <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: "10px",
                                marginBottom: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "'Cormorant Garamond', serif",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                  color: "rgba(57,41,42,0.45)",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                #{idx + 1}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'Cormorant Garamond', serif",
                                  fontWeight: 600,
                                  fontSize: "16.5px",
                                  lineHeight: 1.3,
                                }}
                              >
                                {f.questionEn}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "13.5px",
                                lineHeight: 1.6,
                                color: hasMissingEs ? AMBER : "rgba(57,41,42,0.72)",
                                fontStyle: hasMissingEs ? "italic" : "normal",
                                marginBottom: "7px",
                              }}
                            >
                              {hasMissingEs
                                ? "Not translated — the page shows the English"
                                : f.questionEs}
                            </div>
                            {/* Tags */}
                            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                              {hasMissingEs && (
                                <span
                                  style={{
                                    border: `1px solid ${AMBER}`,
                                    color: AMBER,
                                    borderRadius: "3px",
                                    padding: "3px 9px",
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontWeight: 600,
                                    fontSize: "11px",
                                  }}
                                >
                                  Spanish missing
                                </span>
                              )}
                              {hasPolicy && (
                                <span
                                  style={{
                                    border: `1px solid ${WINE}`,
                                    color: WINE,
                                    borderRadius: "3px",
                                    padding: "3px 9px",
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontWeight: 600,
                                    fontSize: "11px",
                                  }}
                                >
                                  Policy figure
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: status + controls */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              alignItems: "flex-end",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => handleTogglePublish(f)}
                                disabled={isRowLoading}
                                title={
                                  isDraft
                                    ? "Click to publish this FAQ"
                                    : "Click to unpublish (move to draft)"
                                }
                                style={{
                                  border: `1px solid ${isDraft ? GREY : GREEN}`,
                                  background: isDraft ? "#f5f5f5" : "rgba(63,102,4,0.08)",
                                  color: isDraft ? GREY : GREEN,
                                  borderRadius: "3px",
                                  padding: "4px 10px",
                                  fontFamily: "'Cormorant Garamond', serif",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <span>{isDraft ? "Draft" : "Published"}</span>
                                 <span style={{ fontSize: "10px", opacity: 0.7, display: "inline-flex", alignItems: "center" }}>
                                   ({isDraft ? <>Publish <ForwardArrow size={10} /></> : "Unpublish"})
                                 </span>
                              </button>
                            </div>

                            <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(f)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#7b1f2c",
                                  fontFamily: "'Lora', Georgia, serif",
                                  fontSize: "12.5px",
                                  cursor: "pointer",
                                  padding: 0,
                                  textDecoration: "underline",
                                }}
                              >
                                {isOpen ? "Close" : "Edit"}
                              </button>
                              <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                              <button
                                type="button"
                                onClick={() => handleReorder(f, -1)}
                                title="Move up in group"
                                style={{
                                  border: "1px solid rgba(57,41,42,0.25)",
                                  background: "transparent",
                                  color: "#39292a",
                                  borderRadius: "3px",
                                  padding: "2px 8px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReorder(f, 1)}
                                title="Move down in group"
                                style={{
                                  border: "1px solid rgba(57,41,42,0.25)",
                                  background: "transparent",
                                  color: "#39292a",
                                  borderRadius: "3px",
                                  padding: "2px 8px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                              >
                                ↓
                              </button>
                            </div>
                            <div style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.55)" }}>
                              {isDraft
                                ? `Draft since ${new Date(
                                    f.updatedAt || Date.now()
                                  ).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                  })}`
                                : `Updated ${new Date(
                                    f.updatedAt || Date.now()
                                  ).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                  })}`}
                            </div>
                          </div>
                        </div>

                        {/* Inline Edit */}
                        {isOpen && (
                          <>
                            <div
                              style={{
                                marginTop: "14px",
                                paddingTop: "14px",
                                borderTop: "1px solid rgba(57,41,42,0.12)",
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                                gap: "16px",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontWeight: 600,
                                    fontSize: "10.5px",
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    color: "rgba(57,41,42,0.55)",
                                    marginBottom: "6px",
                                  }}
                                >
                                  English
                                </div>
                                <input
                                  type="text"
                                  value={editQ}
                                  onChange={(e) => setEditQ(e.target.value)}
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    border: "1px solid rgba(57,41,42,0.25)",
                                    borderRadius: "4px",
                                    padding: "10px 12px",
                                    fontFamily: "'Lora', Georgia, serif",
                                    fontSize: "14px",
                                    background: "#fff",
                                    marginBottom: "8px",
                                  }}
                                />
                                <textarea
                                  rows={5}
                                  value={editA}
                                  onChange={(e) => setEditA(e.target.value)}
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    border: "1px solid rgba(57,41,42,0.25)",
                                    borderRadius: "4px",
                                    padding: "10px 12px",
                                    fontFamily: "'Lora', Georgia, serif",
                                    fontSize: "13.5px",
                                    lineHeight: 1.65,
                                    background: "#fff",
                                    resize: "vertical",
                                  }}
                                />
                              </div>

                              <div>
                                <div
                                  style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontWeight: 600,
                                    fontSize: "10.5px",
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    color: "rgba(57,41,42,0.55)",
                                    marginBottom: "6px",
                                  }}
                                >
                                  Spanish
                                </div>
                                <input
                                  type="text"
                                  value={editQes}
                                  onChange={(e) => setEditQes(e.target.value)}
                                  placeholder="Sin traducir — la página muestra el inglés"
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    border: "1px solid rgba(57,41,42,0.25)",
                                    borderRadius: "4px",
                                    padding: "10px 12px",
                                    fontFamily: "'Lora', Georgia, serif",
                                    fontSize: "14px",
                                    background: "#fff",
                                    marginBottom: "8px",
                                  }}
                                />
                                <textarea
                                  rows={5}
                                  value={editAes}
                                  onChange={(e) => setEditAes(e.target.value)}
                                  placeholder="Sin traducir"
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    border: "1px solid rgba(57,41,42,0.25)",
                                    borderRadius: "4px",
                                    padding: "10px 12px",
                                    fontFamily: "'Lora', Georgia, serif",
                                    fontSize: "13.5px",
                                    lineHeight: 1.65,
                                    background: "#fff",
                                    resize: "vertical",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Group & Status Row */}
                            <div
                              style={{
                                marginTop: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "20px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontWeight: 600,
                                    fontSize: "12.5px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "rgba(57,41,42,0.7)",
                                  }}
                                >
                                  Group:
                                </span>
                                <select
                                  value={editGroup}
                                  onChange={(e) => setEditGroup(e.target.value)}
                                  style={{
                                    border: "1px solid rgba(57,41,42,0.25)",
                                    borderRadius: "4px",
                                    padding: "6px 10px",
                                    fontFamily: "'Lora', Georgia, serif",
                                    fontSize: "13.5px",
                                    background: "#fff",
                                  }}
                                >
                                  {GROUP_ORDER.map((grp) => (
                                    <option key={grp} value={grp}>
                                      {grp}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <span
                                  style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontWeight: 600,
                                    fontSize: "12.5px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "rgba(57,41,42,0.7)",
                                  }}
                                >
                                  Status:
                                </span>
                                <label
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`faq-status-${f.id}`}
                                    checked={editActive === true}
                                    onChange={() => setEditActive(true)}
                                  />
                                  <span style={{ color: GREEN, fontWeight: 600 }}>
                                    Published (Live)
                                  </span>
                                </label>
                                <label
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`faq-status-${f.id}`}
                                    checked={editActive === false}
                                    onChange={() => setEditActive(false)}
                                  />
                                  <span style={{ color: GREY, fontWeight: 600 }}>Draft</span>
                                </label>
                              </div>
                            </div>

                            {/* Policy figure warning */}
                            {hasPolicy && (
                              <div
                                style={{
                                  marginTop: "12px",
                                  border: "1px solid rgba(168,117,44,0.55)",
                                  borderRadius: "5px",
                                  background: "rgba(168,117,44,0.06)",
                                  padding: "12px 14px",
                                }}
                              >
                                <div
                                  style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontWeight: 600,
                                    fontSize: "10.5px",
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    color: "#8a6220",
                                    marginBottom: "5px",
                                  }}
                                >
                                  This answer quotes a policy figure
                                </div>
                                <div
                                  style={{
                                    fontSize: "12.5px",
                                    lineHeight: 1.6,
                                    color: "rgba(57,41,42,0.78)",
                                  }}
                                >
                                  Change it in settings and this answer is flagged for rewriting —
                                  the number is never edited here alone.
                                </div>
                              </div>
                            )}

                            <div
                              style={{
                                marginTop: "14px",
                                display: "flex",
                                gap: "9px",
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(f)}
                                disabled={savingEdit}
                                style={{
                                  border: `1px solid ${editActive ? GREEN : "#7b1f2c"}`,
                                  background: editActive ? GREEN : "#7b1f2c",
                                  color: "#fff",
                                  borderRadius: "4px",
                                  padding: "9px 18px",
                                  fontFamily: "'Cormorant Garamond', serif",
                                  fontWeight: 600,
                                  fontSize: "13.5px",
                                  cursor: "pointer",
                                }}
                              >
                                {savingEdit
                                  ? "Saving..."
                                  : editActive
                                  ? "Save & Publish"
                                  : "Save as Draft"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setOpenId(null)}
                                style={{
                                  border: "1px solid rgba(57,41,42,0.28)",
                                  background: "transparent",
                                  color: "#39292a",
                                  borderRadius: "4px",
                                  padding: "9px 15px",
                                  fontFamily: "'Cormorant Garamond', serif",
                                  fontWeight: 600,
                                  fontSize: "13px",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFaq(f)}
                                disabled={actionLoadingId === f.id}
                                style={{
                                  border: "1px solid rgba(153,56,66,0.35)",
                                  background: "transparent",
                                  color: "#993842",
                                  borderRadius: "4px",
                                  padding: "9px 14px",
                                  fontFamily: "'Cormorant Garamond', serif",
                                  fontWeight: 600,
                                  fontSize: "13px",
                                  cursor: "pointer",
                                  marginLeft: "auto",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* No results */}
            {noResults && (
              <div
                style={{
                  borderTop: "1px solid rgba(57,41,42,0.14)",
                  padding: "20px 2px",
                  marginBottom: "18px",
                }}
              >
                <p
                  style={{
                    fontSize: "14.5px",
                    lineHeight: 1.6,
                    color: "rgba(57,41,42,0.7)",
                    margin: 0,
                  }}
                >
                  Nothing matches. Widen the filters.
                </p>
              </div>
            )}
          </>
        )}

        {/* Bottom Documentation Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "16px",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "8px",
              background: "#fffdfa",
              padding: "18px 20px",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "19px",
                margin: "0 0 10px",
                color: "#39292a",
              }}
            >
              What changed from the current page
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "rgba(57,41,42,0.75)",
              }}
            >
              <div>
                <strong style={{ fontWeight: 600 }}>One row reading XXX / ZZZ.</strong> The public
                FAQ has fourteen questions in five groups — none of them were here.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>No answers.</strong> The table showed questions
                only, so nothing could actually be edited.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>No groups.</strong> The page is read in sections,
                so the CMS has to hold the section and the order within it.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>Order was a label, not a control.</strong>{" "}
                Reordering is now two arrows per question.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>
                  No published state and no missing-Spanish flag
                </strong>{" "}
                — the two things you need to see at a glance.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>Add FAQ Question was a filled button.</strong> Ours
                are outlined.
              </div>
            </div>
          </div>
          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "8px",
              background: "#fffdfa",
              padding: "18px 20px",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "19px",
                margin: "0 0 10px",
                color: "#39292a",
              }}
            >
              Rules this page holds
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "rgba(57,41,42,0.75)",
              }}
            >
              <div>
                English is required; Spanish is not. A missing translation falls back to English on the
                page and shows as a gap here.
              </div>
              <div>
                Answers that quote €19, €35, €39, €99, 20 credits or six months are marked. Change the
                figure in settings and the answer is flagged, so the FAQ can never contradict the fee
                page.
              </div>
              <div>
                A draft is invisible publicly. Unpublishing is how you retire a question — there is no
                delete, because a link to it may be in someone's inbox.
              </div>
              <div>Every edit is written to the audit log with the previous wording.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
