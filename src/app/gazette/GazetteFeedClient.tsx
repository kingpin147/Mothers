"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { tStr } from "@/lib/i18nEngine";
import {
  PostItem,
  ReplyItem,
  getCirclePosts,
  createCirclePost,
  createCircleReply,
  toggleCircleHeart,
  toggleCircleReplyHeart,
  toggleCircleSavedPost,
  reportCirclePost,
} from "@/app/actions/gazette";
import { compressImageClient } from "@/lib/imageCompression";

const TOPICS = [
  { id: "all", labelEn: "Everything", labelEs: "Todo", labelFr: "Tout" },
  { id: "pregnancy", labelEn: "Pregnancy & birth", labelEs: "Embarazo y parto", labelFr: "Grossesse & accouchement" },
  { id: "feeding", labelEn: "Feeding", labelEs: "Lactancia y comida", labelFr: "Alimentation" },
  { id: "sleep", labelEn: "Sleep", labelEs: "Sueño", labelFr: "Sommeil" },
  { id: "postpartum", labelEn: "Postpartum", labelEs: "Puerperio", labelFr: "Post-partum" },
  { id: "schools", labelEn: "Nurseries & schools", labelEs: "Escuelas y guarderías", labelFr: "Crèches & écoles" },
  { id: "work", labelEn: "Work & money", labelEs: "Trabajo y dinero", labelFr: "Travail & argent" },
  { id: "bcn", labelEn: "Life in Barcelona", labelEs: "Vida en Barcelona", labelFr: "Vie à Barcelone" },
  { id: "friends", labelEn: "Meetups & friends", labelEs: "Quedadas y amigas", labelFr: "Rencontres & amies" },
  { id: "recs", labelEn: "Recommendations", labelEs: "Recomendaciones", labelFr: "Recommandations" },
  { id: "gear", labelEn: "Gear & Swap", labelEs: "Cosas y trueque", labelFr: "Affaires & troc" },
];

const COMPOSER_TOPIC_IDS = [
  "pregnancy",
  "feeding",
  "sleep",
  "postpartum",
  "schools",
  "work",
  "bcn",
  "friends",
  "recs",
  "gear",
];

const REPORT_REASONS = [
  { id: "unkind", labelEn: "Unkind or judgmental", labelEs: "Desagradable o crítico", labelFr: "Désobligeant ou jugeant" },
  { id: "selling_spam", labelEn: "Selling or self-promotion", labelEs: "Venta o autopromoción", labelFr: "Vente ou auto-promotion" },
  { id: "unsafe_private", labelEn: "Unsafe or private information", labelEs: "Información privada o insegura", labelFr: "Informations privées ou dangereuses" },
  { id: "child_photo_no_consent", labelEn: "Child photo without consent", labelEs: "Foto de menor sin consentimiento", labelFr: "Photo d'enfant sans consentement" },
];

