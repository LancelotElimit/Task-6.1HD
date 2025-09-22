import React, { useEffect, useRef, useState } from "react";
import {
    onAuthStateChanged,
    RecaptchaVerifier,
    PhoneAuthProvider,
    multiFactor,
    PhoneMultiFactorGenerator,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import "./ProfileSecurity.css";

function createInvisibleRecaptcha(authInstance, containerId) {
    try {
        return new RecaptchaVerifier(authInstance, containerId, { size: "invisible" });
    } catch {
        return new RecaptchaVerifier(containerId, { size: "invisible" }, authInstance);
    }
}

export default function ProfileSecurity() {
    const nav = useNavigate();
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    const enrolled = user?.multiFactor?.enrolledFactors || [];

    const [phone, setPhone] = useState("");
    const [smsSent, setSmsSent] = useState(false);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");

    const captchaId = "mfa-enroll-captcha";
    const captchaRef = useRef(null);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            if (!u) {
                nav("/login", { replace: true, state: { from: "/profile/security" } });
            } else {
                setUser(u);
            }
            setReady(true);
        });
    }, [nav]);

    const ensureCaptcha = () => {
        if (captchaRef.current) {
            try { captchaRef.current.clear(); } catch {}
            captchaRef.current = null;
        }
        captchaRef.current = createInvisibleRecaptcha(auth, captchaId);
        return captchaRef.current;
    };

    const handleSendCode = async () => {
        if (!user || !phone) return;
        setBusy(true); setMsg("");
        try {
            const verifier = ensureCaptcha();
            const provider = new PhoneAuthProvider(auth);
            const verificationId = await provider.verifyPhoneNumber(phone.trim(), verifier);
            window._mfaEnrollVerificationId = verificationId;
            setSmsSent(true);
            setMsg("SMS code sent.");
        } catch (e) {
            setMsg(`Firebase: ${e.message || String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    const handleEnroll = async () => {
        if (!user || !code || !window._mfaEnrollVerificationId) return;
        setBusy(true); setMsg("");
        try {
            const cred = PhoneAuthProvider.credential(window._mfaEnrollVerificationId, code.trim());
            const assertion = PhoneMultiFactorGenerator.assertion(cred);
            await multiFactor(user).enroll(assertion, "SMS 2FA");
            setMsg("2FA enabled.");
            setSmsSent(false); setCode(""); setPhone("");
            await user.reload(); setUser(auth.currentUser);
        } catch (e) {
            if (e.code === "auth/requires-recent-login") setMsg("This action requires recent login. Please sign in again.");
            else setMsg(`Firebase: ${e.message || String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    const handleUnenroll = async (factorUid) => {
        if (!user) return;
        setBusy(true); setMsg("");
        try {
            await multiFactor(user).unenroll(factorUid);
            setMsg("2FA disabled.");
            await user.reload(); setUser(auth.currentUser);
        } catch (e) {
            if (e.code === "auth/requires-recent-login") setMsg("This action requires recent login. Please sign in again.");
            else setMsg(`Firebase: ${e.message || String(e)}`);
        } finally { setBusy(false); }
    };

    if (!ready) return <div className="ak-wrap"><div className="lead">Loading…</div></div>;

    return (
        <div className="ak-wrap">
            <div className="ak-header">
                <button
                    onClick={() => { if (window.history.length > 1) nav(-1); else nav("/home"); }}
                    aria-label="Go back"
                    className="back-btn"
                >
                    ← Back
                </button>
                <h1 className="ak-title">Security</h1>
            </div>

            <p className="lead">Enable or disable Two-Factor Authentication (SMS).</p>

            <section className="sec">
                <h3>Enrolled factors</h3>
                <div className="enrolled">
                    {enrolled.length === 0 ? (
                        <p className="lead">No factors enabled.</p>
                    ) : (
                        <ul>
                            {enrolled.map((f) => (
                                <li key={f.uid}>
                                    <span>{f.displayName || f.factorId} ({f.uid.slice(0,6)}…)</span>
                                    <button disabled={busy} onClick={() => handleUnenroll(f.uid)} className="btn-ak">
                                        Unenroll
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            <section className="sec">
                <h3>Enable SMS 2FA</h3>
                <div className="row" style={{ marginBottom: 8 }}>
                    <input
                        placeholder="+61 4xx xxx xxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="ak-input"
                    />
                </div>

                {!smsSent ? (
                    <div className="controls">
                        <button onClick={handleSendCode} disabled={busy || !phone} className="btn-ak btn-ak--primary">
                            {busy ? "Sending…" : "Send code"}
                        </button>
                    </div>
                ) : (
                    <div className="row" style={{ marginTop: 8 }}>
                        <input
                            placeholder="Enter 6-digit code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="ak-input"
                        />
                        <div className="controls">
                            <button onClick={handleEnroll} disabled={busy || !code} className="btn-ak btn-ak--primary">
                                {busy ? "Verifying…" : "Verify & enable"}
                            </button>
                        </div>
                    </div>
                )}

                <div id={captchaId} />
            </section>

            {msg && <p className="msg">{msg}</p>}
        </div>
    );
}
