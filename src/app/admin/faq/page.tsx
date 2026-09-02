"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminFaqs, saveFaq } from "@/app/actions/adminCms";

const WINE = '#7b1f2c', AMBER = '#a8752c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.55)';

export default function AdminFaqPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  
  const [composingItem, setComposingItem] = useState<any | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

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

  const handleToggleOpen = (id: string) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenIds(next);
  };

  const handleCreate = () => {
    setComposingItem({
      category: 'General',
      questionEn: '',
      answerEn: '',
      questionEs: '',
      answerEs: '',
      active: true,
      sortOrder: faqs.length * 10
    });
  };

  const handleSave = async (active: boolean) => {
    if (!composingItem) return;
    const res = await saveFaq({ ...composingItem, active });
    if (res.success) {
      setComposingItem(null);
      fetchFaqs();
    } else {
      alert(res.error || "Save failed.");
    }
  };

  const handleReorder = async (item: any, direction: 'up' | 'down') => {
    const list = [...faqs];
    const idx = list.findIndex(f => f.id === item.id);
    if (idx < 0) return;
    
    let swapIdx = -1;
    if (direction === 'up' && idx > 0) swapIdx = idx - 1;
    if (direction === 'down' && idx < list.length - 1) swapIdx = idx + 1;
    
    if (swapIdx !== -1) {
      const currentOrder = list[idx].sortOrder;
      const swapOrder = list[swapIdx].sortOrder;
      
      list[idx].sortOrder = swapOrder;
      list[swapIdx].sortOrder = currentOrder;
      
      // Optimitistic update
      setFaqs([...list].sort((a,b) => a.sortOrder - b.sortOrder));
      
      await saveFaq({ id: list[idx].id, sortOrder: swapOrder, questionEn: list[idx].questionEn, answerEn: list[idx].answerEn, questionEs: list[idx].questionEs, answerEs: list[idx].answerEs });
      await saveFaq({ id: list[swapIdx].id, sortOrder: currentOrder, questionEn: list[swapIdx].questionEn, answerEn: list[swapIdx].answerEn, questionEs: list[swapIdx].questionEs, answerEs: list[swapIdx].answerEs });
    }
  };

  const q = query.trim().toLowerCase();
  
  const filtered = faqs.filter(f => {
    const statusMatched = filter === 'all' || (filter === 'draft' && !f.active) || (filter === 'published' && f.active);
    const groupMatched = groupFilter === 'all' || f.category === groupFilter;
    const textMatched = !q || (`${f.questionEn} ${f.answerEn} ${f.category}`).toLowerCase().includes(q);
    return statusMatched && groupMatched && textMatched;
  });

  const categories = [...new Set(faqs.map(f => f.category))];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2" }}>


      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: "#7b1f2c" }}>← Dashboard</Link> · Content
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>Frequently asked questions</h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              These render dynamically on the site based on grouping. Changing them here is instant.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <button type="button" onClick={handleCreate} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap" }}>
              New question
            </button>
            <Link href="/admin" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap" }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions or answers" style={{ flex: "1 1 240px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
          
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">All groups</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px" }}>Loading FAQs...</div>
        ) : (
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", marginBottom: "32px", overflow: "hidden" }}>
            
            {composingItem && (
              <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(57,41,42,0.16)", background: "#fdf6f2" }}>
                <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)", marginBottom: "6px" }}>Group</div>
                    <select 
                      value={composingItem.category}
                      onChange={(e) => setComposingItem({ ...composingItem, category: e.target.value })}
                      style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "9px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }}
                    >
                      <option value="General">General</option>
                      <option value="Joining">Joining</option>
                      <option value="Credits">Credits</option>
                      <option value="Events">Events</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)", marginBottom: "6px" }}>Status</div>
                    <div style={{ display: "flex", gap: "9px" }}>
                      <button type="button" onClick={() => handleSave(true)} style={{ border: "1px solid #3f6604", background: "rgba(63,102,4,0.06)", color: "#3f6604", borderRadius: "4px", padding: "9px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer", flex: 1 }}>Publish</button>
                      <button type="button" onClick={() => handleSave(false)} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer", flex: 1 }}>Save as a draft</button>
                      <button type="button" onClick={() => setComposingItem(null)} style={{ border: "none", background: "transparent", color: "rgba(57,41,42,0.6)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer", padding: "0 10px" }}>Cancel</button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)", marginBottom: "6px" }}>English</div>
                    <input type="text" value={composingItem.questionEn} onChange={(e) => setComposingItem({...composingItem, questionEn: e.target.value})} placeholder="Question" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderBottom: "none", borderRadius: "4px 4px 0 0", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} />
                    <textarea value={composingItem.answerEn} onChange={(e) => setComposingItem({...composingItem, answerEn: e.target.value})} placeholder="Answer (markdown supported)" rows={4} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "0 0 4px 4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff", resize: "vertical" }} />
                  </div>
                  
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)", marginBottom: "6px" }}>Spanish</div>
                    <input type="text" value={composingItem.questionEs} onChange={(e) => setComposingItem({...composingItem, questionEs: e.target.value})} placeholder="Question" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderBottom: "none", borderRadius: "4px 4px 0 0", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} />
                    <textarea value={composingItem.answerEs} onChange={(e) => setComposingItem({...composingItem, answerEs: e.target.value})} placeholder="Answer (markdown supported)" rows={4} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "0 0 4px 4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff", resize: "vertical" }} />
                  </div>
                </div>
              </div>
            )}

            {filtered.map((f, i) => {
              const isOpen = openIds.has(f.id);
              const isEditing = composingItem && composingItem.id === f.id;
              if (isEditing) return null; // already rendering above or we could render it here instead

              return (
                <div key={f.id} style={{ borderBottom: i === filtered.length - 1 ? "none" : "1px solid rgba(57,41,42,0.1)" }}>
                  <div style={{ padding: "15px 20px", display: "flex", gap: "16px", alignItems: "flex-start", cursor: "pointer", background: isOpen ? 'rgba(57,41,42,0.02)' : 'transparent' }} onClick={() => handleToggleOpen(f.id)}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "2px 0" }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleReorder(f, 'up')} style={{ border: "none", background: "transparent", color: "rgba(57,41,42,0.4)", cursor: "pointer", padding: 0, lineHeight: 1 }}>▲</button>
                      <button onClick={() => handleReorder(f, 'down')} style={{ border: "none", background: "transparent", color: "rgba(57,41,42,0.4)", cursor: "pointer", padding: 0, lineHeight: 1 }}>▼</button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", lineHeight: 1.3, color: "#39292a" }}>{f.questionEn}</div>
                      {isOpen && (
                        <div style={{ marginTop: "12px", paddingLeft: "14px", borderLeft: "2px solid rgba(57,41,42,0.15)", fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.8)" }}>
                          <div style={{ marginBottom: "16px" }}>{f.answerEn}</div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", lineHeight: 1.3, color: "#39292a", marginBottom: "6px" }}>{f.questionEs}</div>
                          <div>{f.answerEs}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", minWidth: "100px" }}>
                      {!f.active ? (
                        <span style={{ display: "inline-block", border: `1px solid ${WINE}`, color: WINE, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Draft</span>
                      ) : (
                        <span style={{ display: "inline-block", border: `1px solid ${GREEN}`, color: GREEN, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Published</span>
                      )}
                      
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)" }}>{f.category}</div>
                      
                      {isOpen && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setComposingItem({ ...f }); setOpenIds(new Set([...openIds].filter(id => id !== f.id))); }} 
                          style={{ border: "none", background: "transparent", color: "#7b1f2c", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", cursor: "pointer", padding: 0, textDecoration: "underline", marginTop: "4px" }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filtered.length === 0 && !composingItem && (
              <div style={{ padding: "30px 20px", fontSize: "14.5px", color: "rgba(57,41,42,0.65)" }}>No FAQs match.</div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>What goes in FAQs</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div>Anything you find yourself explaining twice in WhatsApp.</div>
              <div>The absolute minutiae of credits and boundaries.</div>
              <div>Things that would break the flow of the main landing pages.</div>
            </div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>Rules this page holds</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div><strong style={{ fontWeight: 600 }}>A draft is invisible publicly.</strong> Unpublishing is how you retire a question — there is no delete so that old links or references don't break.</div>
              <div><strong style={{ fontWeight: 600 }}>We group everything into four buckets</strong>: General, Joining, Credits, Events.</div>
              <div><strong style={{ fontWeight: 600 }}>Policy figures shouldn't be here</strong>. The system pulls prices and limits directly from Settings. Anything reading €19 or 20 credits is auto-flagged to ensure it doesn't contradict the single source of truth.</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
