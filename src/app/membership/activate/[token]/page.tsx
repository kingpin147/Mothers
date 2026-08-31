"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getActivationDetails } from "@/app/actions/activate";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentForm } from "./PaymentForm";

// Make sure to call `loadStripe` outside of a component's render to avoid recreating the `Stripe` object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function ActivateMembershipPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      const res = await getActivationDetails(token);
      
      if (res.success && res.member) {
        setDetails(res);
        // Fetch Payment Intent Client Secret
        try {
          const fetchRes = await fetch("/api/stripe/payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "membership", memberId: res.member.id })
          });
          const data = await fetchRes.json();
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            setErrorMsg(data.error || "Failed to initialize payment.");
          }
        } catch (err) {
          setErrorMsg("Failed to connect to payment provider.");
        }
      } else {
        setErrorMsg(res.error || "Invalid or expired activation link.");
      }
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", color: "#7b1f2c" }}>Loading your membership details...</p>
      </div>
    );
  }

  if (errorMsg && !clientSecret) {
    return (
      <div style={{ backgroundColor: "#f8efe2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", padding: "32px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", color: "#7b1f2c", marginBottom: "16px" }}>Link Expired or Invalid</h2>
          <p style={{ fontSize: "15px", color: "rgba(57,41,42,0.7)", marginBottom: "28px", fontFamily: "'Lora', Georgia, serif" }}>
            {errorMsg === "TOKEN_EXPIRED"
              ? "This 72-hour activation link has expired. The place has returned to the waitlist queue."
              : "This link is no longer valid or has already been activated."}
          </p>
          <Link href="/" style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", padding: "12px 24px", borderRadius: "5px", textDecoration: "none", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f8efe2", minHeight: "100vh" }}>
      {clientSecret && details && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm details={details} token={token} clientSecret={clientSecret} />
        </Elements>
      )}
    </div>
  );
}
