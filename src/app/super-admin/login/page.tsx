"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await signIn("admin-credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setErrorMsg("Invalid email or password.");
    } else {
      router.push("/super-admin/dashboard");
      router.refresh();
    }
  };

  return (
    <div style={{
      backgroundColor: "#111",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px"
    }}>
      <div style={{
        maxWidth: "400px",
        width: "100%",
        backgroundColor: "#222",
        padding: "40px 32px",
        borderRadius: "8px",
        color: "#fff",
        fontFamily: "sans-serif"
      }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", margin: "0 0 8px 0" }}>System Monitor</h1>
          <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>
            Super Admin Authentication
          </p>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: "#441111",
            color: "#ff8888",
            padding: "10px 14px",
            borderRadius: "4px",
            fontSize: "13.5px",
            marginBottom: "20px"
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#333",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#fff",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#333",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#fff",
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: "100%", 
              padding: "12px", 
              marginTop: "8px", 
              fontSize: "15px",
              backgroundColor: "#fff",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
