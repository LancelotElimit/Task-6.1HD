// src/services/messages.js
import {
    addDoc, getDocs, doc, collection, query, where,
    orderBy, onSnapshot, serverTimestamp, updateDoc
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
    return {
        uid: d.id,
        email: data.email || email,
        displayName: data.firstName || data.displayName || null,
        photoURL: data.photoURL || null,
    };
}

/** 开启/获取与某人的会话（如果不存在则创建） */
export async function ensureConversationWithEmail(email) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");
    const other = await lookupUserByEmail(email);
    if (!other) throw new Error("User not found by email");

    // 查是否已有会话（members 作为 array，含双方 uid）
    const qy = query(
        collection(db, "conversations"),
        where("members", "array-contains", me.uid)
    );
    const snap = await getDocs(qy);
    let exist = null;
    snap.forEach((d) => {
        const data = d.data();
        const set = new Set(data.members || []);
        if (set.has(me.uid) && set.has(other.uid) && set.size === 2) {
            exist = { id: d.id, ...data };
        }
    });
    if (exist) return exist;

    // 创建（字段严格对齐规则：members/membersInfo/lastMessage/createdAt/updatedAt）
    const payload = {
        members: [me.uid, other.uid],
        membersInfo: {
            [me.uid]: {
                uid: me.uid,
                email: me.email,
                displayName: me.displayName || null,
                photoURL: me.photoURL || null,
            },
            [other.uid]: other,
        },
        lastMessage: { text: "", from: null, createdAt: serverTimestamp() },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, "conversations"), payload);
    return { id: ref.id, ...payload };
}

/** 订阅我的会话列表（按更新时间降序） */
export function subscribeConversations(onChange, onError) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");
    const qy = query(
        collection(db, "conversations"),
        where("members", "array-contains", me.uid),
        orderBy("updatedAt", "desc")
    );
    return onSnapshot(
        qy,
        (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            onChange(rows);
        },
        (err) => {
            console.error("[subscribeConversations] PERM ERROR", err);
            onError && onError(err);
        }
    );
}

/** 订阅某会话的消息（按时间升序） */
export function subscribeMessages(cid, onChange, onError) {
    const qy = query(
        collection(db, "conversations", cid, "messages"),
        orderBy("createdAt", "asc")
    );
    return onSnapshot(
        qy,
        (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            onChange(rows);
        },
        (err) => {
            console.error("[subscribeMessages] PERM ERROR", err);
            onError && onError(err);
        }
    );
}

/** 发送消息（写入消息 & 只更新允许的会话字段） */
export async function sendMessage(cid, text) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");
    const body = String(text || "").trim();
    if (!body) return;

    const msg = { from: me.uid, text: body, createdAt: serverTimestamp() };
    const msgRef = await addDoc(collection(db, "conversations", cid, "messages"), msg);

    // 更新会话，只改 lastMessage / updatedAt —— 符合规则
    await updateDoc(doc(db, "conversations", cid), {
        lastMessage: { text: body.slice(0, 200), from: me.uid, createdAt: serverTimestamp() },
        updatedAt: serverTimestamp(),
    });

    return msgRef.id;
}
