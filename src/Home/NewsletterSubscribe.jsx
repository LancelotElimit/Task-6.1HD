// src/Home/NewsletterSubscribe.jsx
import { useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function NewsletterSubscribe() {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setMsg("");
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setMsg("请输入有效邮箱");
            return;
        }
        setBusy(true);
        try {
            const res = await fetch(`${API_BASE}/api/subscribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.success) {
                setMsg("订阅成功！请查收欢迎邮件。");
                setEmail("");
            } else {
                setMsg(data?.error || "发送失败，请稍后重试。");
            }
        } catch {
            setMsg("网络异常，请稍后重试。");
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}
            />
            <button type="submit" disabled={busy} style={{ padding: "8px 12px", borderRadius: 8 }}>
                {busy ? "Submitting..." : "Subscribe"}
            </button>
            {msg && <span style={{ marginLeft: 8, fontSize: 14 }}>{msg}</span>}
        </form>
    );
}
