"use client";

import React, { useState } from "react";
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";
import { saveMemberPassword } from "@/app/actions/activate";

const STRINGS = {
  en: {
    accountKicker: 'Your member account',
    accountNote: 'This creates your login. Nothing opens until the payment clears — no account gets you in on its own.',
    emailLabel: 'Email', passwordLabel: 'Password', confirmLabel: 'Confirm password',
    passwordPlaceholder: 'At least 8 characters',
    cardKicker: 'Payment',
    cardNameLabel: 'Name on card', cardNamePlaceholder: 'As printed on the card',
    cardNumberLabel: 'Card number', expiryLabelShort: 'Expiry',
    billingKicker: 'Billing details',
    billingNote: 'Your bank checks these against the card. They also appear on your receipts.',
    billingNameLabel: 'Billing name', billingNamePlaceholder: 'Name the card is registered to',
    billingAddressLabel: 'Address', billingAddressPlaceholder: 'Street and number, floor, door',
    billingPostcodeLabel: 'Postcode', billingCityLabel: 'City',
    billingCountryLabel: 'Country', billingCountryPlaceholder: 'Spain',
    errBilling: 'Please complete the billing name, address, postcode, city and country.',
    payLabel: (total: number) => `Pay €${total} & join`,
    payProcessing: 'Processing…',
    payFinePrint: 'Cancel anytime — there is never a cancellation fee. Pause for up to two months a year at no cost.',
    declinedTitle: 'Your card was declined — nothing was charged.',
    declinedBody: 'Your place is still held. Try another card, or write to hello@themothers.cc and we will sort it out.',
    errPassword: 'Please choose a password of at least 8 characters.',
    errConfirm: 'Both passwords need to match.',
    errCard: 'Please check the card number, expiry date and CVC.',
  }
};

