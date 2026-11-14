"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getConversationsAction,
  getMessagesAction,
  sendMessageAction,
  blockUserAction,
  reportConversationAction,
  startOrGetConversationWith,
} from "@/app/actions/messages";
import ThemeLoader from "@/components/ThemeLoader";

interface MessagesInboxProps {
  lang: string;
  initialTargetUserId?: string | null;
  onUnreadChange?: () => void;
}

export default function MessagesInbox({
  lang = "en",
  initialTargetUserId,
  onUnreadChange,
}: MessagesInboxProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeOtherPerson, setActiveOtherPerson] = useState<any>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const loadConversations = async (targetToOpen?: string) => {
    setLoadingConvs(true);
    const res = await getConversationsAction();
    if (res.success && res.conversations) {
      setConversations(res.conversations);
      if (onUnreadChange) onUnreadChange();

      if (targetToOpen) {
        setActiveConvId(targetToOpen);
      } else if (res.conversations.length > 0 && !activeConvId) {
        setActiveConvId(res.conversations[0].id);
      }
    }
    setLoadingConvs(false);
  };

  useEffect(() => {
    if (initialTargetUserId) {
      startOrGetConversationWith(initialTargetUserId).then((res) => {
        if (res.success && res.conversationId) {
          loadConversations(res.conversationId);
        } else {
          loadConversations();
        }
      });
    } else {
      loadConversations();
    }
  }, [initialTargetUserId]);

  // Load messages whenever activeConvId changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setActiveOtherPerson(null);
      return;
    }

    setLoadingMessages(true);
    getMessagesAction(activeConvId).then((res) => {
      setLoadingMessages(false);
      if (res.success) {
        setMessages(res.messages || []);
        setActiveOtherPerson(res.otherPerson);
        setIsSuspended(!!res.currentPersonSuspended);
        if (onUnreadChange) onUnreadChange();
        // Update unreadCount in conversation list
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
        );
      }
    });
  }, [activeConvId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConvId || !inputText.trim() || sending || isSuspended) return;

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);

    const res = await sendMessageAction(activeConvId, textToSend);
    setSending(false);

    if (res.success && res.message) {
      setMessages((prev) => [...prev, res.message]);
      // Update snippet in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, lastMessageText: textToSend, lastMessageAt: new Date() }
            : c
        )
      );
    } else if (res.error === "DAILY_CONVERSATION_LIMIT_REACHED") {
      setActionNotice(
        lang === "es"
          ? "Has alcanzado el límite de 20 conversaciones nuevas al día."
          : "You have reached the limit of 20 new conversations per day."
      );
    } else if (res.error === "ACCOUNT_SUSPENDED") {
      setIsSuspended(true);
      setActionNotice(
        lang === "es"
          ? "Tu cuenta está suspendida. No puedes enviar mensajes."
          : "Your account is suspended. You cannot send messages."
      );
    }
  };

  const handleBlock = async () => {
    if (!activeOtherPerson || !activeConvId) return;
    const confirmText =
      lang === "es"
        ? `¿Bloquear a ${activeOtherPerson.firstName}? La conversación desaparecerá para ambas.`
        : `Block ${activeOtherPerson.firstName}? The conversation will disappear for both of you.`;
    if (!window.confirm(confirmText)) return;

    await blockUserAction(activeOtherPerson.id);
    setActiveConvId(null);
    loadConversations();
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !reportReason.trim()) return;

    await reportConversationAction(activeConvId, reportReason);
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportSubmitted(false);
      setReportReason("");
    }, 2000);
  };

  const t = {
    messages: lang === "fr" ? "Messages" : lang === "es" ? "Mensajes" : "Messages",
    noConversations:
      lang === "fr"
        ? "Aucun message pour l'instant. Écrivez à une maman depuis La Gazette ou vos rencontres !"
        : lang === "es"
        ? "No tienes mensajes todavía. ¡Escribe a una mamá desde La Gazette o tus encuentros!"
        : "No messages yet. Message a mother from La Gazette or mothers you met!",
    placeholder:
      lang === "fr"
        ? "Écrivez un message bienveillant (max 2 000 caractères)..."
        : lang === "es"
        ? "Escribe un mensaje respetuoso (máx. 2.000 caracteres)..."
        : "Write a kind message (max 2,000 characters)...",
    send: lang === "fr" ? "Envoyer" : lang === "es" ? "Enviar" : "Send",
    block: lang === "fr" ? "Bloquer" : lang === "es" ? "Bloquear" : "Block",
    report: lang === "fr" ? "Signaler" : lang === "es" ? "Denunciar" : "Report",
    suspendedNotice:
      lang === "fr"
        ? "Votre compte est suspendu. Vous pouvez lire les messages mais vous ne pouvez pas répondre."
        : lang === "es"
        ? "Tu cuenta está suspendida. Puedes leer mensajes pero no puedes responder."
        : "Your account is suspended. You can read messages but cannot send replies.",
  };

  return (
    <div
      style={{
        border: "1px solid rgba(57, 41, 42, 0.16)",
        borderRadius: "8px",
        background: "#ffffff",
        minHeight: "560px",
        display: "grid",
        gridTemplateColumns: "clamp(260px, 32%, 340px) 1fr",
        overflow: "hidden",
      }}
    >
      {/* ─── Left Sidebar: Conversations List ─── */}
      <div
        style={{
          borderRight: "1px solid rgba(57, 41, 42, 0.12)",
          background: "#fbf8f3",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(57, 41, 42, 0.1)",
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: "20px",
            color: "#39292a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{t.messages}</span>
          <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.5)" }}>
            {conversations.length}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            <div style={{ padding: "30px", textAlign: "center" }}>
              <ThemeLoader size="small" />
            </div>
          ) : conversations.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "rgba(57, 41, 42, 0.6)",
                fontSize: "13.5px",
                lineHeight: 1.55,
              }}
            >
              {t.noConversations}
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = c.id === activeConvId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveConvId(c.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 18px",
                    borderBottom: "1px solid rgba(57, 41, 42, 0.08)",
                    backgroundColor: isSelected ? "#f5ede3" : "transparent",
                    cursor: "pointer",
                    border: "none",
                    outline: "none",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: isSelected ? "#7b1f2c" : "rgba(123, 31, 44, 0.12)",
                      color: isSelected ? "#ffffff" : "#7b1f2c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "15px",
                      flexShrink: 0,
                    }}
                  >
                    {c.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "14.5px",
                          color: "#39292a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.otherPersonName}
                      </strong>
                      {c.unreadCount > 0 && (
                        <span
                          style={{
                            background: "#7b1f2c",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 700,
                            borderRadius: "10px",
                            padding: "2px 7px",
                            lineHeight: 1,
                          }}
                        >
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "rgba(57, 41, 42, 0.65)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.lastMessageText || "New conversation"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Right Pane: Message Thread & Composer ─── */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {activeConvId && activeOtherPerson ? (
          <>
            {/* Header */}
            <div
              style={{
                padding: "14px 24px",
                borderBottom: "1px solid rgba(57, 41, 42, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#ffffff",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "20px",
                      margin: 0,
                      color: "#39292a",
                    }}
                  >
                    {activeOtherPerson.firstName}
                  </h3>
                  {activeOtherPerson.badges?.map((b: string) => (
                    <span
                      key={b}
                      style={{
                        fontSize: "10.5px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "8px",
                        border: "1px solid rgba(123, 31, 44, 0.3)",
                        color: "#7b1f2c",
                        fontWeight: 600,
                      }}
                    >
                      {b.replace("_", " ")}
                    </span>
                  ))}
                </div>
                {(activeOtherPerson.neighbourhood || activeOtherPerson.stage) && (
                  <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.6)", marginTop: "2px" }}>
                    {[activeOtherPerson.stage, activeOtherPerson.neighbourhood].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>

              {/* Action Buttons: Report & Block */}
              {!activeOtherPerson.isDeleted && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.2)",
                      background: "transparent",
                      color: "rgba(57, 41, 42, 0.75)",
                      fontSize: "12.5px",
                      padding: "5px 11px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {t.report}
                  </button>
                  <button
                    type="button"
                    onClick={handleBlock}
                    style={{
                      border: "1px solid rgba(153, 56, 66, 0.4)",
                      background: "transparent",
                      color: "#993842",
                      fontSize: "12.5px",
                      padding: "5px 11px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {t.block}
                  </button>
                </div>
              )}
            </div>

            {/* Notification / Error Banner */}
            {actionNotice && (
              <div
                style={{
                  background: "#fdf2f2",
                  color: "#993842",
                  padding: "10px 20px",
                  fontSize: "13px",
                  borderBottom: "1px solid rgba(153, 56, 66, 0.2)",
                }}
              >
                {actionNotice}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                background: "#fdfbf8",
              }}
            >
              {loadingMessages ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <ThemeLoader size="small" />
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    color: "rgba(57, 41, 42, 0.5)",
                    fontSize: "13.5px",
                  }}
                >
                  Start your conversation with {activeOtherPerson.firstName} ✨
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.isFromMe ? "flex-end" : "flex-start",
                      maxWidth: "75%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: m.isFromMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 15px",
                        borderRadius: m.isFromMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        backgroundColor: m.isFromMe ? "#7b1f2c" : "#ffffff",
                        color: m.isFromMe ? "#ffffff" : "#39292a",
                        border: m.isFromMe ? "none" : "1px solid rgba(57, 41, 42, 0.12)",
                        fontSize: "14px",
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {m.content}
                    </div>
                    <span
                      style={{
                        fontSize: "10.5px",
                        color: "rgba(57, 41, 42, 0.45)",
                        marginTop: "4px",
                        padding: "0 4px",
                      }}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid rgba(57, 41, 42, 0.12)",
                backgroundColor: "#ffffff",
              }}
            >
              {isSuspended ? (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fbf3e4",
                    color: "#8a6116",
                    fontSize: "13px",
                    borderRadius: "4px",
                    textAlign: "center",
                  }}
                >
                  {t.suspendedNotice}
                </div>
              ) : (
                <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t.placeholder}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid rgba(57, 41, 42, 0.2)",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14px",
                      color: "#39292a",
                      resize: "none",
                      outline: "none",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "11.5px", color: "rgba(57, 41, 42, 0.5)" }}>
                      {inputText.length} / 2,000
                    </span>
                    <button
                      type="submit"
                      disabled={sending || !inputText.trim()}
                      style={{
                        border: "none",
                        backgroundColor: "#7b1f2c",
                        color: "#ffffff",
                        padding: "8px 20px",
                        borderRadius: "4px",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: sending || !inputText.trim() ? "not-allowed" : "pointer",
                        opacity: sending || !inputText.trim() ? 0.6 : 1,
                      }}
                    >
                      {sending ? "..." : t.send}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              color: "rgba(57, 41, 42, 0.5)",
              fontSize: "14px",
              padding: "40px",
            }}
          >
            Select a conversation on the left to read and send messages.
          </div>
        )}
      </div>

      {/* ─── Report Modal ─── */}
      {showReportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(57, 41, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              maxWidth: "440px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "22px",
                margin: "0 0 8px",
                color: "#7b1f2c",
              }}
            >
              Report Conversation
            </h3>
            <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.75)", margin: "0 0 16px" }}>
              Our team reviews reported conversations to keep our community safe. Please state the reason:
            </p>

            {reportSubmitted ? (
              <div style={{ color: "#456f04", fontWeight: 600, padding: "12px 0" }}>
                ✓ Thank you. This report has been sent to our moderation desk.
              </div>
            ) : (
              <form onSubmit={handleReport} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <textarea
                  rows={4}
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Explain what is inappropriate..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(57,41,42,0.25)",
                    borderRadius: "4px",
                    padding: "10px 12px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    style={{
                      border: "1px solid rgba(57,41,42,0.2)",
                      background: "transparent",
                      padding: "8px 14px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      border: "none",
                      background: "#993842",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