export function GazetteFeedClient({
  initialPosts,
  currentUser,
  eligibility,
  trendingTopics = [],
}: {
  initialPosts: PostItem[];
  currentUser: any;
  eligibility: { canPost: boolean; reason?: string; totalBookings?: number };
  trendingTopics?: { topic: string; label: string; score: number; postCount: number }[];
}) {
  const { language: lang } = useLanguage();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [selectedFilter, setSelectedFilter] = useState(() => {
    const p = searchParams?.get("filter") || searchParams?.get("topic");
    return p === "saved" ? "saved" : "all";
  });
  const [customTagFilter, setCustomTagFilter] = useState<string | null>(null);
  const [loadingFilter, setLoadingFilter] = useState(false);

  useEffect(() => {
    const f = searchParams?.get("filter") || searchParams?.get("topic");
    if (f === "saved") {
      setSelectedFilter("saved");
      loadFeedForTopic("saved");
    }
  }, [searchParams]);

  const loadFeedForTopic = async (topicId: string) => {
    setLoadingFilter(true);
    try {
      const freshPosts = await getCirclePosts(topicId);
      setPosts(freshPosts);
    } catch {
      // Keep existing posts
    } finally {
      setLoadingFilter(false);
    }
  };

  const handleFilterClick = async (topicId: string) => {
    setSelectedFilter(topicId);
    setCustomTagFilter(null);
    await loadFeedForTopic(topicId);
  };

  // Composer State
  const [draft, setDraft] = useState("");
  const [composerTopic, setComposerTopic] = useState("postpartum");
  const [isAnon, setIsAnon] = useState(false);
  const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [notice, setNotice] = useState<{ text: string; color: string } | null>(null);
  const [posting, setPosting] = useState(false);

  // Reply & Report States per post
  const [openReplyPostId, setOpenReplyPostId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReportPostId, setOpenReportPostId] = useState<string | null>(null);
  const [reportedPostIds, setReportedPostIds] = useState<Set<string>>(new Set());
  const [loginPrompt, setLoginPrompt] = useState<{ postId: string; action: "like" | "save" } | null>(null);

  const [, startTransition] = useTransition();

  const handlePickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (draftPhotos.length + files.length > 4) {
      setNotice({
        text: lang === "fr" ? "Maximum 4 photos par publication." : lang === "es" ? "Máximo 4 fotos por publicación." : "Maximum 4 photos per post.",
        color: "#993842",
      });
      return;
    }

    setNotice({
      text: lang === "fr" ? "Compression des photos..." : lang === "es" ? "Comprimiendo fotos..." : "Compressing photos...",
      color: "rgba(57,41,42,0.7)",
    });

    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedDataUrl = await compressImageClient(file);
        compressedList.push(compressedDataUrl);
      }
      setDraftPhotos((prev) => [...prev, ...compressedList].slice(0, 4));
      setPhotoConsent(false);
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
      window.location.href = "/account/login?redirect=/gazette&mode=register";
      return;
    }

    if (!eligibility.canPost) {
      if (eligibility.reason === "membership_required") {
        setNotice({
          text: lang === "fr"
            ? "Vous avez atteint la limite de 3 publications pour les non-membres. Devenez membre pour un accès illimité à La Gazette."
            : lang === "es"
            ? "Has alcanzado el límite de 3 aportaciones para no socias. Hazte socia para acceso ilimitado a La Gazette."
            : "You have reached the 3-post limit for non-members. Become a member for unlimited conversations in La Gazette.",
          color: "#7b1f2c",
        });
      } else if (eligibility.reason === "booking_required") {
        setNotice({
          text: lang === "fr"
            ? "Tout le monde peut lire. Ouvrez un compte gratuit pour publier."
            : lang === "es"
            ? "Cualquiera puede leer. Abre una cuenta gratuita para publicar."
            : "Anyone can read. Open a free account to post.",
          color: "#7b1f2c",
        });
      } else {
        setNotice({
          text: lang === "fr"
            ? "Votre compte n'a pas l'autorisation de publier pour le moment."
            : lang === "es"
            ? "Tu cuenta no tiene permisos para publicar actualmente."
            : "Your account is paused from posting.",
          color: "#993842",
        });
      }
      return;
    }

    if (draft.trim().length < 10) {
      setNotice({
        text: lang === "fr" ? "Veuillez écrire au moins 10 caractères." : lang === "es" ? "Por favor escribe al menos 10 caracteres." : "Please write at least 10 characters.",
        color: "#993842",
      });
      return;
    }

    if (draftPhotos.length > 0 && !photoConsent) {
      setNotice({
        text: lang === "fr"
          ? "Veuillez confirmer l'autorisation parentale pour les photos."
          : lang === "es"
          ? "Por favor confirma el permiso de los padres para las fotos."
          : "Please confirm parental permission for photos.",
        color: "#993842",
      });
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
        anonymousArea: currentUser?.neighbourhood || "Barcelona",
        photoConsent,
      });

      if (res.success && res.post) {
        setPosts((prev) => [res.post, ...prev]);
        setDraft("");
        setDraftPhotos([]);
        setIsAnon(false);
        setNotice({
          text: lang === "fr" ? "Publié dans La Gazette." : lang === "es" ? "Publicado en La Gazette." : "Posted to La Gazette.",
          color: "#3b5e04",
        });
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
      setLoginPrompt({ postId, action: "like" });
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

  const handleToggleReplyHeart = async (postId: string, replyId: string) => {
    if (!currentUser) {
      setLoginPrompt({ postId, action: "like" });
      return;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            replies: p.replies.map((r) => {
              if (r.id === replyId) {
                const nextState = !r.isHearted;
                return {
                  ...r,
                  isHearted: nextState,
                  heartsCount: nextState ? (r.heartsCount || 0) + 1 : Math.max(0, (r.heartsCount || 0) - 1),
                };
              }
              return r;
            }),
          };
        }
        return p;
      })
    );

    startTransition(async () => {
      try {
        await toggleCircleReplyHeart(replyId);
      } catch {
        // Rollback on failure
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                replies: p.replies.map((r) => {
                  if (r.id === replyId) {
                    const nextState = !r.isHearted;
                    return {
                      ...r,
                      isHearted: nextState,
                      heartsCount: nextState ? (r.heartsCount || 0) + 1 : Math.max(0, (r.heartsCount || 0) - 1),
                    };
                  }
                  return r;
                }),
              };
            }
            return p;
          })
        );
      }
    });
  };

  const handleToggleSave = async (postId: string) => {
    if (!currentUser) {
      setLoginPrompt({ postId, action: "save" });
      return;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            isSaved: !p.isSaved,
          };
        }
        return p;
      })
    );

    startTransition(async () => {
      try {
        await toggleCircleSavedPost(postId);
      } catch {
        // Rollback on failure
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                isSaved: !p.isSaved,
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
      window.location.href = "/account/login?redirect=/gazette&mode=register";
      return;
    }

    if (!eligibility.canPost) {
      if (eligibility.reason === "membership_required") {
        alert(
          lang === "fr"
            ? "Vous avez atteint la limite de 3 publications pour les non-membres. Devenez membre pour des réponses illimitées."
            : lang === "es"
            ? "Has alcanzado el límite de 3 aportaciones para no socias. Hazte socia para acceso ilimitado."
            : "You have reached the 3-post limit for non-members. Become a member for unlimited replies."
        );
      } else {
        alert(
          lang === "fr"
            ? "Répondre nécessite un compte actif."
            : lang === "es"
            ? "Responder requiere una cuenta activa."
            : "Replying requires an active account."
        );
      }
      return;
    }

    // Optimistic reply append
    const userFullName = currentUser?.name || currentUser?.firstName || "Mother";
    const nameParts = userFullName.trim().split(/\s+/);
    const userFirstName = currentUser?.firstName || nameParts[0] || "Mother";
    const userLastNameInitial = currentUser?.lastName?.[0] || (nameParts.length > 1 ? nameParts[1][0] : "");
    const replyAuthor = `${userFirstName}${userLastNameInitial ? " " + userLastNameInitial.toUpperCase() + "." : ""}`;
    const rInitial = (userFirstName[0] || "M").toUpperCase();

    const optimisticReply: ReplyItem = {
      id: "temp-" + Date.now(),
      author: replyAuthor,
      initial: rInitial,
      body: text,
      meta: lang === "fr" ? "À l'instant" : lang === "es" ? "Ahora mismo" : "Just now",
      isExpert: false,
      isAnonymous: false,
      heartsCount: 0,
      isHearted: false,
      neighbourhood: currentUser?.neighbourhood || "Barcelona",
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
      const res = await createCircleReply(postId, text);
      if (res.success && res.reply) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                replies: p.replies.map((r) => (r.id === optimisticReply.id ? res.reply : r)),
              };
            }
            return p;
          })
        );
      }
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

  const userFullName = currentUser?.name || currentUser?.firstName || "";
  const nameParts = userFullName.trim().split(/\s+/);
  const userFirstName = currentUser?.firstName || nameParts[0] || "";
  const isUserSignedIn = Boolean(currentUser);
  const myInitial = isUserSignedIn
    ? (isAnon ? "·" : (userFirstName ? userFirstName[0].toUpperCase() : "M"))
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

  const savedCount = posts.filter((p) => p.isSaved).length;

  const filteredPosts = posts.filter((p) => {
    if (selectedFilter === "saved") return p.isSaved;
    if (selectedFilter === "all") return true;
    return p.topic === selectedFilter;
  });

  const getTopicLabel = (topicId: string) => {
    const topicObj = TOPICS.find((t) => t.id === topicId);
    if (!topicObj) return topicId;
    if (lang === "fr") return topicObj.labelFr;
    if (lang === "es") return topicObj.labelEs;
    return topicObj.labelEn;
  };

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
          La Gazette
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
          {tStr("Talk to mothers who get it.", lang)}
        </h1>
        <p style={{ fontSize: "16.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", maxWidth: "58ch", margin: 0 }}>
          {lang === "fr"
            ? "Partagez ce que vous vivez, demandez conseil et soutenez-vous les unes les autres. Ouvert à toutes pour lire et publier — de façon anonyme si vous en ressentez le besoin."
            : lang === "es"
            ? "Comparte lo que estás viviendo, pide consejo y apóyate en las demás. Abierto para que todas lean y publiquen — de forma anónima si lo necesitas."
            : "Share what you are living, ask for advice, cheer each other on. Open to everyone to read and post — anonymously if you need to."}
        </p>
      </section>

      {/* Main Content Layout */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(18px, 3vw, 32px) clamp(12px, 4vw, 48px) 80px",
          display: "flex",
          flexWrap: "wrap",
          gap: "28px",
          alignItems: "flex-start",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Left Feed Column */}
        <div style={{ flex: "1 1 540px", minWidth: 0, width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Post Composer Card */}
          <div
            style={{
              border: "1px solid rgba(57, 41, 42, 0.2)",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              padding: "clamp(14px, 3.5vw, 22px)",
              boxShadow: "0 2px 8px rgba(57, 41, 42, 0.04)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", gap: "clamp(10px, 2.5vw, 14px)", alignItems: "flex-start", width: "100%" }}>
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
                      ? (lang === "fr"
                          ? "Que demanderiez-vous à la communauté ce soir ?"
                          : lang === "es"
                          ? "¿Qué preguntarías a la comunidad esta noche?"
                          : "What would you ask the room tonight?")
                      : (lang === "fr"
                          ? "Ouvrez un compte gratuit pour publier."
                          : lang === "es"
                          ? "Abre una cuenta gratuita para publicar."
                          : "Open a free account to post.")
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
                  <div style={{ marginTop: "11px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {draftPhotos.map((dataUrl, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            width: "84px",
                            height: "84px",
                            borderRadius: "5px",
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
                              top: "4px",
                              right: "4px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: "none",
                              backgroundColor: "rgba(57,41,42,0.72)",
                              color: "#f8efe2",
                              fontFamily: "'Lora', Georgia, serif",
                              fontSize: "13px",
                              lineHeight: 1,
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

                    <label style={{ display: "flex", gap: "9px", alignItems: "flex-start", cursor: "pointer", marginTop: "10px" }}>
                      <input
                        type="checkbox"
                        checked={photoConsent}
                        onChange={(e) => setPhotoConsent(e.target.checked)}
                        style={{ marginTop: "3px", width: "15px", height: "15px", accentColor: "#7b1f2c", flex: "none" }}
                      />
                      <span style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.78)" }}>
                        {lang === "fr"
                          ? "Ces photos ne montrent aucun enfant autre que les miens — ou j'ai l'accord de leurs parents."
                          : lang === "es"
                          ? "Estas fotos no muestran a otros niños además de los míos — o tengo el permiso de sus padres."
                          : "These photos show no children other than my own — or I have their parent's permission."}
                      </span>
                    </label>
                  </div>
                )}

                {/* Unified Composer Action Bar */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end", justifyContent: "space-between", marginTop: "12px", width: "100%" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", flex: "1 1 200px", minWidth: 0 }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid rgba(57, 41, 42, 0.25)",
                        borderRadius: "14px",
                        padding: "5px 11px",
                        fontSize: "12.5px",
                        color: "rgba(57, 41, 42, 0.74)",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      <span>{tStr("Photo", lang)}</span>
                      <input type="file" accept="image/*" multiple onChange={handlePickPhotos} style={{ display: "none" }} />
                    </label>

                    {COMPOSER_TOPIC_IDS.map((tId) => {
                      const topicObj = TOPICS.find((t) => t.id === tId);
                      const isSelected = composerTopic === tId;
                      const topicLabel = lang === "fr" ? topicObj?.labelFr : lang === "es" ? topicObj?.labelEs : topicObj?.labelEn;
                      return (
                        <button
                          key={tId}
                          type="button"
                          onClick={() => setComposerTopic(tId)}
                          style={{
                            border: isSelected ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.25)",
                            backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                            color: isSelected ? "#7b1f2c" : "#39292a",
                            borderRadius: "14px",
                            padding: "5px 11px",
                            fontFamily: "'Lora', Georgia, serif",
                            fontSize: "12px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {topicLabel}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end", marginLeft: "auto", flexShrink: 0, maxWidth: "100%" }}>
                    <label style={{ display: "flex", gap: "7px", alignItems: "center", cursor: "pointer", fontSize: "13px", color: "rgba(57,41,42,0.72)", whiteSpace: "nowrap" }}>
                      <input
                        type="checkbox"
                        checked={isAnon}
                        onChange={(e) => setIsAnon(e.target.checked)}
                        style={{ width: "15px", height: "15px", accentColor: "#7b1f2c" }}
                      />
                      <span>{tStr("Post anonymously", lang)}</span>
                    </label>

                    <button
                      type="button"
                      disabled={posting}
                      onClick={handleCreatePost}
                      style={{
                        border: "1px solid #7b1f2c",
                        backgroundColor: "transparent",
                        color: "#7b1f2c",
                        borderRadius: "4px",
                        padding: "8px 16px",
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: posting ? "wait" : "pointer",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {posting
                        ? (lang === "fr" ? "Publication..." : lang === "es" ? "Publicando..." : "Posting...")
                        : !isUserSignedIn
                        ? (lang === "fr" ? "Ouvrir un compte pour publier" : lang === "es" ? "Abre una cuenta para publicar" : "Open an account to post")
                        : (lang === "fr" ? "Publier" : lang === "es" ? "Publicar" : "Post")}
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
                    lang === "fr"
                      ? "Jusqu'à 4 photos (JPG, PNG, WebP, moins de 10 Mo). 5 publications par jour. Les publications anonymes restent associées à votre compte — les hôtesses peuvent toujours voir qui a écrit quoi."
                      : lang === "es"
                      ? "Hasta 4 fotos (JPG, PNG, WebP, menos de 10 MB). 5 publicaciones al día. Las publicaciones anónimas siguen vinculadas a tu cuenta — los anfitriones siempre pueden ver quién escribió qué."
                      : "Up to 4 photos (JPG, PNG, WebP, under 10 MB). 5 posts a day. Anonymous posts still belong to your account — the hosts can always see who wrote what."
                  ) : (
                    lang === "fr"
                      ? "Tout le monde peut lire. Ouvrez un compte gratuit pour publier, et publiez de manière anonyme si nécessaire."
                      : lang === "es"
                      ? "Cualquiera puede leer. Abre una cuenta gratuita para publicar, y firma de forma anónima si lo necesitas."
                      : "Anyone can read. Open a free account to post, and sign sensitive posts anonymously if you need to."
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Topic Filter Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {TOPICS.map((topic) => {
              const active = selectedFilter === topic.id;
              const label = lang === "fr" ? topic.labelFr : lang === "es" ? topic.labelEs : topic.labelEn;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleFilterClick(topic.id)}
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
                  {label}
                </button>
              );
            })}

            {/* Saved Posts Filter (Shows only when signed in) */}
            {isUserSignedIn && (
              <button
                type="button"
                onClick={() => {
                  const nextFilter = selectedFilter === "saved" ? "all" : "saved";
                  handleFilterClick(nextFilter);
                }}
                style={{
                  border: selectedFilter === "saved" ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                  backgroundColor: selectedFilter === "saved" ? "#7b1f2c" : "#ffffff",
                  color: selectedFilter === "saved" ? "#fdf8f2" : "#39292a",
                  borderRadius: "16px",
                  padding: "7px 15px",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg viewBox="0 0 24 24" fill={selectedFilter === "saved" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" width="13" height="13">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
                <span>
                  {savedCount > 0
                    ? (lang === "fr" ? `Publications enregistrées · ${savedCount}` : lang === "es" ? `Publicaciones guardadas · ${savedCount}` : `Saved publications · ${savedCount}`)
                    : (lang === "fr" ? "Publications enregistrées" : lang === "es" ? "Publicaciones guardadas" : "Saved publications")}
                </span>
              </button>
            )}
          </div>

          {(selectedFilter !== "all" || customTagFilter) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                backgroundColor: "rgba(123, 31, 44, 0.05)",
                border: "1px solid rgba(123, 31, 44, 0.2)",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#39292a",
              }}
            >
              <span>
                {selectedFilter === "saved" ? (
                  lang === "fr" ? (
                    <>
                      Affichage de <strong>{filteredPosts.length}</strong> {filteredPosts.length === 1 ? "publication enregistrée" : "publications enregistrées"}
                    </>
                  ) : lang === "es" ? (
                    <>
                      Mostrando <strong>{filteredPosts.length}</strong> {filteredPosts.length === 1 ? "publicación guardada" : "publicaciones guardadas"}
                    </>
                  ) : (
                    <>
                      Showing <strong>{filteredPosts.length}</strong> saved {filteredPosts.length === 1 ? "post" : "posts"}
                    </>
                  )
                ) : lang === "fr" ? (
                  <>
                    Affichage de <strong>{filteredPosts.length}</strong> publications sur{" "}
                    <strong>{customTagFilter || getTopicLabel(selectedFilter)}</strong>
                  </>
                ) : lang === "es" ? (
                  <>
                    Mostrando <strong>{filteredPosts.length}</strong> publicaciones en{" "}
                    <strong>{customTagFilter || getTopicLabel(selectedFilter)}</strong>
                  </>
                ) : (
                  <>
                    Showing <strong>{filteredPosts.length}</strong> posts on{" "}
                    <strong>{customTagFilter || getTopicLabel(selectedFilter)}</strong>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => handleFilterClick("all")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7b1f2c",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  textDecoration: "underline",
                }}
              >
                {tStr("Clear", lang)}
              </button>
            </div>
          )}

          {/* Posts Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {loadingFilter ? (
              <div style={{ padding: "32px", textAlign: "center", color: "rgba(57, 41, 42, 0.6)" }}>
                {lang === "fr" ? "Chargement des publications..." : lang === "es" ? "Cargando publicaciones..." : "Loading publications..."}
              </div>
            ) : filteredPosts.length === 0 ? (
              selectedFilter === "saved" ? (
                <div
                  style={{
                    border: "1px solid rgba(57, 41, 42, 0.16)",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    padding: "24px",
                    color: "rgba(57, 41, 42, 0.78)",
                  }}
                >
                  <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>
                    {lang === "fr" ? (
                      <>Rien d'enregistré pour le moment. Appuyez sur <strong>Enregistrer</strong> sur n'importe quelle publication — une recommandation, un conseil, un produit — et retrouvez-la ici dès que vous en avez besoin.</>
                    ) : lang === "es" ? (
                      <>Nada guardado todavía. Toca <strong>Guardar</strong> en cualquier publicación — una recomendación, un consejo, un producto — y encuéntrala aquí cuando la necesites.</>
                    ) : (
                      <>Nothing saved yet. Tap <strong>Save</strong> on any post — a recommendation, a tip, a product — and find it here whenever you need it.</>
                    )}
                  </p>
                </div>
              ) : (
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
                  {lang === "fr"
                    ? "Aucune publication dans cette catégorie pour le moment. Soyez la première !"
                    : lang === "es"
                    ? "Todavía no hay publicaciones aquí. ¡Sé la primera!"
                    : "No posts in this category yet. Be the first to share!"}
                </div>
              )
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
                          {getTopicLabel(post.topic)}
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
                            ? (lang === "fr" ? "Répondre" : lang === "es" ? "Responder" : "Reply")
                            : `${post.repliesCount} ${post.repliesCount === 1 ? (lang === "fr" ? "réponse" : lang === "es" ? "respuesta" : "reply") : (lang === "fr" ? "réponses" : lang === "es" ? "respuestas" : "replies")}`}
                        </span>
                      </button>

                      {/* Save Button (Private bookmark) */}
                      <button
                        type="button"
                        onClick={() => handleToggleSave(post.id)}
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
                          color: post.isSaved ? "#7b1f2c" : "rgba(57, 41, 42, 0.72)",
                          transition: "color 0.15s ease",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill={post.isSaved ? "#7b1f2c" : "none"}
                          stroke="currentColor"
                          strokeWidth="1.7"
                          width="16"
                          height="16"
                        >
                          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                        </svg>
                        <span>
                          {post.isSaved
                            ? (lang === "fr" ? "Enregistré" : lang === "es" ? "Guardado" : "Saved")
                            : (lang === "fr" ? "Enregistrer" : lang === "es" ? "Guardar" : "Save")}
                        </span>
                      </button>

                      <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.6)", marginLeft: "auto" }}>
                        {post.neighbourhood}
                      </span>

                      {/* Report Toggle (Only shown when signed in) */}
                      {!isReported && currentUser && (
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
                          <span>{lang === "fr" ? "Signaler" : lang === "es" ? "Denunciar" : "Report"}</span>
                        </button>
                      )}
                      {isReported && (
                        <span style={{ fontSize: "12px", color: "#3b5e04" }}>
                          ✓ {lang === "fr" ? "Signalé" : lang === "es" ? "Denunciado" : "Reported"}
                        </span>
                      )}
                    </div>

                    {/* Login / Register Prompt for liking or saving without session */}
                    {loginPrompt?.postId === post.id && !currentUser && (
                      <div
                        style={{
                          backgroundColor: "rgba(123, 31, 44, 0.08)",
                          border: "1px solid rgba(123, 31, 44, 0.25)",
                          borderRadius: "6px",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          fontSize: "13.5px",
                          color: "#7b1f2c",
                        }}
                      >
                        <span style={{ fontFamily: "'Lora', Georgia, serif" }}>
                          {loginPrompt.action === "save"
                            ? lang === "fr"
                              ? "Ouvrez un compte gratuit pour enregistrer des publications."
                              : lang === "es"
                              ? "Abre una cuenta gratuita para guardar publicaciones."
                              : "Open a free account to save posts."
                            : lang === "fr"
                            ? "Veuillez vous connecter pour aimer."
                            : lang === "es"
                            ? "Inicia sesión para dar me gusta."
                            : "Please log in to like."}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Link
                            href={
                              loginPrompt.action === "save"
                                ? "/account/login?redirect=/gazette&mode=register"
                                : "/account/login?redirect=/gazette"
                            }
                            style={{
                              fontFamily: "'Cormorant Garamond', Georgia, serif",
                              fontWeight: 600,
                              fontSize: "15px",
                              color: "#7b1f2c",
                              textDecoration: "underline",
                              textUnderlineOffset: "2px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {loginPrompt.action === "save"
                              ? lang === "fr"
                                ? "Ouvrir un compte gratuit →"
                                : lang === "es"
                                ? "Abrir cuenta gratuita →"
                                : "Open a free account →"
                              : lang === "fr"
                              ? "Connexion →"
                              : lang === "es"
                              ? "Acceder →"
                              : "Sign in →"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setLoginPrompt(null)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#7b1f2c",
                              fontSize: "18px",
                              cursor: "pointer",
                              padding: "0 4px",
                              lineHeight: 1,
                            }}
                            aria-label="Close"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}

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
                          {lang === "fr"
                            ? "Quel est le problème avec cette publication ? Une hôtesse lit chaque signalement le jour même."
                            : lang === "es"
                            ? "¿Qué ocurre con esta publicación? Una anfitriona revisa cada reporte el mismo día."
                            : "What is wrong with this post? A host reads every report the same day."}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                          {REPORT_REASONS.map((r) => {
                            const rLabel = lang === "fr" ? r.labelFr : lang === "es" ? r.labelEs : r.labelEn;
                            return (
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
                                {rLabel}
                              </button>
                            );
                          })}
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
                                    Partner expert
                                  </span>
                                )}
                                <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.6)" }}>{reply.meta}</span>
                                {reply.neighbourhood && (
                                  <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.6)" }}>
                                    · {reply.neighbourhood}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.85)", margin: "4px 0 0" }}>
                                {reply.body}
                              </p>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleReplyHeart(post.id, reply.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: "2px 4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "12px",
                                    color: reply.isHearted ? "#7b1f2c" : "rgba(57, 41, 42, 0.6)",
                                    cursor: "pointer",
                                    fontFamily: "'Lora', Georgia, serif",
                                  }}
                                  aria-label="Like reply"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill={reply.isHearted ? "#7b1f2c" : "none"}
                                    stroke={reply.isHearted ? "#7b1f2c" : "currentColor"}
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    width="13"
                                    height="13"
                                  >
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                  </svg>
                                  <span>{reply.heartsCount || 0}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Reply Input */}
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
                          <input
                            type="text"
                            value={replyDrafts[post.id] || ""}
                            onChange={(e) => setReplyDrafts({ ...replyDrafts, [post.id]: e.target.value })}
                            placeholder={
                              lang === "fr"
                                ? "Dites quelque chose de bienveillant ou d'utile…"
                                : lang === "es"
                                ? "Di algo amable o útil…"
                                : "Say something kind or useful…"
                            }
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
                            {lang === "fr" ? "Répondre" : lang === "es" ? "Responder" : "Reply"}
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
        <aside style={{ flex: "1 1 280px", minWidth: 0, width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Talked About This Week Module */}
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.18)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px", boxShadow: "0 2px 8px rgba(57, 41, 42, 0.04)" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "20px", marginBottom: "14px", color: "#39292a" }}>
              {lang === "fr" ? "Discuté cette semaine" : lang === "es" ? "Hablado esta semana" : "Talked about this week"}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(trendingTopics && trendingTopics.length > 0
                ? trendingTopics.map((t) => ({
                    tagEn: t.label,
                    tagEs: TOPICS.find((x) => x.id === t.topic)?.labelEs || t.label,
                    tagFr: TOPICS.find((x) => x.id === t.topic)?.labelFr || t.label,
                    topicId: t.topic,
                  }))
                : [
                    { tagEn: "Sleep regression at 4 months", tagEs: "Regresión de sueño a los 4 meses", tagFr: "Régression du sommeil à 4 mois", topicId: "sleep" },
                    { tagEn: "Nursery lists for 2027", tagEs: "Lista de guarderías 2027", tagFr: "Inscriptions crèches 2027", topicId: "schools" },
                    { tagEn: "Pelvic floor physios", tagEs: "Fisio de suelo pélvico", tagFr: "Kinés rééducation périnéale", topicId: "postpartum" },
                    { tagEn: "Winter walks", tagEs: "Paseos de invierno", tagFr: "Balades d'hiver", topicId: "friends" },
                    { tagEn: "Going back at 80%", tagEs: "Volver al 80%", tagFr: "Reprise à 80%", topicId: "work" },
                    { tagEn: "Feeding in public", tagEs: "Lactancia en público", tagFr: "Allaitement en public", topicId: "feeding" },
                  ]
              ).map((item, idx) => {
                const isActive = selectedFilter === item.topicId || customTagFilter === item.tagEn;
                const tagLabel = lang === "fr" ? item.tagFr : lang === "es" ? item.tagEs : item.tagEn;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (selectedFilter === item.topicId) {
                        setCustomTagFilter(null);
                        handleFilterClick("all");
                      } else {
                        setCustomTagFilter(item.tagEn);
                        handleFilterClick(item.topicId);
                      }
                    }}
                    style={{
                      border: isActive ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.22)",
                      backgroundColor: isActive ? "rgba(123, 31, 44, 0.08)" : "#ffffff",
                      color: isActive ? "#7b1f2c" : "#39292a",
                      borderRadius: "18px",
                      padding: "6px 14px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      lineHeight: 1.35,
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = "#7b1f2c";
                        e.currentTarget.style.color = "#7b1f2c";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.22)";
                        e.currentTarget.style.color = "#39292a";
                      }
                    }}
                  >
                    {tagLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Eligibility / Welcome Card */}
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "10px" }}>
              {isUserSignedIn
                ? (lang === "fr" ? "Venez en parler en vrai" : lang === "es" ? "Tráelo al encuentro" : "Bring it to the room")
                : (lang === "fr" ? "Lecture libre. Publication gratuite." : lang === "es" ? "Lectura abierta. Publicar es gratis." : "Reading is open. Posting is free.")}
            </div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: "0 0 16px" }}>
              {isUserSignedIn
                ? (lang === "fr"
                    ? "Les meilleures discussions commencent lors d'un événement et se poursuivent ici. Il y a des événements chaque semaine, à partir de 0 crédit."
                    : lang === "es"
                    ? "Los mejores hilos comienzan en un evento y continúan aquí. Hay eventos cada semana, desde 0 créditos."
                    : "The best threads start at an event and carry on here. There are events every week, from 0 credits.")
                : (lang === "fr"
                    ? "Ouvrez un compte gratuit pour publier et répondre, ou réservez un événement et rencontrez les mamans avec qui vous échangez."
                    : lang === "es"
                    ? "Abre una cuenta gratuita para publicar y responder, o reserva un evento y conoce a las madres con las que hablas."
                    : "Open a free account to post and reply, or book an event and meet the mothers you are talking to.")}
            </p>
            <Link
              href={isUserSignedIn ? "/events" : "/account/login?redirect=/gazette&mode=register"}
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
                ? (lang === "fr" ? "Voir le programme" : lang === "es" ? "Ver eventos" : "See what is on")
                : (lang === "fr" ? "Ouvrir un compte gratuit" : lang === "es" ? "Abrir cuenta gratuita" : "Open a free account")}
            </Link>
          </div>

          {/* House Rules */}
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "12px" }}>
              {lang === "fr" ? "Règles de la maison" : lang === "es" ? "Normas de la casa" : "House rules"}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", padding: "8px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                {lang === "fr" ? "La bienveillance avant tout. Personne n'est ici pour être jugée." : lang === "es" ? "La amabilidad primero. Nadie está aquí para ser corregida." : "Kindness first. Nobody is here to be corrected."}
              </div>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", padding: "8px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                {lang === "fr" ? "Pas de vente aux autres mamans." : lang === "es" ? "Prohibido vender a otras madres." : "No selling to other mothers."}
              </div>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", padding: "8px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                {lang === "fr" ? "Ce qui est partagé ici reste ici." : lang === "es" ? "Lo que se comparte aquí, se queda aquí." : "What is shared here stays here."}
              </div>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", padding: "8px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                {lang === "fr" ? "Les conseils de mamans ne sont pas des avis médicaux." : lang === "es" ? "El consejo de otras madres no es asesoramiento médico." : "Advice from mothers is not medical advice."}
              </div>
            </div>
            <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57, 41, 42, 0.65)", margin: "12px 0 0" }}>
              {lang === "fr"
                ? "Chaque message est lié à un vrai compte, même les anonymes. Signalez tout manquement aux règles et une hôtesse le lira le jour même."
                : lang === "es"
                ? "Cada publicación está vinculada a una cuenta real, incluso las anónimas. Denuncia lo que incumpla las normas y una anfitriona lo revisará el mismo día."
                : "Every post is tied to a real account, even anonymous ones. Report anything that breaks the rules and a host reads it the same day."}
            </p>
          </div>

          {/* After Launch Preview */}
          <div style={{ backgroundColor: "#fdf8ec", border: "1px solid rgba(197, 142, 45, 0.35)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#5c4708", marginBottom: "6px" }}>
              {lang === "fr" ? "Après le lancement" : lang === "es" ? "Tras el lanzamiento" : "After Launch"}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", color: "#39292a", marginBottom: "8px" }}>
              {lang === "fr" ? "À huis clos" : lang === "es" ? "A puerta cerrada" : "Behind closed doors"}
            </div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "#5c4708", margin: "0 0 12px" }}>
              {lang === "fr"
                ? "Un espace privé réservé aux membres — les discussions intimes hors des moteurs de recherche. Tout ce que vous voyez ici reste accessible."
                : lang === "es"
                ? "Un espacio privado solo para socias — los hilos que nadie quiere que aparezcan en búsquedas. Todo lo que ves aquí sigue siendo abierto."
                : "A private room for members only — the threads nobody wants found in a search. Everything you see here stays open."}
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
              {lang === "fr" ? "Ce que sera l'adhésion →" : lang === "es" ? "Cómo será la membresía →" : "What membership will be →"}
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