export function PaymentForm({ details, token, clientSecret }: { details: any; token: string; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const t = STRINGS.en;

  const total = (details.monthlyPriceCents + details.joiningFeeCents) / 100;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cardName, setCardName] = useState("");
  const [billingName, setBillingName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingPostcode, setBillingPostcode] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingCountry, setBillingCountry] = useState("");

  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [declined, setDeclined] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", minHeight: "48px", padding: "12px 15px",
    fontSize: "15px", fontFamily: "'Lora', Georgia, serif", border: "1px solid rgba(57,41,42,0.25)",
    borderRadius: "5px", background: "#f8efe2", color: "#39292a"
  };

  const elementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#39292a',
        fontFamily: "'Lora', Georgia, serif",
        '::placeholder': { color: 'rgba(57,41,42,0.45)' }
      },
      invalid: { color: '#993842' }
    }
  };

  const handleSubmit = async () => {
    setErrorMsg("");
    setDeclined(false);
    
    if (password.length < 8) return setErrorMsg(t.errPassword);
    if (password !== confirmPassword) return setErrorMsg(t.errConfirm);
    if (!billingName || !billingAddress || !billingPostcode || !billingCity || !billingCountry) {
      return setErrorMsg(t.errBilling);
    }

    if (!stripe || !elements) return;

    setProcessing(true);

    const saveRes = await saveMemberPassword(token, password);
    if (!saveRes.success) {
      setErrorMsg(saveRes.error || "Failed to save password.");
      setProcessing(false);
      return;
    }

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) return;

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: billingName,
          address: {
            line1: billingAddress,
            city: billingCity,
            postal_code: billingPostcode,
            country: 'ES' // hardcoded or mapped from billingCountry ideally
          }
        }
      }
    });

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        if (error.code === 'card_declined') {
          setDeclined(true);
        } else {
          setErrorMsg(error.message || t.errCard);
        }
      } else {
        setErrorMsg("An unexpected error occurred.");
      }
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      window.location.href = "/account?membership_success=true";
    }
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 20px 80px" }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "40px", marginBottom: "14px", color: "#7b1f2c" }}>
        Complete your membership
      </h1>

      {/* Account Section */}
      <div style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", background: "#fff", padding: "26px", marginBottom: "20px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.accountKicker}</div>
        <p style={{ fontSize: "13.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.62)", margin: "0 0 18px" }}>{t.accountNote}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.emailLabel}</span>
            <input type="email" value={details.person?.email || ""} disabled style={{ ...inputStyle, background: "rgba(57,41,42,0.05)" }} />
          </label>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <label style={{ display: "block", flex: "1 1 180px" }}>
              <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.passwordLabel}</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} style={inputStyle} />
            </label>
            <label style={{ display: "block", flex: "1 1 180px" }}>
              <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.confirmLabel}</span>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t.passwordPlaceholder} style={inputStyle} />
            </label>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", background: "#fff", padding: "26px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "18px" }}>{t.cardKicker}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.cardNameLabel}</span>
            <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder={t.cardNamePlaceholder} style={inputStyle} />
          </label>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.cardNumberLabel}</span>
            <div style={{ ...inputStyle, padding: "14px 15px", display: "flex", flexDirection: "column", justifyContent: "center" }}><CardNumberElement options={elementOptions} /></div>
          </label>
          <div style={{ display: "flex", gap: "12px" }}>
            <label style={{ display: "block", flex: 1 }}>
              <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.expiryLabelShort}</span>
              <div style={{ ...inputStyle, padding: "14px 15px", display: "flex", flexDirection: "column", justifyContent: "center" }}><CardExpiryElement options={elementOptions} /></div>
            </label>
            <label style={{ display: "block", flex: 1 }}>
              <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>CVC</span>
              <div style={{ ...inputStyle, padding: "14px 15px", display: "flex", flexDirection: "column", justifyContent: "center" }}><CardCvcElement options={elementOptions} /></div>
            </label>
          </div>
        </div>

        <div style={{ marginTop: "24px", paddingTop: "22px", borderTop: "1px solid rgba(57,41,42,0.14)" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.billingKicker}</div>
          <p style={{ fontSize: "13.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.62)", margin: "0 0 14px" }}>{t.billingNote}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.billingNameLabel}</span>
              <input type="text" value={billingName} onChange={e => setBillingName(e.target.value)} placeholder={t.billingNamePlaceholder} style={inputStyle} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.billingAddressLabel}</span>
              <input type="text" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder={t.billingAddressPlaceholder} style={inputStyle} />
            </label>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ display: "block", flex: "1 1 120px" }}>
                <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.billingPostcodeLabel}</span>
                <input type="text" value={billingPostcode} onChange={e => setBillingPostcode(e.target.value)} placeholder="08001" style={inputStyle} />
              </label>
              <label style={{ display: "block", flex: "1 1 160px" }}>
                <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.billingCityLabel}</span>
                <input type="text" value={billingCity} onChange={e => setBillingCity(e.target.value)} placeholder="Barcelona" style={inputStyle} />
              </label>
              <label style={{ display: "block", flex: "1 1 160px" }}>
                <span style={{ display: "block", fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "6px" }}>{t.billingCountryLabel}</span>
                <input type="text" value={billingCountry} onChange={e => setBillingCountry(e.target.value)} placeholder={t.billingCountryPlaceholder} style={inputStyle} />
              </label>
            </div>
          </div>
        </div>

        {errorMsg && <p style={{ fontSize: "13px", color: "#993842", margin: "12px 0 0" }}>{errorMsg}</p>}
        {declined && (
          <div style={{ display: "flex", gap: "11px", border: "1px solid rgba(153,56,66,0.45)", borderRadius: "6px", background: "rgba(153,56,66,0.06)", padding: "14px 16px", marginTop: "16px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#993842" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="19" height="19" style={{ flex: "0 0 auto", marginTop: "1px" }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#993842" }}>{t.declinedTitle}</div>
              <p style={{ fontSize: "13.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", margin: "4px 0 0" }}>{t.declinedBody}</p>
            </div>
          </div>
        )}

        <button 
          type="button" 
          onClick={handleSubmit} 
          disabled={processing || !stripe} 
          style={{ width: "100%", marginTop: "22px", border: "1px solid #7b1f2c", background: processing ? "rgba(123,31,44,0.5)" : "#7b1f2c", color: "#f8efe2", minHeight: "54px", borderRadius: "6px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", cursor: processing ? "not-allowed" : "pointer" }}
        >
          {processing ? t.payProcessing : t.payLabel(total)}
        </button>
        <p style={{ fontSize: "12.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.58)", margin: "14px 0 0", textAlign: "center" }}>{t.payFinePrint}</p>
      </div>
    </div>
  );
}
