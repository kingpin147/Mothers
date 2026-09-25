"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import {
  PostItem,
  createCirclePost,
  createCircleReply,
  toggleCircleHeart,
  reportCirclePost,
} from "@/app/actions/circle";
import { compressImageClient } from "@/lib/imageCompression";

const TOPICS = [
  { id: "all", labelEn: "Everything", labelEs: "Todo" },
  { id: "pregnancy", labelEn: "Pregnancy & birth", labelEs: "Embarazo y parto" },
  { id: "feeding", labelEn: "Feeding", labelEs: "Lactancia y comida" },
  { id: "sleep", labelEn: "Sleep", labelEs: "Sueño" },
  { id: "postpartum", labelEn: "Postpartum", labelEs: "Puerperio" },
  { id: "schools", labelEn: "Nurseries & schools", labelEs: "Escuelas y guarderías" },
  { id: "work", labelEn: "Work & money", labelEs: "Trabajo y dinero" },
  { id: "bcn", labelEn: "Life in Barcelona", labelEs: "Vida en Barcelona" },
  { id: "friends", labelEn: "Meetups & friends", labelEs: "Quedadas y amigas" },
  { id: "recs", labelEn: "Recommendations", labelEs: "Recomendaciones" },
];

const COMPOSER_TOPIC_IDS = ["feeding", "sleep", "postpartum", "bcn", "recs", "friends", "pregnancy"];

const REPORT_REASONS = [
  { id: "unkind", label: "Unkind or judgmental" },
  { id: "selling_spam", label: "Selling or self-promotion" },
  { id: "unsafe_private", label: "Unsafe or private information" },
  { id: "child_photo_no_consent", label: "Child photo without consent" },
];

