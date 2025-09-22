// src/messages/MessagesPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ensureConversationWithEmail,
    subscribeConversations,
    subscribeMessages,
    sendMessage,
} from "../../services/messages";
import { auth } from "../../lib/firebase";
import { useNavigate, useParams } from "react-router-dom";
import { ensureSelfUserDoc } from "../../services/users";
import "./MessagesPage.css";

export default function MessagesPage() {
    const nav = useNavigate();
    const { id: routeCid } = useParams();
    const [me, setMe] = useState(() => auth.currentUser || null);

    const [convos, setConvos] = useState([]);
    const [cid, setCid] = useState(routeCid || "");
    const [msgs, setMsgs] = useState([]);
    const [input, setInput] = useState("");
    const [toEmail, setToEmail] = useState("");
    const [busyNew, setBusyNew] = useState(false);
    const [busySend, setBusySend] = useState(false);

    const listRef = useRef(null);

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged(async (u) => {
            setMe(u || null);
            if (!u) {
                nav("/login", { replace: true, state: { from: "/messages" } });
            } else {
                await ensureSelfUserDoc();
            }
        });
        return () => unsubAuth();
    }, [nav]);

    // 订阅我的会话
    useEffect(() => {
        if (!me) return;
        const unsub = subscribeConversations((rows) => {
            setConvos(rows);
            // 如果没有选中会话，自动选第一条
            if (!cid && rows.length) setCid(rows[0].id);
        });
        return () => unsub();
    }, [me]); // eslint-disable-line

    // 订阅选中会话的消息
    useEffect(() => {
        if (!cid) {
            setMsgs([]);
            return;
        }
        const unsub = subscribeMessages(cid, (rows) => {
            setMsgs(rows);
            // 滚动到底
            setTimeout(() => {
                listRef.current?.scrollTo({
                    top: listRef.current.scrollHeight,
                    behavior: "smooth",
                });
            }, 0);
        });
        return () => unsub();
    }, [cid]);

    const current = useMemo(
        () => convos.find((c) => c.id === cid) || null,
        [cid, convos]
    );
    const others = useMemo(() => {
        if (!current || !me) return [];
        return (current.members || []).filter((x) => x !== me.uid);
    }, [current, me]);

    const other = useMemo(() => {
        if (!current || !others.length) return null;
        const info = current.membersInfo?.[others[0]] || null;
        return info;
    }, [current, others]);

    const startNew = async (e) => {
        e.preventDefault();
        if (!toEmail.trim()) return;
        setBusyNew(true);
        try {
            const conv = await ensureConversationWithEmail(toEmail.trim());
            setCid(conv.id);
            setToEmail("");
        } catch (err) {
            alert(err?.message || "Failed to start conversation");
        } finally {
            setBusyNew(false);
        }
    };

    const onSend = async (e) => {
        e?.preventDefault?.();
        if (!input.trim() || !cid) return;
        const body = input;
        setInput("");
        setBusySend(true);
        try {
            await sendMessage(cid, body);
            // 实时订阅会推送到 msgs
        } catch (e2) {
            alert(`Send failed: ${e2?.code || e2?.message || e2}`);
            setInput(body); // 回滚输入
        } finally {
            setBusySend(false);
        }
    };

    return (
        <div className="msg-root">
            {/* 左侧：会话列表 + 新建 */}
            <aside className="msg-sidebar">
                <form onSubmit={startNew} className="msg-newform">
                    <input
                        type="email"
                        value={toEmail}
                        onChange={(e) => setToEmail(e.target.value)}
                        placeholder="Start chat by email…"
                        className="ak-input"
                    />
                    <button type="submit" disabled={busyNew} className="btn-ak">
                        {busyNew ? "…" : "Chat"}
                    </button>
                </form>

                <div className="msg-section-title">Conversations</div>
                <ul className="msg-convo-list">
                    {convos.map((c) => {
                        // 显示对方的信息
                        const others = (c.members || []).filter((x) => x !== me?.uid);
                        const o = others.length ? c.membersInfo?.[others[0]] : null;
                        const name = o?.displayName || o?.email || "Unknown";
                        const avatar = o?.photoURL;
                        const active = c.id === cid;
                        return (
                            <li key={c.id}>
                                <button
                                    onClick={() => setCid(c.id)}
                                    className={`msg-convo ${active ? "is-active" : ""}`}
                                >
                                    {avatar ? (
                                        <img src={avatar} alt="" className="msg-avatar" />
                                    ) : (
                                        <div className="msg-avatar placeholder" />
                                    )}
                                    <div className="msg-convo-meta">
                                        <span className="msg-convo-name">{name}</span>
                                        <span className="msg-convo-last">
                      {c.lastMessage?.text || "No messages"}
                    </span>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                    {convos.length === 0 && (
                        <li className="msg-empty">No conversations yet.</li>
                    )}
                </ul>
            </aside>

            {/* 右侧：聊天窗口 */}
            <section className="msg-chat">
                {/* 顶部：对方信息 */}
                <div className="msg-chat-header">
                    <button
                        onClick={() => (window.history.length > 1 ? nav(-1) : nav("/home"))}
                        aria-label="Go back"
                        title="Back"
                        className="back-btn"
                    >
                        ← Back
                    </button>
                    {other?.photoURL ? (
                        <img src={other.photoURL} alt="" className="msg-avatar lg" />
                    ) : (
                        <div className="msg-avatar lg placeholder" />
                    )}
                    <div className="msg-chat-title">
                        {other?.displayName || other?.email || "Conversation"}
                    </div>
                </div>

                {/* 消息列表 */}
                <div ref={listRef} className="msg-chat-list">
                    {msgs.map((m) => {
                        const mine = m.from === me?.uid;
                        return (
                            <div
                                key={m.id}
                                className={`msg-row ${mine ? "mine" : "other"}`}
                            >
                                <div className={`msg-bubble ${mine ? "mine" : "other"}`}>
                                    {m.text}
                                    <div className={`msg-time ${mine ? "mine" : "other"}`}>
                                        {m.createdAt?.toDate
                                            ? m.createdAt.toDate().toLocaleString()
                                            : ""}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {msgs.length === 0 && <div className="msg-empty">Say hi 👋</div>}
                </div>

                {/* 输入框 */}
                <form onSubmit={onSend} className="msg-inputbar">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message…"
                        className="ak-input flex1"
                    />
                    <button
                        type="submit"
                        disabled={busySend || !cid || !input.trim()}
                        className="btn-ak btn-ak--primary"
                    >
                        {busySend ? "Sending…" : "Send"}
                    </button>
                </form>
            </section>
        </div>
    );
}
