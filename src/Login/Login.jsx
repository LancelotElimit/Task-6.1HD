import React, { useEffect, useState } from "react";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    RecaptchaVerifier,
    PhoneAuthProvider,
    getMultiFactorResolver,
    PhoneMultiFactorGenerator,
} from "firebase/auth";
import { auth, googleSignIn } from "../lib/firebase";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function createInvisibleRecaptcha(authInstance, containerId) {
    try {
        return new RecaptchaVerifier(authInstance, containerId, { size: "invisible" });
    } catch {
        return new RecaptchaVerifier(containerId, { size: "invisible" }, authInstance);
    }
}

export default function Login() {
    const navigate = useNavigate();
    const db = getFirestore();

    const [form, setForm] = useState({ email: "", password: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [me, setMe] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => setMe(u));
        return () => unsub();
    }, []);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            const { email, password } = form;
            if (!email || !password) throw new Error("Please enter email and password.");
            await signInWithEmailAndPassword(auth, email.trim(), password);
            navigate("/home");
        } catch (err) {
            if (err?.code === "auth/multi-factor-auth-required") {
                try {
                    const resolver = getMultiFactorResolver(auth, err);
                    const phoneHint = resolver.hints.find((h) => h.factorId === "phone") || resolver.hints[0];
                    const containerId = "mfa-login-captcha";
                    if (!window.__mfaCaptcha) {
                        const el = document.getElementById(containerId);
                        if (el) el.innerHTML = "";
                        window.__mfaCaptcha = createInvisibleRecaptcha(auth, containerId);
                    }
                    const provider = new PhoneAuthProvider(auth);
                    const verificationId = await provider.verifyPhoneNumber(
                        { multiFactorHint: phoneHint, session: resolver.session },
                        window.__mfaCaptcha
                    );
                    const code = window.prompt("Enter the 6-digit code sent to your phone:");
                    if (!code) throw new Error("Verification cancelled.");
                    const cred = PhoneAuthProvider.credential(verificationId, code.trim());
                    const assertion = PhoneMultiFactorGenerator.assertion(cred);
                    await resolver.resolveSignIn(assertion);
                    navigate("/home");
                } catch (mfaErr) {
                    setError(mfaErr?.message?.replace("Firebase:", "").trim() || "2FA verification failed.");
                } finally {
                    setSubmitting(false);
                }
                return;
            }
            setError(err?.message?.replace("Firebase:", "").trim() || "Invalid email or password.");
            setSubmitting(false);
        }
    };

    const onGoogle = async () => {
        setError("");
        setSubmitting(true);
        try {
            const cred = await googleSignIn();
            const u = cred.user;
            const ref = doc(db, "users", u.uid);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                const full = (u.displayName || "").trim();
                const parts = full.split(/\s+/);
                const firstName = parts[0] || "";
                const lastName = parts.slice(1).join(" ") || "";
                await setDoc(ref, { firstName, lastName, email: u.email, createdAt: serverTimestamp() });
            }
            navigate("/home");
        } catch (err) {
            if (err?.code === "auth/operation-not-allowed") {
                setError("Google sign-in is disabled. Enable it in Authentication > Sign-in method.");
            } else if (err?.code !== "auth/popup-closed-by-user") {
                setError(err?.message?.replace("Firebase:", "").trim() || "Google sign-in failed.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignOut = async () => {
        setError("");
        setSubmitting(true);
        try {
            await signOut(auth);
            navigate("/login");
        } catch (e) {
            setError(e?.message?.replace("Firebase:", "").trim() || "Sign out failed.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-wrap">
            {me && (
                <div className="login-signedInBar">
                    Signed in as <strong>{me.email}</strong>
                    <button onClick={handleSignOut} disabled={submitting} className="login-signoutBtn">Sign out</button>
                    <button onClick={() => navigate("/home")} disabled={submitting} className="login-goHomeBtn">Go to Home</button>
                </div>
            )}

            <form onSubmit={onSubmit} className="login-card" aria-busy={submitting}>
                <h2 className="login-title">Login</h2>

                <label className="login-label">
                    Email
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={onChange}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="login-input"
                        disabled={submitting}
                    />
                </label>

                <label className="login-label">
                    Password
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={onChange}
                        placeholder="********"
                        autoComplete="current-password"
                        required
                        className="login-input"
                        disabled={submitting}
                    />
                </label>

                {error && (
                    <div role="alert" aria-live="polite" className="login-error">
                        {error}
                    </div>
                )}

                <button type="submit" disabled={submitting} className="login-primaryBtn">
                    {submitting ? "Signing in..." : "Sign in"}
                </button>

                <div className="login-btnRow">
                    <button type="button" onClick={onGoogle} disabled={submitting} className="login-googleBtn">
                        Continue with Google
                    </button>
                </div>

                <div className="login-footer">
                    <a href="/forgot">Forgot password?</a>
                </div>

                <div className="login-footer">
                    New here? <Link to="/signup">Create an account</Link>
                </div>
            </form>

            <div id="mfa-login-captcha" />
        </div>
    );
}
