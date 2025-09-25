// src/services/users.js
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function ensureSelfUserDoc() {
    const u = auth.currentUser;
    if (!u) return;

    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);

    const base = {
        email: u.email || "",
        normalizedEmail: (u.email || "").trim().toLowerCase(),
        displayName: u.displayName || "",
        photoURL: u.photoURL || "",
        updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
        await setDoc(ref, { ...base, createdAt: serverTimestamp() });
    } else {
        await setDoc(ref, base, { merge: true });
    }
}
