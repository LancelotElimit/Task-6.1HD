import React, { useEffect, useState } from "react";
import { onAuthStateChanged, updateProfile, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, storage } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import "./Profile.css";

export default function Profile() {
    const nav = useNavigate();
    const db = getFirestore();

    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    const [displayName, setDisplayName] = useState("");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                setUser(null);
                setReady(true);
                nav("/login", { replace: true, state: { from: "/profile" } });
                return;
            }
            setUser(u);
            setDisplayName(u.displayName || "");

            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                if (snap.exists()) {
                    const p = snap.data();
                    if (!u.displayName && p.firstName) {
                        setDisplayName(p.firstName);
                    }
                }
            } catch (e) {
                console.warn("load profile doc failed:", e);
            } finally {
                setReady(true);
            }
        });
        return () => unsub();
    }, [db, nav]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        setMsg("");
        try {
            await updateProfile(user, { displayName: displayName || null });
            await setDoc(
                doc(db, "users", user.uid),
                { firstName: displayName || null, email: user.email, updatedAt: serverTimestamp() },
                { merge: true }
            );
            setMsg("Profile saved.");
        } catch (err) {
            setMsg("Failed to save: " + (err?.message || String(err)));
        } finally {
            setSaving(false);
        }
    };

    const onPickFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
            setMsg("Please choose a PNG/JPEG/WEBP image.");
            return;
        }
        if (f.size > 3 * 1024 * 1024) {
            setMsg("Image must be ≤ 3MB.");
            return;
        }
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const uploadAvatar = async () => {
        if (!user || !file) return;
        setUploading(true);
        setMsg("");
        try {
            const path = `avatars/${user.uid}/avatar.jpg`;
            const pathRef = ref(storage, path);
            try { await deleteObject(pathRef); } catch {}
            await uploadBytes(pathRef, file);
            const url = await getDownloadURL(pathRef);
            await updateProfile(user, { photoURL: url });
            await setDoc(
                doc(getFirestore(), "users", user.uid),
                { photoURL: url, updatedAt: serverTimestamp(), firstName: displayName || null, email: user.email },
                { merge: true }
            );
            await user.reload();
            setMsg("Avatar updated.");
            setFile(null);
            setPreview("");
        } catch (e) {
            setMsg((e?.message || "Failed to upload avatar").replace("Firebase:", "").trim());
        } finally {
            setUploading(false);
        }
    };

    if (!ready) return <div className="ak-wrap"><div className="lead">Loading…</div></div>;

    return (
        <div className="ak-wrap">
            <div className="ak-header">
                <button
                    onClick={() => (window.history.length > 1 ? nav(-1) : nav("/home"))}
                    aria-label="Go back"
                    title="Back"
                    className="back-btn"
                >
                    ← Back
                </button>
                <h1 className="ak-title">Profile</h1>
            </div>

            <p className="lead">Manage your account information.</p>

            {user && !user.emailVerified && (
                <div className="notice">
                    <b>Email not verified.</b>
                    <button onClick={() => sendEmailVerification(user)} className="linkish">Resend verification email</button>
                </div>
            )}

            {/* Avatar Section */}
            <section className="avatar-card">
                <div className="avatar-box">
                    {(preview || user?.photoURL) ? (
                        <img src={preview || user.photoURL} alt="avatar" className="avatar-img" />
                    ) : (
                        <span>No Avatar</span>
                    )}
                </div>
                <div>
                    <div className="avatar-tools">
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickFile} disabled={uploading} />
                        <button onClick={uploadAvatar} disabled={!file || uploading} className="btn-ak">
                            {uploading ? "Uploading…" : "Upload avatar"}
                        </button>
                    </div>
                    <p className="hint">PNG / JPG / WEBP，≤ 3MB。上传后将同步到你的个人资料。</p>
                </div>
            </section>

            {/* Profile form */}
            <form onSubmit={handleSave} className="form-grid">
                <div>
                    <label className="label">Email (read-only)</label>
                    <input value={user?.email || ""} readOnly className="ak-input" />
                </div>

                <div>
                    <label className="label">Display name</label>
                    <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="ak-input"
                    />
                </div>

                <div className="actions">
                    <button type="submit" disabled={saving} className="btn-ak btn-ak--primary">
                        {saving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => user?.email && sendPasswordResetEmail(auth, user.email)} className="btn-ak">
                        Send password reset email
                    </button>
                </div>
            </form>

            {msg && <p className="msg">{msg}</p>}
        </div>
    );
}
