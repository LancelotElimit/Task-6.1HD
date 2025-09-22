// src/services/messages.js
import {
    addDoc, setDoc, getDoc, getDocs, doc, collection, query, where,
    orderBy, onSnapshot, serverTimestamp, updateDoc, arrayUnion
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

/** 通过 email 查 users 表，拿到 { uid, email, displayName, photoURL } */
export async function lookupUserByEmail(email) {
    const norm = email.trim().toLowerCase();
    const q = query(collection(db, "users"), where("normalizedEmail", "==", norm));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data();
    return { uid: d.id, email: data.email || email, displayName: data.firstName || data.displayName || null, photoURL: data.photoURL || null };
}

/** 开启/获取与某人的会话（如果不存在则创建） */
export async function ensureConversationWithEmail(email) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");
    const other = await lookupUserByEmail(email);
    if (!other) throw new Error("User not found by email");

    // 查是否已有会话（members 作为 array，含双方 uid）
    const q = query(
        collection(db, "conversations"),
        where("members", "array-contains", me.uid)
    );
    const snap = await getDocs(q);
    let exist = null;
    snap.forEach((d) => {
        const data = d.data();
        const set = new Set(data.members || []);
        if (set.has(me.uid) && set.has(other.uid) && set.size === 2) exist = { id: d.id, ...data };
    });
    if (exist) return exist;

    // 创建
    const payload = {
        members: [me.uid, other.uid],
        membersInfo: {
            [me.uid]: { uid: me.uid, email: me.email, displayName: me.displayName || null, photoURL: me.photoURL || null },
            [other.uid]: other
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: null
    };
    const ref = await addDoc(collection(db, "conversations"), payload);
    return { id: ref.id, ...payload };
}

/** 订阅我的会话列表（按更新时间降序） */
export function subscribeConversations(onChange) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");
    const qy = query(
        collection(db, "conversations"),
        where("members", "array-contains", me.uid),
        orderBy("updatedAt", "desc")
    );
    return onSnapshot(qy, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        onChange(rows);
    });
}

/** 订阅某会话的消息（按时间升序） */
export function subscribeMessages(cid, onChange) {
    const qy = query(
        collection(db, "conversations", cid, "messages"),
        orderBy("createdAt", "asc")
    );
    return onSnapshot(qy, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        onChange(rows);
    });
}

/** 发送消息（乐观由 UI 处理，这里只写库 & 更新会话摘要） */
export async function sendMessage(cid, text) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");
    const body = String(text || "").trim();
    if (!body) return;

    const msg = {
        from: me.uid,
        text: body,
        createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, "conversations", cid, "messages"), msg);
    await updateDoc(doc(db, "conversations", cid), {
        lastMessage: { text: body.slice(0, 200), at: serverTimestamp(), from: me.uid },
        updatedAt: serverTimestamp(),
        // 可选：把最近活跃成员放进一个字段，便于查询
        activeMembers: arrayUnion(me.uid)
    });
    return ref.id;
}
