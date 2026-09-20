"use client";

import React, { useState, useEffect, useRef } from "react";
import { COUNTRY_CODES, CountryCodeItem, parsePhoneNumber } from "@/lib/countryCodes";

export interface CountryPhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  lang?: "en" | "es";
  style?: React.CSSProperties;
}

export default function CountryPhoneInput({
  value,
  onChange,
  placeholder = "612 345 678",
  disabled = false,
  required = false,
  id,
  name,
  lang = "en",
  style,
}: CountryPhoneInputProps) {
  const { country: initialCountry, nationalNumber: initialNational } = parsePhoneNumber(value);
  const [selectedCountry, setSelectedCountry] = useState<CountryCodeItem>(initialCountry);
  const [nationalNumber, setNationalNumber] = useState<string>(initialNational);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state if external value changes significantly
  useEffect(() => {
    const parsed = parsePhoneNumber(value);
    if (parsed.country.code !== selectedCountry.code || parsed.nationalNumber !== nationalNumber) {
      setSelectedCountry(parsed.country);
      setNationalNumber(parsed.nationalNumber);
    }
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCountrySelect = (country: CountryCodeItem) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery("");
    const combined = nationalNumber ? `${country.dialCode} ${nationalNumber.trim()}` : country.dialCode;
    onChange(combined);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanDigits = e.target.value.replace(/[^\d\s-]/g, "");
    setNationalNumber(cleanDigits);
    const combined = cleanDigits ? `${selectedCountry.dialCode} ${cleanDigits.trim()}` : "";
    onChange(combined);
  };

  // Filter country list by search query (name, code, or dialCode)
  const filteredCountries = COUNTRY_CODES.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.replace("+", "").includes(q.replace("+", ""))
    );
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "stretch",
        gap: "8px",
        ...style,
      }}
      ref={dropdownRef}
    >
      {/* Country Prefix Selector Trigger */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "6px",
            minHeight: "46px",
            height: "100%",
            padding: "8px 12px",
            backgroundColor: disabled ? "rgba(57,41,42,0.05)" : "#fff",
            border: "1px solid rgba(57,41,42,0.25)",
            borderRadius: "5px",
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "14.5px",
            color: "#39292a",
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease",
            outline: "none",
          }}
          onFocus={(e) => {
            if (!disabled) e.currentTarget.style.borderColor = "#7b1f2c";
          }}
          onBlur={(e) => {
            if (!disabled) e.currentTarget.style.borderColor = "rgba(57,41,42,0.25)";
          }}
        >
          <span style={{ fontSize: "17px", lineHeight: 1 }}>{selectedCountry.flag}</span>
          <span style={{ fontWeight: 500, color: "#39292a" }}>{selectedCountry.dialCode}</span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: "rgba(57,41,42,0.5)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <path d="m1 1 4 4 4-4" />
          </svg>
        </button>

        {/* Searchable Country Dropdown Modal/Popout */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 9999,
              width: "280px",
              maxHeight: "320px",
              backgroundColor: "#fffdfa",
              border: "1px solid rgba(57,41,42,0.18)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(57,41,42,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Search Input Bar */}
            <div style={{ padding: "8px", borderBottom: "1px solid rgba(57,41,42,0.1)", backgroundColor: "#fff" }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "en" ? "Search country or prefix…" : "Buscar país o prefijo…"}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "7px 10px",
                  fontSize: "13.5px",
                  fontFamily: "'Lora', Georgia, serif",
                  border: "1px solid rgba(57,41,42,0.2)",
                  borderRadius: "4px",
                  outline: "none",
                  color: "#39292a",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#7b1f2c";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(57,41,42,0.2)";
                }}
              />
            </div>

            {/* Country List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "4px 0",
              }}
            >
              {filteredCountries.length === 0 ? (
                <div
                  style={{
                    padding: "12px 16px",
                    fontSize: "13px",
                    color: "rgba(57,41,42,0.5)",
                    textAlign: "center",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                >
                  {lang === "en" ? "No country found" : "No se encontró ningún país"}
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code && c.dialCode === selectedCountry.dialCode;
                  return (
                    <button
                      key={`${c.code}-${c.dialCode}`}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 14px",
                        border: "none",
                        backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "'Lora', Georgia, serif",
                        fontSize: "13.5px",
                        color: isSelected ? "#7b1f2c" : "#39292a",
                        transition: "background-color 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(57,41,42,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: "16px" }}>{c.flag}</span>
                        <span style={{ fontWeight: isSelected ? 600 : 400 }}>{c.name}</span>
                      </span>
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 500,
                          color: isSelected ? "#7b1f2c" : "rgba(57,41,42,0.55)",
                          marginLeft: "8px",
                          flexShrink: 0,
                        }}
                      >
                        {c.dialCode}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* National Phone Input */}
      <input
        id={id}
        name={name}
        type="tel"
        value={nationalNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        style={{
          flex: 1,
          boxSizing: "border-box",
          minHeight: "46px",
          padding: "11px 14px",
          fontSize: "15px",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
          background: disabled ? "rgba(57,41,42,0.05)" : "#fff",
          border: "1px solid rgba(57,41,42,0.25)",
          borderRadius: "5px",
          outline: "none",
          transition: "border-color 0.15s ease",
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => {
          if (!disabled) e.currentTarget.style.borderColor = "#7b1f2c";
        }}
        onBlur={(e) => {
          if (!disabled) e.currentTarget.style.borderColor = "rgba(57,41,42,0.25)";
        }}
      />
    </div>
  );
}
