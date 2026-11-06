"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  RemoveFormatting,
  Code,
  Pilcrow,
  Heading2,
  Heading3,
} from "lucide-react";

/**
 * Normalizes legacy plain-text (newlines, bullets) into clean HTML paragraphs & line breaks.
 */
export function sanitizeAndFormatHtml(input: string | null | undefined): string {
  if (!input) return "";
  const raw = input.trim();

  // If already contains structural HTML tags, sanitize and return
  const hasHtml = /<(p|br|div|ul|ol|li|h[1-6]|blockquote|strong|b|em|i|u|s|a)\b[^>]*>/i.test(raw);
  if (!hasHtml) {
    // Legacy plain text: split into paragraphs by double newlines, line breaks by single newline
    const paragraphs = raw.split(/\r?\n\s*\r?\n/);
    return paragraphs
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        // Check if all lines start with a bullet character (- or •)
        const lines = trimmed.split(/\r?\n/);
        const isBulletList = lines.length > 1 && lines.every((l) => /^[-•*]\s+/.test(l.trim()));
        if (isBulletList) {
          const items = lines.map((l) => `<li>${l.replace(/^[-•*]\s+/, "")}</li>`).join("");
          return `<ul>${items}</ul>`;
        }
        return `<p>${lines.join("<br />")}</p>`;
      })
      .filter(Boolean)
      .join("");
  }

  // Strip dangerous elements/attributes
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/on\w+\s*=\s*(["'])[\s\S]*?\1/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write description here...",
  minHeight = "160px",
  label,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false,
    blockquote: false,
  });
  const [currentBlock, setCurrentBlock] = useState("p");
  const [isFocused, setIsFocused] = useState(false);

  // Normalize initial value for display in contenteditable
  const formatInitialHtml = useCallback((val: string) => {
    if (!val) return "";
    return sanitizeAndFormatHtml(val);
  }, []);

  // Sync value from props to editor DOM only if different
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const formatted = formatInitialHtml(value);
    
    // Only update if fundamentally different (prevents cursor jump while typing)
    if (value === "" && currentHtml !== "") {
      editorRef.current.innerHTML = "";
    } else if (formatted !== currentHtml && (currentHtml === "" || !currentHtml.replace(/<[^>]*>/g, "").trim())) {
      editorRef.current.innerHTML = formatted;
    }
  }, [value, formatInitialHtml]);

  // Update active states based on current selection
  const updateActiveStates = useCallback(() => {
    if (typeof document === "undefined" || isHtmlMode) return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
        ul: document.queryCommandState("insertUnorderedList"),
        ol: document.queryCommandState("insertOrderedList"),
        blockquote: false,
      });

      const block = document.queryCommandValue("formatBlock") || "p";
      const cleaned = block.toLowerCase().replace(/<|>/g, "");
      setCurrentBlock(cleaned === "h2" || cleaned === "h3" || cleaned === "blockquote" ? cleaned : "p");
    } catch {
      // Ignore if document not focused
    }
  }, [isHtmlMode]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    // If only an empty paragraph remains, clear it out
    const clean = html === "<p><br></p>" || html === "<br>" ? "" : html;
    onChange(clean);
    updateActiveStates();
  };

  const exec = (cmd: string, arg?: string) => {
    if (typeof document === "undefined" || !editorRef.current) return;
    editorRef.current.focus();
    try {
      document.execCommand(cmd, false, arg);
    } catch (e) {
      console.warn("execCommand error", e);
    }
    handleInput();
  };

  const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCurrentBlock(val);
    exec("formatBlock", val);
  };

  const handleLink = () => {
    if (typeof window === "undefined" || !editorRef.current) return;
    const sel = window.getSelection();
    const selText = sel ? sel.toString().trim() : "";
    const url = window.prompt("Enter link URL (e.g. https://instagram.com/partner):", "https://");
    if (url && url !== "https://" && url.trim()) {
      editorRef.current.focus();
      if (selText) {
        exec("createLink", url.trim());
      } else {
        exec("insertHTML", `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer">${url.trim()}</a>`);
      }
    }
  };

  const toolbarBtnStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "28px",
    borderRadius: "4px",
    border: active ? "1px solid #7b1f2c" : "1px solid transparent",
    backgroundColor: active ? "rgba(123, 31, 44, 0.12)" : "transparent",
    color: active ? "#7b1f2c" : "#39292a",
    cursor: "pointer",
    fontSize: "13px",
    transition: "background 0.15s, border-color 0.15s",
    padding: 0,
    outline: "none",
  });

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        border: isFocused ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.25)",
        boxShadow: isFocused ? "0 0 0 2px rgba(123, 31, 44, 0.15)" : "none",
        borderRadius: "5px",
        backgroundColor: "#fff",
        overflow: "hidden",
        transition: "border-color 0.18s, box-shadow 0.18s",
      }}
    >
      {/* ─── Toolbar ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "4px",
          padding: "7px 10px",
          backgroundColor: "#fbf9f6",
          borderBottom: "1px solid rgba(57,41,42,0.12)",
          userSelect: "none",
        }}
      >
        {/* Style Dropdown (Paragraph, Heading 2, Heading 3, Quote) */}
        <select
          value={currentBlock}
          onChange={handleBlockChange}
          disabled={isHtmlMode}
          title="Text Style"
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "12.5px",
            color: "#39292a",
            padding: "4px 8px",
            borderRadius: "4px",
            border: "1px solid rgba(57,41,42,0.2)",
            backgroundColor: "#fff",
            cursor: "pointer",
            marginRight: "4px",
            outline: "none",
          }}
        >
          <option value="p">Normal text</option>
          <option value="h2">Heading (Large)</option>
          <option value="h3">Subheading</option>
          <option value="blockquote">Quote block</option>
        </select>

        <span style={{ width: "1px", height: "18px", backgroundColor: "rgba(57,41,42,0.16)", margin: "0 2px" }} />

        {/* Bold */}
        <button
          type="button"
          title="Bold (Ctrl+B)"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(activeFormats.bold)}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("bold");
          }}
        >
          <Bold size={15} strokeWidth={2.4} />
        </button>

        {/* Italic */}
        <button
          type="button"
          title="Italic (Ctrl+I)"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(activeFormats.italic)}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("italic");
          }}
        >
          <Italic size={15} strokeWidth={2.4} />
        </button>

        {/* Underline */}
        <button
          type="button"
          title="Underline (Ctrl+U)"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(activeFormats.underline)}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("underline");
          }}
        >
          <Underline size={15} strokeWidth={2.4} />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          title="Strikethrough"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(activeFormats.strike)}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("strikeThrough");
          }}
        >
          <Strikethrough size={15} strokeWidth={2.4} />
        </button>

        <span style={{ width: "1px", height: "18px", backgroundColor: "rgba(57,41,42,0.16)", margin: "0 2px" }} />

        {/* Bullet List */}
        <button
          type="button"
          title="Bulleted List"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(activeFormats.ul)}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
          }}
        >
          <List size={16} strokeWidth={2.2} />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          title="Numbered List"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(activeFormats.ol)}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertOrderedList");
          }}
        >
          <ListOrdered size={16} strokeWidth={2.2} />
        </button>

        {/* Quote */}
        <button
          type="button"
          title="Blockquote"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(currentBlock === "blockquote")}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("formatBlock", currentBlock === "blockquote" ? "p" : "blockquote");
          }}
        >
          <Quote size={15} strokeWidth={2.2} />
        </button>

        <span style={{ width: "1px", height: "18px", backgroundColor: "rgba(57,41,42,0.16)", margin: "0 2px" }} />

        {/* Insert Link */}
        <button
          type="button"
          title="Insert Link"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(false)}
          onMouseDown={(e) => {
            e.preventDefault();
            handleLink();
          }}
        >
          <Link2 size={16} strokeWidth={2.2} />
        </button>

        {/* Clear Formatting */}
        <button
          type="button"
          title="Clear formatting"
          disabled={isHtmlMode}
          style={toolbarBtnStyle(false)}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("removeFormat");
            exec("formatBlock", "p");
          }}
        >
          <RemoveFormatting size={15} strokeWidth={2.2} />
        </button>

        {/* Toggle HTML view */}
        <button
          type="button"
          title={isHtmlMode ? "Switch to Visual Editor" : "View / Edit HTML Source"}
          style={{
            ...toolbarBtnStyle(isHtmlMode),
            marginLeft: "auto",
            fontSize: "11px",
            fontFamily: "monospace",
            gap: "3px",
            width: "auto",
            padding: "0 7px",
          }}
          onClick={() => {
            if (isHtmlMode && editorRef.current) {
              editorRef.current.innerHTML = value;
            }
            setIsHtmlMode(!isHtmlMode);
          }}
        >
          <Code size={14} strokeWidth={2.2} />
          <span>{isHtmlMode ? "Visual" : "HTML"}</span>
        </button>
      </div>

      {/* ─── Content Area ─── */}
      {isHtmlMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            minHeight,
            boxSizing: "border-box",
            border: "none",
            outline: "none",
            padding: "14px 16px",
            fontFamily: "monospace",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#222",
            backgroundColor: "#fafafa",
            resize: "vertical",
          }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            handleInput();
          }}
          data-placeholder={placeholder}
          className="rich-editor-content"
          style={{
            minHeight,
            padding: "14px 16px",
            boxSizing: "border-box",
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "14.5px",
            lineHeight: 1.7,
            color: "#39292a",
            outline: "none",
            cursor: "text",
          }}
        />
      )}

      {/* Inline styles for editor typography and placeholder */}
      <style dangerouslySetInnerHTML={{ __html: `
        .rich-editor-content p {
          margin: 0 0 12px;
          line-height: 1.7;
        }
        .rich-editor-content p:last-child {
          margin-bottom: 0;
        }
        .rich-editor-content h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-weight: 600;
          color: #39292a;
          margin: 16px 0 8px;
        }
        .rich-editor-content h3 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 17px;
          font-weight: 600;
          color: #39292a;
          margin: 14px 0 6px;
        }
        .rich-editor-content blockquote {
          margin: 12px 0;
          padding: 8px 14px;
          border-left: 3px solid #7b1f2c;
          background: rgba(123, 31, 44, 0.04);
          font-style: italic;
          color: rgba(57, 41, 42, 0.85);
        }
        .rich-editor-content ul {
          margin: 8px 0 12px 22px;
          padding: 0;
          list-style-type: disc;
        }
        .rich-editor-content ol {
          margin: 8px 0 12px 22px;
          padding: 0;
          list-style-type: decimal;
        }
        .rich-editor-content li {
          margin-bottom: 4px;
        }
        .rich-editor-content a {
          color: #7b1f2c;
          text-decoration: underline;
        }
        .rich-editor-content:empty:before {
          content: attr(data-placeholder);
          color: rgba(57, 41, 42, 0.38);
          pointer-events: none;
          display: block;
        }
      `}} />
    </div>
  );
}

