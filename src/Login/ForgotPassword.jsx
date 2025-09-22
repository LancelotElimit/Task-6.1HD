import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

export default function ForgotPassword() {
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");

    const onSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        if (!email) {
            setMsg("Please enter your email.");
            return;
        }
        setBusy(true);
        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/login`,
                handleCodeInApp: false,
            };
            await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
            setMsg("If this email is registered, a reset link has been sent.");
        } catch (err) {
            setMsg("If this email is registered, a reset link has been sent.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fp-wrap">
            <div className="fp-header">
                <button
                    onClick={() => (window.history.length > 1 ? nav(-1) : nav("/login"))}
                    className="back-btn"
                    aria-label="Go back"
                >
                    ← Back
                </button>
                <h2 className="fp-title">Forgot password</h2>
            </div>

            <p className="fp-lead">Enter your email and we’ll send you a password reset link.</p>

            <form onSubmit={onSubmit} className="fp-form">
                <label className="fp-label">
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="ak-input"
                    />
                </label>

                <button type="submit" disabled={busy} className="btn-ak btn-ak--primary">
                    {busy ? "Sending..." : "Send reset link"}
                </button>
            </form>

            {msg && <p className="fp-msg">{msg}</p>}
        </div>
    );
}
