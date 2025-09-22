// src/services/users.js
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function ensureSelfUserDoc() {
    const u = auth.currentUser;
    if (!u) return;
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    const base = {
        email: u.email || null,
        normalizedEmail: (u.email || "").toLowerCase(),
        displayName: u.displayName || null,
        photoURL: u.photoURL || null,
        updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
        await setDoc(ref, { ...base, createdAt: serverTimestamp() });
    } else {
        await setDoc(ref, base, { merge: true });
    }
}