export function CircleFeedClient({
  initialPosts,
  currentUser,
  eligibility,
}: {
  initialPosts: PostItem[];
  currentUser: any;
  eligibility: { canPost: boolean; reason?: string; totalBookings?: number };
}) {
  const { language: lang } = useLanguage();
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Composer State
  const [draft, setDraft] = useState("");
  const [composerTopic, setComposerTopic] = useState("postpartum");
  const [isAnon, setIsAnon] = useState(false);
  const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
  const [photoConsent, setPhotoConsent] = useState(true);
  const [notice, setNotice] = useState<{ text: string; color: string } | null>(null);
  const [posting, setPosting] = useState(false);

  // Reply & Report States per post
  const [openReplyPostId, setOpenReplyPostId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReportPostId, setOpenReportPostId] = useState<string | null>(null);
  const [reportedPostIds, setReportedPostIds] = useState<Set<string>>(new Set());

  const [, startTransition] = useTransition();

  const handlePickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (draftPhotos.length + files.length > 4) {
      setNotice({ text: "Maximum 4 photos per post.", color: "#993842" });
      return;
    }

    setNotice({ text: "Compressing photos...", color: "rgba(57,41,42,0.7)" });

    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedDataUrl = await compressImageClient(file);
        compressedList.push(compressedDataUrl);
      }
      setDraftPhotos((prev) => [...prev, ...compressedList].slice(0, 4));
      setNotice(null);
    } catch (err: any) {
      setNotice({ text: err.message || "Failed to process image.", color: "#993842" });
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setDraftPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreatePost = async () => {
    if (!currentUser) {
      window.location.href = "/events";
      return;
    }

    if (!eligibility.canPost) {
      if (eligibility.reason === "booking_required") {
        setNotice({
          text: lang === "en"
            ? "To keep The Circle safe, posting opens with your first booking (free walks included)."
            : "Para mantener The Circle seguro, las publicaciones se activan con tu primera reserva (caminatas gratuitas incluidas).",
          color: "#7b1f2c",
        });
      } else {
        setNotice({
          text: lang === "en" ? "Your account is paused from posting." : "Tu cuenta no tiene permisos para publicar actualmente.",
          color: "#993842",
        });
      }
      return;
    }

    if (draft.trim().length < 10) {
      setNotice({ text: "Please write at least 10 characters.", color: "#993842" });
      return;
    }

    if (draftPhotos.length > 0 && !photoConsent) {
      setNotice({ text: "Please confirm parental permission for photos.", color: "#993842" });
      return;
    }

    setPosting(true);
    setNotice(null);

    try {
      const res = await createCirclePost({
        topic: composerTopic,
        body: draft,
        photos: draftPhotos,
        isAnonymous: isAnon,
        photoConsent,
      });

      if (res.success) {
        // Optimistically add to top
        const myInitial = currentUser.firstName ? currentUser.firstName[0].toUpperCase() : "M";
        const newPostItem: PostItem = {
          id: res.post.id,
          author: isAnon ? "A mother in Barcelona" : `${currentUser.firstName} ${currentUser.lastName?.[0] || ""}.`,
          isAnonymous: isAnon,
          anonymousArea: "Barcelona",
          initial: isAnon ? "M" : myInitial,
          topic: composerTopic,
          topicLabel: TOPICS.find((t) => t.id === composerTopic)?.labelEn || composerTopic,
          body: draft.trim(),
          photos: draftPhotos,
          hasPhotos: draftPhotos.length > 0,
          photoGrid: draftPhotos.length === 1 ? "1fr" : draftPhotos.length === 2 ? "1fr 1fr" : "1fr 1fr",
          heartsCount: 0,
          isHearted: false,
          repliesCount: 0,
          createdAt: new Date().toISOString(),
          meta: "Just now",
          neighbourhood: "Barcelona",
          isExpert: false,
          status: "visible",
          replies: [],
        };

        setPosts((prev) => [newPostItem, ...prev]);
        setDraft("");
        setDraftPhotos([]);
        setIsAnon(false);
        setNotice({ text: "Posted to The Circle.", color: "#3b5e04" });
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err: any) {
      setNotice({ text: err.message || "Failed to post.", color: "#993842" });
    } finally {
      setPosting(false);
    }
  };

  const handleToggleHeart = async (postId: string) => {
    if (!currentUser) {
      setNotice({ text: "Please log in to heart posts.", color: "#7b1f2c" });
      return;
    }

    // Optimistic Heart Update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextState = !p.isHearted;
          return {
            ...p,
            isHearted: nextState,
            heartsCount: nextState ? p.heartsCount + 1 : Math.max(0, p.heartsCount - 1),
          };
        }
        return p;
      })
    );

    startTransition(async () => {
      try {
        await toggleCircleHeart(postId);
      } catch {
        // Rollback on failure
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              const nextState = !p.isHearted;
              return {
                ...p,
                isHearted: nextState,
                heartsCount: nextState ? p.heartsCount + 1 : Math.max(0, p.heartsCount - 1),
              };
            }
            return p;
          })
        );
      }
    });
  };

  const handleSendReply = async (postId: string) => {
    const text = replyDrafts[postId]?.trim();
    if (!text) return;

    if (!currentUser) {
      alert("Please log in to reply.");
      return;
    }

    if (!eligibility.canPost) {
      alert("Replying requires at least one event booking.");
      return;
    }

    // Optimistic reply append
    const myInitial = currentUser.firstName ? currentUser.firstName[0].toUpperCase() : "M";
    const optimisticReply = {
      id: "temp-" + Date.now(),
      author: `${currentUser.firstName} ${currentUser.lastName?.[0] || ""}.`,
      initial: myInitial,
      body: text,
      meta: "Just now",
      isExpert: false,
      isAnonymous: false,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            repliesCount: p.repliesCount + 1,
            replies: [...p.replies, optimisticReply],
          };
        }
        return p;
      })
    );

    setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));

    try {
      await createCircleReply(postId, text);
    } catch (err: any) {
      alert(err.message || "Failed to submit reply.");
    }
  };

  const handleReport = async (postId: string, reason: string) => {
    setOpenReportPostId(null);
    setReportedPostIds((prev) => new Set(prev).add(postId));

    try {
      await reportCirclePost(postId, reason);
    } catch {
      // Ignored
    }
  };

  const isUserSignedIn = Boolean(currentUser);
  const myInitial = isUserSignedIn
    ? (isAnon ? "·" : (currentUser.firstName ? currentUser.firstName[0].toUpperCase() : "M"))
    : "+";

  const avatarBg = !isUserSignedIn
    ? "rgba(57, 41, 42, 0.08)"
    : isAnon
      ? "rgba(57, 41, 42, 0.07)"
      : "rgba(123, 31, 44, 0.1)";

  const avatarBorder = !isUserSignedIn
    ? "1px solid rgba(57, 41, 42, 0.22)"
    : isAnon
      ? "1px solid rgba(57, 41, 42, 0.2)"
      : "1px solid rgba(123, 31, 44, 0.3)";

  const avatarColor = !isUserSignedIn
    ? "rgba(57, 41, 42, 0.72)"
    : isAnon
      ? "rgba(57, 41, 42, 0.72)"
      : "#7b1f2c";

  const filteredPosts = posts.filter((p) => {
    if (selectedFilter === "all") return true;
    return p.topic === selectedFilter;
  });

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* Page Header */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(28px, 4vw, 48px) clamp(20px, 5vw, 64px) 0" }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#7b1f2c",
            marginBottom: "10px",
          }}
        >
          The Circle
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: "clamp(32px, 4.5vw, 48px)",
            lineHeight: 1.08,
            margin: "0 0 12px",
          }}
        >
          {lang === "en" ? "Talk to mothers who get it." : "Habla con madres que te entienden."}
        </h1>
        <p style={{ fontSize: "16.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", maxWidth: "58ch", margin: 0 }}>
          {lang === "en"
            ? "Share what you are living, ask for advice, cheer each other on. Open to read; post once you have booked your first event — anonymously if you need to."
            : "Comparte lo que estás viviendo, pide consejo y apóyate en las demás. Abierto para leer; publica tras tu primera reserva — de forma anónima si lo necesitas."}
        </p>
      </section>

      {/* Main Content Layout */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(24px, 3vw, 36px) clamp(20px, 5vw, 64px) 80px",
          display: "flex",
          flexWrap: "wrap",
          gap: "36px",
          alignItems: "flex-start",
        }}
      >
        {/* Left Feed Column */}
        <div style={{ flex: "1 1 540px", minWidth: "300px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Post Composer Card */}
          <div
            style={{
              border: "1px solid rgba(57, 41, 42, 0.2)",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              padding: "22px",
              boxShadow: "0 2px 8px rgba(57, 41, 42, 0.04)",
            }}
          >
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  flex: "none",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: avatarBg,
                  border: avatarBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: avatarColor,
                }}
              >
                {myInitial}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <textarea
                  rows={3}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (notice) setNotice(null);
                  }}
                  placeholder={
                    isUserSignedIn
                      ? (lang === "en"
                          ? "What would you ask the room tonight?"
                          : "¿Qué preguntarías a la comunidad esta noche?")
                      : (lang === "en"
                          ? "Book your first event to post — reading needs nothing."
                          : "Reserva tu primer evento para publicar — para leer no necesitas nada.")
                  }
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(57, 41, 42, 0.2)",
                    borderRadius: "6px",
                    backgroundColor: "#fdf8f2",
                    padding: "12px 14px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "15px",
                    lineHeight: 1.6,
                    color: "#39292a",
                    resize: "vertical",
                    outline: "none",
                  }}
                />

                {/* Draft Photo Thumbnails */}
                {draftPhotos.length > 0 && (
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {draftPhotos.map((dataUrl, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            width: "80px",
                            height: "80px",
                            borderRadius: "4px",
                            overflow: "hidden",
                            border: "1px solid rgba(57,41,42,0.2)",
                          }}
                        >
                          <img src={dataUrl} alt="Attached" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            style={{
                              position: "absolute",
                              top: "3px",
                              right: "3px",
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              border: "none",
                              backgroundColor: "rgba(57,41,42,0.75)",
                              color: "#fff",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", cursor: "pointer", marginTop: "10px" }}>
                      <input
                        type="checkbox"
                        checked={photoConsent}
                        onChange={(e) => setPhotoConsent(e.target.checked)}
                        style={{ marginTop: "3px", accentColor: "#7b1f2c" }}
                      />
                      <span style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.78)" }}>
                        {lang === "en"
                          ? "These photos show no children other than my own — or I have their parent's permission."
                          : "Estas fotos no muestran a otros niños además de los míos — o tengo el permiso de sus padres."}
                      </span>
                    </label>
                  </div>
                )}

                {/* Composer Actions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between", marginTop: "14px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid rgba(57, 41, 42, 0.25)",
                        borderRadius: "14px",
                        padding: "5px 12px",
                        fontSize: "12.5px",
                        color: "rgba(57, 41, 42, 0.74)",
                        cursor: "pointer",
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="14" height="14">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      <span>Photo</span>
                      <input type="file" accept="image/*" multiple onChange={handlePickPhotos} style={{ display: "none" }} />
                    </label>

                    {COMPOSER_TOPIC_IDS.map((tId) => {
                      const topicObj = TOPICS.find((t) => t.id === tId);
                      const isSelected = composerTopic === tId;
                      return (
                        <button
                          key={tId}
                          type="button"
                          onClick={() => setComposerTopic(tId)}
                          style={{
                            border: isSelected ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.18)",
                            backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                            color: isSelected ? "#7b1f2c" : "#39292a",
                            borderRadius: "14px",
                            padding: "5px 12px",
                            fontFamily: "'Lora', Georgia, serif",
                            fontSize: "12.5px",
                            cursor: "pointer",
                          }}
                        >
                          {lang === "en" ? topicObj?.labelEn : topicObj?.labelEs}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                    <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer", fontSize: "13px", color: "rgba(57,41,42,0.75)" }}>
                      <input
                        type="checkbox"
                        checked={isAnon}
                        onChange={(e) => setIsAnon(e.target.checked)}
                        style={{ accentColor: "#7b1f2c" }}
                      />
                      <span>{lang === "en" ? "Post anonymously" : "Publicar anónimo"}</span>
                    </label>

                    <button
                      type="button"
                      disabled={posting}
                      onClick={handleCreatePost}
                      style={{
                        border: "1px solid #7b1f2c",
                        backgroundColor: isUserSignedIn ? "#7b1f2c" : "transparent",
                        color: isUserSignedIn ? "#fdf8f2" : "#7b1f2c",
                        borderRadius: "4px",
                        padding: "8px 18px",
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontWeight: 600,
                        fontSize: "15px",
                        cursor: posting ? "wait" : "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isUserSignedIn) {
                          e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.08)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isUserSignedIn) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {isUserSignedIn
                        ? (posting ? "..." : (lang === "en" ? "Post" : "Publicar"))
                        : (lang === "en" ? "Book an event" : "Reservar evento")}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    color: notice ? notice.color : "rgba(57, 41, 42, 0.72)",
                    marginTop: "10px",
                    minHeight: "17px",
                  }}
                >
                  {notice ? (
                    notice.text
                  ) : isUserSignedIn ? (
                    lang === "en"
                      ? "Up to 4 photos (JPG, PNG, WebP, under 10 MB). 5 posts a day. Anonymous posts still belong to your account — the hosts can always see who wrote what."
                      : "Hasta 4 fotos (JPG, PNG, WebP, menos de 10 MB). 5 publicaciones al día. Las publicaciones anónimas siguen vinculadas a tu cuenta — los anfitriones siempre pueden ver quién escribió qué."
                  ) : (
                    lang === "en"
                      ? "Free, thirty seconds, and you can sign sensitive posts anonymously."
                      : "Gratuito, treinta segundos, y puedes firmar temas delicados de forma anónima."
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Topic Filter Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {TOPICS.map((topic) => {
              const active = selectedFilter === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedFilter(topic.id)}
                  style={{
                    border: active ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                    backgroundColor: active ? "#7b1f2c" : "#ffffff",
                    color: active ? "#fdf8f2" : "#39292a",
                    borderRadius: "16px",
                    padding: "7px 15px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? topic.labelEn : topic.labelEs}
                </button>
              );
            })}
          </div>

          {/* Posts Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredPosts.length === 0 ? (
              <div
                style={{
                  border: "1px solid rgba(57, 41, 42, 0.16)",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "rgba(57, 41, 42, 0.65)",
                }}
              >
                {lang === "en" ? "No posts in this category yet. Be the first to share!" : "Todavía no hay publicaciones aquí. ¡Sé la primera!"}
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isReported = reportedPostIds.has(post.id);
                const isReportOpen = openReportPostId === post.id;
                const isReplyOpen = openReplyPostId === post.id;

                return (
                  <article
                    key={post.id}
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.18)",
                      borderRadius: "8px",
                      backgroundColor: "#ffffff",
                      padding: "22px 24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    {/* Post Header */}
                    <div style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
                      <div
                        style={{
                          flex: "none",
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          backgroundColor: post.isAnonymous ? "rgba(57, 41, 42, 0.08)" : "rgba(123, 31, 44, 0.08)",
                          border: "1px solid rgba(57, 41, 42, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontWeight: 600,
                          fontSize: "16px",
                          color: post.isAnonymous ? "rgba(57, 41, 42, 0.75)" : "#7b1f2c",
                        }}
                      >
                        {post.initial}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "baseline" }}>
                          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "16.5px" }}>
                            {post.author}
                          </span>
                          {post.isExpert && (
                            <span
                              style={{
                                fontSize: "10.5px",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "#5c4708",
                                border: "1px solid rgba(201, 162, 39, 0.55)",
                                borderRadius: "10px",
                                padding: "2px 8px",
                              }}
                            >
                              Partner expert
                            </span>
                          )}
                          <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.65)" }}>{post.meta}</span>
                        </div>

                        <div style={{ fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#7b1f2c", marginTop: "4px" }}>
                          {post.topicLabel}
                        </div>
                      </div>
                    </div>

                    {/* Post Body */}
                    <p style={{ fontSize: "15.5px", lineHeight: 1.65, color: "#39292a", margin: 0, whiteSpace: "pre-wrap" }}>
                      {post.body}
                    </p>

                    {/* Photos */}
                    {post.hasPhotos && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: post.photoGrid,
                          gap: "8px",
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        {post.photos.map((url, pIdx) => (
                          <div
                            key={pIdx}
                            style={{
                              width: "100%",
                              height: post.photos.length === 1 ? "240px" : "160px",
                              backgroundImage: `url(${url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              borderRadius: "4px",
                              border: "1px solid rgba(57, 41, 42, 0.12)",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Post Action Footer */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "18px",
                        alignItems: "center",
                        paddingTop: "12px",
                        borderTop: "1px solid rgba(57, 41, 42, 0.12)",
                      }}
                    >
                      {/* Heart Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleHeart(post.id)}
                        style={{
                          border: "none",
                          backgroundColor: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontFamily: "'Lora', Georgia, serif",
                          fontSize: "13.5px",
                          color: post.isHearted ? "#7b1f2c" : "rgba(57, 41, 42, 0.72)",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill={post.isHearted ? "#7b1f2c" : "none"}
                          stroke="currentColor"
                          strokeWidth="1.7"
                          width="16"
                          height="16"
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                        <span>{post.heartsCount}</span>
                      </button>

                      {/* Reply Toggle */}
                      <button
                        type="button"
                        onClick={() => setOpenReplyPostId(isReplyOpen ? null : post.id)}
                        style={{
                          border: "none",
                          backgroundColor: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontFamily: "'Lora', Georgia, serif",
                          fontSize: "13.5px",
                          color: "rgba(57, 41, 42, 0.72)",
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16">
                          <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.2A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" />
                        </svg>
                        <span>
                          {post.repliesCount === 0
                            ? (lang === "en" ? "Reply" : "Responder")
                            : `${post.repliesCount} ${post.repliesCount === 1 ? (lang === "en" ? "reply" : "respuesta") : (lang === "en" ? "replies" : "respuestas")}`}
                        </span>
                      </button>

                      <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.6)", marginLeft: "auto" }}>
                        {post.neighbourhood}
                      </span>

                      {/* Report Toggle */}
                      {!isReported ? (
                        <button
                          type="button"
                          onClick={() => setOpenReportPostId(isReportOpen ? null : post.id)}
                          style={{
                            border: "none",
                            backgroundColor: "transparent",
                            padding: 0,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "12.5px",
                            color: "rgba(57, 41, 42, 0.55)",
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="13" height="13">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                            <path d="M4 22v-7" />
                          </svg>
                          <span>Report</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#3b5e04" }}>✓ Reported</span>
                      )}
                    </div>

                    {/* Report Dialog Accordion */}
                    {isReportOpen && (
                      <div
                        style={{
                          border: "1px solid rgba(153, 56, 66, 0.3)",
                          backgroundColor: "rgba(153, 56, 66, 0.04)",
                          borderRadius: "6px",
                          padding: "12px 14px",
                        }}
                      >
                        <div style={{ fontSize: "13px", color: "#39292a", marginBottom: "8px" }}>
                          What is wrong with this post? A host reads every report the same day.
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                          {REPORT_REASONS.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleReport(post.id, r.id)}
                              style={{
                                border: "1px solid rgba(153, 56, 66, 0.4)",
                                backgroundColor: "#ffffff",
                                color: "#993842",
                                borderRadius: "14px",
                                padding: "6px 12px",
                                fontFamily: "'Lora', Georgia, serif",
                                fontSize: "12.5px",
                                cursor: "pointer",
                              }}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Replies Thread Accordion */}
                    {isReplyOpen && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                          borderTop: "1px solid rgba(57, 41, 42, 0.12)",
                          paddingTop: "14px",
                        }}
                      >
                        {post.replies.map((reply) => (
                          <div key={reply.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                            <div
                              style={{
                                flex: "none",
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                backgroundColor: "rgba(57, 41, 42, 0.08)",
                                border: "1px solid rgba(57, 41, 42, 0.18)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontFamily: "'Cormorant Garamond', Georgia, serif",
                                fontWeight: 600,
                                fontSize: "13px",
                                color: "#39292a",
                              }}
                            >
                              {reply.initial}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "baseline" }}>
                                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "14.5px" }}>
                                  {reply.author}
                                </span>
                                {reply.isExpert && (
                                  <span style={{ fontSize: "10px", color: "#5c4708", border: "1px solid rgba(201,162,39,0.5)", borderRadius: "8px", padding: "1px 6px" }}>
                                    Expert
                                  </span>
                                )}
                                <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.6)" }}>{reply.meta}</span>
                              </div>
                              <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.85)", margin: "4px 0 0" }}>
                                {reply.body}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Reply Input */}
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
                          <input
                            type="text"
                            value={replyDrafts[post.id] || ""}
                            onChange={(e) => setReplyDrafts({ ...replyDrafts, [post.id]: e.target.value })}
                            placeholder={lang === "en" ? "Say something kind or useful…" : "Di algo amable o constructivo…"}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSendReply(post.id);
                            }}
                            style={{
                              flex: "1 1 200px",
                              border: "1px solid rgba(57, 41, 42, 0.2)",
                              borderRadius: "6px",
                              backgroundColor: "#fdf8f2",
                              padding: "9px 12px",
                              fontFamily: "'Lora', Georgia, serif",
                              fontSize: "14px",
                              color: "#39292a",
                              outline: "none",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSendReply(post.id)}
                            style={{
                              border: "1px solid #7b1f2c",
                              backgroundColor: "transparent",
                              color: "#7b1f2c",
                              borderRadius: "4px",
                              padding: "8px 16px",
                              fontFamily: "'Cormorant Garamond', Georgia, serif",
                              fontWeight: 600,
                              fontSize: "14.5px",
                              cursor: "pointer",
                            }}
                          >
                            {lang === "en" ? "Reply" : "Responder"}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Right Sidebar Column */}
        <aside style={{ flex: "0 1 320px", minWidth: "270px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Eligibility / Welcome Card */}
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "10px" }}>
              {isUserSignedIn
                ? (lang === "en" ? "Bring it to the room" : "Tráelo al encuentro")
                : (lang === "en" ? "Reading is open. Posting is free." : "Leer está abierto. Publicar es gratuito.")}
            </div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: "0 0 16px" }}>
              {isUserSignedIn
                ? (lang === "en"
                    ? "The best threads start at an event and carry on here. There are walks every week, and they cost nothing."
                    : "Los mejores hilos comienzan en un evento y continúan aquí. Hay caminatas cada semana y no cuestan nada.")
                : (lang === "en"
                    ? "Your account is created when you book your first event. A free walk is the easiest start."
                    : "Tu cuenta se crea al reservar tu primer evento. Una caminata gratuita es el comienzo más sencillo.")}
            </p>
            <Link
              href="/events"
              style={{
                border: "1px solid #7b1f2c",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "9px 16px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14.5px",
                textDecoration: "none",
                display: "inline-block",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {isUserSignedIn
                ? (lang === "en" ? "See what is on" : "Ver eventos")
                : (lang === "en" ? "Book your first event" : "Reserva tu primer evento")}
            </Link>
          </div>

          {/* House Rules */}
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "12px" }}>
              House rules
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", padding: "8px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                Kindness first. Nobody is here to be corrected.
              </div>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", padding: "8px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                No selling to other mothers.
              </div>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", padding: "8px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                What is shared here stays here.
              </div>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", padding: "8px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                Advice from mothers is not medical advice.
              </div>
            </div>
            <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57, 41, 42, 0.65)", margin: "12px 0 0" }}>
              Every post is tied to a real account, even anonymous ones. Report anything that breaks the rules and a host reads it the same day.
            </p>
          </div>

          {/* From January 2027 Preview */}
          <div style={{ border: "1px solid rgba(201, 162, 39, 0.5)", borderRadius: "8px", backgroundColor: "rgba(201, 162, 39, 0.08)", padding: "20px 22px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#5c4708", marginBottom: "6px" }}>
              From January 2027
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", color: "#39292a", marginBottom: "8px" }}>
              Behind closed doors
            </div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "#5c4708", margin: "0 0 12px" }}>
              A private room for members only — the threads nobody wants found in a search. Everything you see here stays open.
            </p>
            <Link
              href="/membership"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14.5px",
                color: "#7b1f2c",
                textDecoration: "none",
              }}
            >
              What membership will be →
            </Link>
          </div>

          {/* Talked About This Week */}
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "12px" }}>
              {lang === "en" ? "Talked about this week" : "Temas más comentados"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {[
                { label: "Sleep regression at 4 months", topic: "sleep" },
                { label: "Nursery lists for 2027", topic: "schools" },
                { label: "Pelvic floor physios", topic: "postpartum" },
                { label: "Winter walks", topic: "friends" },
                { label: "Going back at 80%", topic: "work" },
                { label: "Feeding in public", topic: "feeding" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedFilter(item.topic)}
                  style={{
                    border: "1px solid rgba(57, 41, 42, 0.22)",
                    backgroundColor: "transparent",
                    color: "#39292a",
                    borderRadius: "14px",
                    padding: "6px 13px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#7b1f2c";
                    e.currentTarget.style.color = "#7b1f2c";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.22)";
                    e.currentTarget.style.color = "#39292a";
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
