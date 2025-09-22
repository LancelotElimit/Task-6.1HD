import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
    removeQuestion,
    hasLikedQuestion,
    toggleLikeQuestion,
    subscribeQuestions,
    subscribeComments,
    addComment,
    removeComment
} from '../../services/posts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import './findquestionpage.css';

export default function FindQuestionPage() {
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
    const [endDate, setEndDate] = useState('');
    const [likedMap, setLikedMap] = useState({});      // { [id]: true|false }
    const [pendingLike, setPendingLike] = useState({}); // { [id]: true }

    const [expanded, setExpanded] = useState({});      // { [qid]: true }
    const [comments, setComments] = useState({});      // { [qid]: Array<Comment> }
    const [newComment, setNewComment] = useState({});  // { [qid]: string }
    const [sending, setSending] = useState({});        // { [qid]: true }
    const subsRef = useRef({}); // { [qid]: () => void } 订阅取消函数
    const navigate = useNavigate();

    const startAt = useMemo(
        () => (startDate ? new Date(`${startDate}T00:00:00`) : null),
        [startDate]
    );
    const endAt = useMemo(
        () => (endDate ? new Date(`${endDate}T23:59:59.999`) : null),
        [endDate]
    );

    // 实时订阅帖子
    useEffect(() => {
        setErr('');
        setLoading(true);
        const unsub = subscribeQuestions(async (rows) => {
            setItems(rows);
            setLoading(false);
            // “我是否点过赞”
            try {
                const uid = auth.currentUser?.uid;
                if (uid) {
                    const pairs = await Promise.all(
                        rows.map(async (r) => [r.id, await hasLikedQuestion(r.id, uid)])
                    );
                    setLikedMap(Object.fromEntries(pairs));
                } else {
                    setLikedMap({});
                }
            } catch (e) {
                console.warn('[hasLikedQuestion batch failed]', e);
            }
        });
        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items.filter((it) => {
            const textOk =
                !s ||
                (it.title || '').toLowerCase().includes(s) ||
                (it.tagsText || '').toLowerCase().includes(s);

            const ts = it?.createdAt?.toDate
                ? it.createdAt.toDate()
                : it.createdAt instanceof Date
                    ? it.createdAt
                    : null;

            const startOk = !startAt || (ts && ts >= startAt);
            const endOk = !endAt || (ts && ts <= endAt);

            return textOk && startOk && endOk;
        });
    }, [items, q, startAt, endAt]);

    async function onDelete(id) {
        if (!window.confirm('Delete this question?')) return;
        await removeQuestion(id);
    }

    function toggleComments(qItem) {
        const qid = qItem.id;
        const open = !expanded[qid];
        setExpanded((m) => ({ ...m, [qid]: open }));
        if (open) {
            if (!subsRef.current[qid]) {
                subsRef.current[qid] = subscribeComments(qid, (rows) => {
                    setComments((m) => ({ ...m, [qid]: rows }));
                });
            }
        } else {
            try { subsRef.current[qid]?.(); } catch {}
            delete subsRef.current[qid];
        }
    }

    // 卸载时清理评论订阅
    useEffect(() => {
        return () => {
            Object.values(subsRef.current).forEach((unsub) => {
                try { unsub(); } catch {}
            });
            subsRef.current = {};
        };
    }, []);

    // 点赞（乐观更新）
    async function onToggleLike(item) {
        if (pendingLike[item.id]) return;
        const uid = auth.currentUser?.uid;
        if (!uid) { alert('Please login to like'); return; }

        const likedNow = !!likedMap[item.id];
        const prevItems = items;
        const prevMap = likedMap;

        const nextItems = items.map((it) =>
            it.id === item.id
                ? { ...it, likes: (it.likes || 0) + (likedNow ? -1 : 1) }
                : it
        );
        setItems(nextItems);
        setLikedMap({ ...likedMap, [item.id]: !likedNow });
        setPendingLike((m) => ({ ...m, [item.id]: true }));

        try {
            await toggleLikeQuestion(item.id, uid);
        } catch (e) {
            console.error('[toggleLikeQuestion failed]', e);
            setItems(prevItems);
            setLikedMap(prevMap);
            alert(`操作失败：${e?.code || e?.message || e}`);
        } finally {
            setPendingLike((m) => ({ ...m, [item.id]: false }));
        }
    }

    async function onSendComment(qid) {
        const uid = auth.currentUser?.uid;
        if (!uid) { alert('Please login to comment'); return; }
        const text = (newComment[qid] || '').trim();
        if (!text) return;

        setSending((m) => ({ ...m, [qid]: true }));
        try {
            await addComment(qid, text);
            setNewComment((m) => ({ ...m, [qid]: '' }));
        } catch (e) {
            alert(`Failed to comment: ${e?.code || e?.message || e}`);
        } finally {
            setSending((m) => ({ ...m, [qid]: false }));
        }
    }

    async function onRemoveComment(qid, cid, uid) {
        const me = auth.currentUser?.uid;
        if (!me || me !== uid) { alert('You can only delete your own comment'); return; }
        if (!window.confirm('Delete this comment?')) return;
        try {
            await removeComment(qid, cid);
        } catch (e) {
            alert(`Delete failed: ${e?.code || e?.message || e}`);
        }
    }

    const fmtDate = (it) => {
        const d = it?.createdAt?.toDate ? it.createdAt.toDate() : null;
        return d ? d.toLocaleString() : '—';
    };

    return (
        <div className="find-wrap">
            {/* 返回 + 标题 */}
            <div className="find-header">
                <button
                    onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
                    aria-label="Go back"
                    title="Back"
                    className="btn-back"
                >
                    ← Back
                </button>
                <h2 className="find-title">Find Question</h2>
            </div>

            {/* 搜索与日期过滤 */}
            <input
                type="text"
                placeholder="Filter by title or tags…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="input"
                style={{ marginBottom: 12 }}
            />
            <div className="find-toolbar">
                <label className="label">Start:</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                />
                <label className="label">End:</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input"
                />
            </div>

            {/* 状态 */}
            {loading && <div className="state-loading">Loading…</div>}
            {err && <div className="state-error">{err}</div>}
            {!loading && !err && filtered.length === 0 && (
                <div className="state-empty">没有匹配的结果</div>
            )}

            {/* 列表 */}
            <ul className="post-list">
                {filtered.map((it) => (
                    <li key={it.id} className="card post-item">
                        <div className="post-head">
                            <div className="post-title">{it.title || '(Untitled)'}</div>

                            {/* 作者信息 */}
                            <div className="post-author">
                                {it.authorPhotoURL ? (
                                    <img
                                        src={it.authorPhotoURL}
                                        alt={it.authorName || it.authorEmail || 'author'}
                                        className="avatar"
                                    />
                                ) : (
                                    <div className="avatar" aria-hidden />
                                )}
                                <div className="author-meta">
                  <span className="author-name">
                    {it.authorName || it.authorEmail || 'Anonymous'}
                  </span>
                                    <span className="author-time">{fmtDate(it)}</span>
                                </div>
                            </div>
                        </div>

                        {it.imageUrl && <img src={it.imageUrl} alt="" className="post-image" />}

                        {(it.body || it.content) && (
                            <div className="post-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {it.body || it.content}
                                </ReactMarkdown>
                            </div>
                        )}

                        <div className="post-tags">
                            {(Array.isArray(it.tagsArray) ? it.tagsArray : []).map((rawTag, i) => {
                                const tag = String(rawTag);
                                return (
                                    <span key={`${tag}-${i}`} className="tag">
                    {tag}
                  </span>
                                );
                            })}
                        </div>

                        {/* 评论收起/展开 */}
                        <div className="comment-toggle">
                            <button className="button" onClick={() => toggleComments(it)}>
                                {expanded[it.id]
                                    ? `Hide comments (${comments[it.id]?.length || 0})`
                                    : `Show comments (${comments[it.id]?.length || 0})`}
                            </button>
                        </div>

                        {/* 评论列表与输入框（仅展开时渲染） */}
                        {expanded[it.id] && (
                            <div className="comments">
                                <ul className="comment-list">
                                    {(comments[it.id] || []).map((c) => (
                                        <li key={c.id} className="comment-item">
                                            {c.authorPhotoURL ? (
                                                <img src={c.authorPhotoURL} alt="" className="avatar" />
                                            ) : (
                                                <div className="avatar" />
                                            )}

                                            <div style={{ flex: 1 }}>
                                                <div className="comment-meta">
                                                    <div className="comment-name">
                                                        {c.authorName || c.authorEmail || 'User'}
                                                    </div>
                                                    <div className="comment-time">
                                                        {c.createdAt?.toDate
                                                            ? c.createdAt.toDate().toLocaleString()
                                                            : ''}
                                                    </div>
                                                </div>

                                                <div style={{ whiteSpace: 'pre-wrap', marginTop: 2 }}>
                                                    {c.text}
                                                </div>

                                                {auth.currentUser?.uid === c.uid && (
                                                    <button
                                                        className="button comment-delete"
                                                        onClick={() => onRemoveComment(it.id, c.id, c.uid)}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                    {(comments[it.id] || []).length === 0 && (
                                        <li className="state-empty">No comments yet.</li>
                                    )}
                                </ul>

                                {/* 评论输入 */}
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <input
                                        type="text"
                                        placeholder="Write a comment…"
                                        value={newComment[it.id] || ''}
                                        onChange={(e) =>
                                            setNewComment((m) => ({ ...m, [it.id]: e.target.value }))
                                        }
                                        className="input"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="button"
                                        onClick={() => onSendComment(it.id)}
                                        disabled={!!sending[it.id]}
                                    >
                                        {sending[it.id] ? 'Sending…' : 'Post'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 点赞/删除 */}
                        <div className="post-actions">
                            <button
                                className="button"
                                onClick={() => onToggleLike(it)}
                                aria-pressed={likedMap[it.id] === true}
                                aria-label={likedMap[it.id] ? 'Unlike question' : 'Like question'}
                                title={likedMap[it.id] ? 'Unlike' : 'Like'}
                                disabled={!!pendingLike[it.id]}
                            >
                                {likedMap[it.id] ? '💙' : '👍'} {it.likes ?? 0}
                            </button>

                            <button className="button" onClick={() => onDelete(it.id)}>
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {/* 悬浮发帖按钮（右下角） */}
            <button
                onClick={() => navigate('/posts/new')}
                title="Create a new post"
                className="fab"
                aria-label="Create post"
            >
                +
            </button>
        </div>
    );
}