/**
 * Public component to render formatted rich description safely on the website
 */
export function FormattedDescription({
  content,
  className = "",
  style = {},
}: {
  content: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!content || !content.trim()) return null;
  const html = sanitizeAndFormatHtml(content);

  return (
    <>
      <div
        className={`event-description-formatted ${className}`}
        style={{
          fontSize: "17px",
          lineHeight: 1.75,
          color: "rgba(57, 41, 42, 0.8)",
          margin: "0 0 26px",
          maxWidth: "62ch",
          fontFamily: "'Lora', Georgia, serif",
          ...style,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .event-description-formatted p {
          margin: 0 0 16px;
          line-height: 1.75;
        }
        .event-description-formatted p:last-child {
          margin-bottom: 0;
        }
        .event-description-formatted strong,
        .event-description-formatted b {
          color: #39292a;
          font-weight: 600;
        }
        .event-description-formatted em,
        .event-description-formatted i {
          font-style: italic;
        }
        .event-description-formatted u {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .event-description-formatted s,
        .event-description-formatted strike {
          text-decoration: line-through;
        }
        .event-description-formatted ul {
          list-style-type: disc;
          margin: 12px 0 18px 24px;
          padding: 0;
        }
        .event-description-formatted ol {
          list-style-type: decimal;
          margin: 12px 0 18px 24px;
          padding: 0;
        }
        .event-description-formatted li {
          margin-bottom: 6px;
          line-height: 1.6;
        }
        .event-description-formatted blockquote {
          margin: 18px 0;
          padding: 10px 18px;
          border-left: 3px solid #7b1f2c;
          background: rgba(123, 31, 44, 0.04);
          border-radius: 0 4px 4px 0;
          font-style: italic;
          color: rgba(57, 41, 42, 0.85);
        }
        .event-description-formatted h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #39292a;
          margin: 24px 0 10px;
          line-height: 1.3;
        }
        .event-description-formatted h3 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 19px;
          font-weight: 600;
          color: #39292a;
          margin: 20px 0 8px;
          line-height: 1.3;
        }
        .event-description-formatted a {
          color: #7b1f2c;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .event-description-formatted a:hover {
          color: #5d1620;
        }
      `}} />
    </>
  );
}

