import {
     collection, addDoc, deleteDoc, doc,
         getDocs, query, orderBy, updateDoc, increment, getDoc, runTransaction, serverTimestamp, setDoc,onSnapshot
     } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, ts ,auth } from '../lib/firebase';

// 可选：把 "a, b, c" 这样的字符串转数组；如果本来就是数组，原样返回
function toTagsArray(tags) {
    if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean);
    if (typeof tags === 'string') {
        return tags.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

async function maybeUploadImage(file, folder = 'uploads') {
    if (!file) return '';
    const path = `${folder}/${Date.now()}_${file.name}`;
    const r = ref(storage, path);
    await uploadBytes(r, file);
    return getDownloadURL(r);
}

/** 发“问题” */
export async function createQuestion({ title, body, tags = '', imageFile = null }) {
    if (!title?.trim() || !body?.trim()) {
        throw new Error('title 与 body 不能为空');
    }
    const imageUrl = await maybeUploadImage(imageFile, 'questions');
    const u = auth.currentUser;
    const payload = {
        title: title.trim(),
        body: body.trim(),
        tags: toTagsArray(tags),
        imageUrl,
        createdAt: ts(),        // 关键：serverTimestamp()
        authorUid: u?.uid || null,
        authorEmail: u?.email || null,
        authorName: u?.displayName || null,
        authorPhotoURL: u?.photoURL || null,
    };
    const res = await addDoc(collection(db, 'questions'), payload);
    return res.id;
}

/** 发“文章”（对应你的 ArticleForm 字段） */
export async function createArticle({ title, abstract = '', text = '', tags = '', imageFile = null }) {
    if (!title?.trim() || !abstract?.trim()) {
        throw new Error('title 与 abstract 不能为空');
    }
    const imageUrl = await maybeUploadImage(imageFile, 'articles');
    const payload = {
        title: title.trim(),
        abstract: abstract.trim(),
        text: text?.trim?.() ?? '',
        tags: toTagsArray(tags),
        imageUrl,
        createdAt: ts(),
    };
    const res = await addDoc(collection(db, 'articles'), payload);
    return res.id;
}

/** Find Question 列表（按时间倒序） */
// src/services/posts.js
export async function listQuestions() {
    const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        // 统一出两个便于前端使用的派生字段
        const tagsArray = Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' && data.tags.trim() ? data.tags.split(',').map(s=>s.trim()).filter(Boolean) : []);
        const tagsText  = tagsArray.join(', ');
        return { id: d.id, ...data, tagsArray, tagsText };
    });
}


/** 删除问题（可选） */
export async function removeQuestion(id) {
    await deleteDoc(doc(db, 'questions', id));
}

export async function likeQuestion(id) {
      const ref = doc(db, 'questions', id);
      await updateDoc(ref, { likes: increment(1) });
}
/** 查询当前用户是否已点赞（子集合：questions/{id}/likes/{uid}） */
export async function hasLikedQuestion(id, uid) {
    if (!uid) return false;
    const ref = doc(db, 'questions', id, 'likes', uid);
    const snap = await getDoc(ref);
    return snap.exists();
}

/** 切换点赞（已赞则取消；未赞则+1）——使用事务保证计数与子文档一致 */
export async function toggleLikeQuestion(id, uid) {
    if (!uid) throw new Error('Not signed in');
    const counterRef = doc(db, 'questions', id);
    const userLikeRef = doc(db, 'questions', id, 'likes', uid);

    return runTransaction(db, async (tx) => {
        const likeSnap = await tx.get(userLikeRef);
        if (likeSnap.exists()) {
            // 取消赞
            tx.delete(userLikeRef);
            tx.update(counterRef, { likes: increment(-1) });
            return { liked: false };
        } else {
            // 点赞
            tx.set(userLikeRef, { createdAt: serverTimestamp() });
            // 若 likes 字段不存在，用 merge/set 或 update 都可以，这里直接更新（不存在时按 0 处理）
            tx.set(counterRef, { likes: increment(1) }, { merge: true });
            return { liked: true };
        }
    });
}

/** 实时订阅 questions；返回 unsubscribe 函数 */
export function subscribeQuestions(onChange) {
      const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snap) => {
            const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            onChange(rows);
          });
    }
/** 实时订阅：questions/{qid}/comments，按时间升序 */
export function subscribeComments(qid, onChange) {
    const q = query(collection(db, 'questions', qid, 'comments'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        onChange(rows);
    });
}

/** 发表评论（登录后） */
export async function addComment(qid, text) {
    const u = auth.currentUser;
    if (!u) throw new Error('Not signed in');
    const payload = {
        text: String(text || '').trim(),
        uid: u.uid,
        authorName: u.displayName || null,
        authorEmail: u.email || null,
        authorPhotoURL: u.photoURL || null,
        createdAt: serverTimestamp(),
    };
    if (!payload.text) throw new Error('Empty comment');
    return addDoc(collection(db, 'questions', qid, 'comments'), payload);
}

/** 删除自己的评论 */
export async function removeComment(qid, cid) {
    return deleteDoc(doc(db, 'questions', qid, 'comments', cid));
}
