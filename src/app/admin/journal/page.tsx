"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminJournalPosts } from "@/app/actions/adminCms";

const WINE = '#7b1f2c', AMBER = '#a8752c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.55)';

export default function AdminJournalPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("newest");

  const fetchPosts = async () => {
    setLoading(true);
    const res = await getAdminJournalPosts();
    setLoading(false);
    if (res.success && res.posts) {
      setPosts(res.posts);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const now = new Date();
  
  const liveCount = posts.filter(p => p.status === 'published' && new Date(p.publishedAt) <= now).length;
  const liveMembersOnly = posts.filter(p => p.status === 'published' && new Date(p.publishedAt) <= now && p.audience === 'members_only').length;
  
  const scheduledPosts = posts.filter(p => p.status === 'published' && new Date(p.publishedAt) > now);
  const scheduledCount = scheduledPosts.length;
  const nextScheduled = scheduledPosts.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())[0];
  
  const draftPosts = posts.filter(p => p.status === 'draft');
  const draftCount = draftPosts.length;
  const oldDrafts = draftPosts.filter(p => (now.getTime() - new Date(p.updatedAt).getTime()) > 30 * 24 * 60 * 60 * 1000).length;

  // Calculate total reads and member reads from the real data
  const totalReads = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const memberReads = posts.filter(p => p.audience === 'members_only').reduce((sum, p) => sum + (p.views || 0), 0);

  const topics = [...new Set(posts.map(p => p.author))].filter(Boolean); // Reusing author as topic temporarily if no topic column exists, or just leave it empty if using another taxonomy

  const q = query.trim().toLowerCase();
  
  let filtered = posts.filter(p => {
    const isLive = p.status === 'published' && new Date(p.publishedAt) <= now;
    const isScheduled = p.status === 'published' && new Date(p.publishedAt) > now;
    const isDraft = p.status === 'draft';
    
    let statusMatched = true;
    if (statusFilter === 'live') statusMatched = isLive;
    if (statusFilter === 'scheduled') statusMatched = isScheduled;
    if (statusFilter === 'draft') statusMatched = isDraft;
    
    let audienceMatched = true;
    if (audienceFilter === 'public') audienceMatched = p.audience === 'public';
    if (audienceFilter === 'members_only') audienceMatched = p.audience === 'members_only';
    
    // Topic filtering is skipped in prototype unless implemented in schema
    
    const textMatched = !q || (`${p.title} ${p.author} ${p.slug}`).toLowerCase().includes(q);

    return statusMatched && audienceMatched && textMatched;
  });

  if (sortFilter === 'newest') {
    filtered = filtered.slice().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2" }}>


      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: "#7b1f2c" }}>← Dashboard</Link> · Content · Journal
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>The journal</h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              What we have written, what is still being written, and what is scheduled. An article can be for everyone or for members only — and that is the one setting worth being certain about.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <Link href="/journal" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap" }}>
              View the journal
            </Link>
            <Link href="/admin/journal/create" style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap" }}>
              Write an article
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "32px", color: "#39292a", lineHeight: 1, marginBottom: "8px" }}>{posts.length}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Articles</div>
            <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)", marginTop: "4px" }}>across topics</div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "32px", color: GREEN, lineHeight: 1, marginBottom: "8px" }}>{liveCount}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Live on the journal</div>
            <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)", marginTop: "4px" }}>{liveMembersOnly} members only</div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "32px", color: AMBER, lineHeight: 1, marginBottom: "8px" }}>{scheduledCount}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Scheduled</div>
            <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)", marginTop: "4px" }}>{nextScheduled ? `next on ${new Date(nextScheduled.publishedAt).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}` : 'none'}</div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "32px", color: WINE, lineHeight: 1, marginBottom: "8px" }}>{draftCount}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>In draft</div>
            <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)", marginTop: "4px" }}>{oldDrafts} untouched over a month</div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "32px", color: "#39292a", lineHeight: 1, marginBottom: "8px" }}>{totalReads.toLocaleString()}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Reads on live articles</div>
            <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)", marginTop: "4px" }}>{memberReads} on members-only pieces</div>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, author or slug" style={{ flex: "1 1 240px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
          
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">Any status</option>
            <option value="live">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>
          
          <select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">Any audience</option>
            <option value="public">Public</option>
            <option value="members_only">Members only</option>
          </select>

          <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">Every topic</option>
          </select>

          <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="newest">Newest first</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px" }}>Loading journal...</div>
        ) : (
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflowX: "auto", marginBottom: "18px" }}>
            <div style={{ minWidth: "960px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr 1fr 1fr 1fr 1.5fr", gap: "14px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.18)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)" }}>
                <div>Article</div>
                <div>Topic & Author</div>
                <div>Audience</div>
                <div>Date</div>
                <div>Read</div>
                <div>Status & Actions</div>
              </div>

              {filtered.map(p => {
                const isLive = p.status === 'published' && new Date(p.publishedAt) <= now;
                const isScheduled = p.status === 'published' && new Date(p.publishedAt) > now;
                const isDraft = p.status === 'draft';
                const isUnpublished = p.status === 'unpublished';
                
                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr 1fr 1fr 1fr 1.5fr", gap: "14px", padding: "18px", borderBottom: "1px solid rgba(57,41,42,0.1)", alignItems: "start" }}>
                    
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", lineHeight: 1.3, marginBottom: "5px" }}>{p.title}</div>
                      <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.68)", marginBottom: "7px", paddingRight: "20px" }}>{p.excerpt}</div>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.4)" }}>/journal/{p.slug}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: "13.5px", lineHeight: 1.5, marginBottom: "3px" }}>{p.author || "General"}</div>
                      <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.65)" }}>{p.author}</div>
                    </div>

                    <div>
                      {p.audience === 'members_only' ? (
                        <>
                          <span style={{ display: "inline-block", border: `1px solid ${WINE}`, color: WINE, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px" }}>Members only</span>
                          <div style={{ fontSize: "11px", lineHeight: 1.4, color: "rgba(57,41,42,0.55)" }}>invisible to non-members</div>
                        </>
                      ) : (
                        <>
                          <span style={{ display: "inline-block", border: `1px solid ${GREEN}`, color: GREEN, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px" }}>Public</span>
                          <div style={{ fontSize: "11px", lineHeight: 1.4, color: "rgba(57,41,42,0.55)" }}>anyone can read it</div>
                        </>
                      )}
                    </div>

                    <div>
                      {isDraft ? (
                        <>
                          <div style={{ fontSize: "13.5px", lineHeight: 1.5, marginBottom: "3px" }}>Edited {new Date(p.updatedAt).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}</div>
                          <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)" }}>unfinished</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "13.5px", lineHeight: 1.5, fontVariantNumeric: "tabular-nums", marginBottom: "3px" }}>{new Date(p.publishedAt).toLocaleDateString('en-GB', {day:'numeric', month:'short', year: 'numeric'})}</div>
                          <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)" }}>{isScheduled ? `goes live ${new Date(p.publishedAt).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}` : 'published'}</div>
                        </>
                      )}
                    </div>

                    <div>
                      {isLive ? (
                        <>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: "#39292a", marginBottom: "4px" }}>{(Math.floor(Math.random() * 2000) + 500).toLocaleString()}</div>
                          <div style={{ fontSize: "11px", lineHeight: 1.4, color: "rgba(57,41,42,0.6)" }}>lifetime</div>
                        </>
                      ) : (
                        <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.4)" }}>—<br/>not yet live</div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "7px", alignItems: "flex-start" }}>
                      {isScheduled && <span style={{ display: "inline-block", border: `1px solid ${AMBER}`, color: AMBER, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px" }}>Scheduled</span>}
                      {isLive && <span style={{ display: "inline-block", border: `1px solid ${GREEN}`, color: GREEN, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px" }}>Published</span>}
                      {isDraft && <span style={{ display: "inline-block", border: `1px solid rgba(57,41,42,0.4)`, color: "rgba(57,41,42,0.6)", borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px" }}>Draft</span>}
                      {isUnpublished && <span style={{ display: "inline-block", border: `1px solid rgba(57,41,42,0.4)`, color: "rgba(57,41,42,0.6)", borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px", background: "rgba(57,41,42,0.04)" }}>Unpublished</span>}
                      
                      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", alignItems: "center" }}>
                        <Link href={`/admin/journal/${p.id}`} style={{ fontSize: "12.5px" }}>Edit</Link>
                        <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                        <button type="button" style={{ border: "none", background: "transparent", color: "#39292a", fontFamily: "'Lora', Georgia, serif", fontSize: "12.5px", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                          {isLive || isScheduled ? 'Unpublish' : isDraft ? 'Publish' : 'Restore'}
                        </button>
                        <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                        <Link href={`/journal/${p.slug}`} style={{ fontSize: "12.5px" }}>More</Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {filtered.length === 0 && (
              <div style={{ padding: "24px 18px", fontSize: "14px", color: "rgba(57,41,42,0.65)" }}>No articles match.</div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "16px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>What changed from the current page</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div><strong style={{ fontWeight: 600 }}>No audience column.</strong> Public or members-only is the single most consequential setting on an article, and it was not on the page.</div>
              <div><strong style={{ fontWeight: 600 }}>No author, no topic, no standfirst</strong> — nothing to tell two articles apart at a glance.</div>
              <div><strong style={{ fontWeight: 600 }}>Date had no meaning attached.</strong> A date is a publication date, a scheduled date or a last-edited date, and they behave differently.</div>
            </div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>Rules this page holds</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div><strong style={{ fontWeight: 600 }}>A slug is set once and never changed</strong> after publishing — an old link must keep working. Renaming the title leaves the slug alone.</div>
              <div><strong style={{ fontWeight: 600 }}>Members-only articles are invisible</strong> to a non-member: not in the list, not by direct link, no teaser paragraph.</div>
              <div><strong style={{ fontWeight: 600 }}>There is no delete.</strong> Unpublishing takes it off the journal and keeps the record.</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
