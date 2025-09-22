import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, googleSignIn } from "../lib/firebase";
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css";

export default function SignUp() {
    const navigate = useNavigate();
    const db = getFirestore();
    const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            const { firstName, lastName, email, password } = form;
            if (!firstName || !lastName) throw new Error("Please enter your first and last name.");

            const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

            await updateProfile(cred.user, { displayName: `${firstName} ${lastName}`.trim() });

            await setDoc(doc(db, "users", cred.user.uid), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: cred.user.email,
                createdAt: serverTimestamp(),
            });

            navigate("/login");
        } catch (err) {
            setError(err?.message?.replace("Firebase:", "").trim() || "Sign up failed. Please try again.");
        } finally {
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
                await setDoc(ref, {
                    firstName,
                    lastName,
                    email: u.email,
                    createdAt: serverTimestamp(),
                });
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

    return (
        <div className="signup-wrap">
            <form onSubmit={onSubmit} className="signup-card" aria-busy={submitting}>
                <h2 className="signup-title">Create account</h2>

                <div className="signup-nameRow">
                    <label className="signup-label">
                        First name
                        <input type="text" name="firstName" value={form.firstName} onChange={onChange} required className="signup-input" />
                    </label>
                    <label className="signup-label">
                        Last name
                        <input type="text" name="lastName" value={form.lastName} onChange={onChange} required className="signup-input" />
                    </label>
                </div>

                <label className="signup-label">
                    Email
                    <input type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" autoComplete="email" required className="signup-input" />
                </label>

                <label className="signup-label">
                    Password
                    <input type="password" name="password" value={form.password} onChange={onChange} placeholder="At least 6 characters" autoComplete="new-password" required minLength={6} className="signup-input" />
                </label>

                {error && (
                    <div role="alert" className="signup-error">
                        {error}
                    </div>
                )}

                <button type="submit" disabled={submitting} className="signup-primaryBtn">
                    {submitting ? "Creating..." : "Create account"}
                </button>

                <div className="signup-btnRow">
                    <button type="button" onClick={onGoogle} disabled={submitting} className="signup-googleBtn">
                        Continue with Google
                    </button>
                </div>

                <div className="signup-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </form>
        </div>
    );
}
