import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import NewsletterSubscribe from "./NewsletterSubscribe";
import Header from "./Header";        // ← 你上传的横幅组件
import CardList from "./CardList";    // ← 你上传的卡片列表组件
import { sendEmailVerification } from "firebase/auth";

// 未登录时是否自动重定向（保持你的原有开关）
const AUTO_REDIRECT_IF_LOGGED_OUT = false;

// 是否在导航栏下方渲染页面主体（Header + CardList）
// 如果你想要“只保留导航栏”，把它改成 false 即可
const SHOW_BODY = true;

export default function Home() {
    const navigate = useNavigate();
    const db = getFirestore();

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signingOut, setSigningOut] = useState(false);
    const [sendingVerify, setSendingVerify] = useState(false);
    const [verifyMsg, setVerifyMsg] = useState("");


    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (!u) {
                setUser(null);
                setProfile(null);
                setLoading(false);            // ✅ 立即结束加载
                if (AUTO_REDIRECT_IF_LOGGED_OUT) {
                    navigate("/login", { replace: true });
                }
                return;
            }
            setUser(u);
            setLoading(false);              // ✅ 不等 Firestore，也先把页面画出来

            // 🔎 后台异步拉取 profile，不阻塞渲染
            (async () => {
                try {
                    const snap = await getDoc(doc(db, "users", u.uid));
                    if (snap.exists()) setProfile(snap.data());
                } catch (e) {
                    console.warn("Failed to load profile:", e);
                }
            })();
        });
        return () => unsub();
    }, [db, navigate]);


    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await signOut(auth);
            // 不跳路由：直接切到未登录状态（右上角变 Login）
            setUser(null);
            setProfile(null);
            setLoading(false);
        } finally {
            setSigningOut(false);
        }
    };
    const handleResendVerify = async () => {
        if (!auth.currentUser) return;
        setVerifyMsg("");
        setSendingVerify(true);
        try {
            await sendEmailVerification(auth.currentUser);
            setVerifyMsg("Verification email sent. Please check your inbox.");
        } catch (e) {
            setVerifyMsg((e?.message || "Failed to send verification email").replace("Firebase:", "").trim());
        } finally {
            setSendingVerify(false);
        }
    };


    const NavBar = () => (
        <div className="topnav">
            <div className="topnav-left">
                <button className="linklike" onClick={() => navigate("/")}>DevDeakinApp</button>
                <button className="linklike" onClick={() => navigate("/posts/find")}>Post</button>
                <button className="linklike" onClick={() => navigate("/plans")}>Plan</button>
                <button className="linklike" onClick={() => navigate("/messages")}>Chat</button>
            </div>

            <div className="topnav-center">
                <div className="topnav-subscribe">
                    <NewsletterSubscribe />
                </div>
            </div>

            <div className="topnav-right">
                {user ? (
                    <div className="user-menu">

                        <button
                            className="user-trigger"
                            aria-haspopup="true"
                            aria-expanded="false"
                            title={user.email}
                        >
                            {/* 头像（有则显示） */}
                            {(user.photoURL || profile?.photoURL) && (
                                <img
                                    src={user.photoURL || profile?.photoURL}
                                    alt="avatar"
                                    style={{
                                        width: 24, height: 24, borderRadius: "50%",
                                        objectFit: "cover", marginRight: 8, border: "1px solid #eaecef"
                                    }}
                                />
                            )}
                            <span className="user-email">{user.email}</span>
                            <span className="caret" aria-hidden>▾</span>
                        </button>


                        <div className="user-dropdown" role="menu">
                            <button
                                className="dropdown-item"
                                onClick={() => navigate("/profile")}
                            >
                                Profile
                            </button>
                            <button className="dropdown-item" onClick={() => navigate("/profile/security")}>
                                Security (2FA)
                            </button>

                            <button
                                className="dropdown-item"
                                onClick={handleSignOut}
                                disabled={signingOut}
                            >
                                {signingOut ? "Signing out..." : "Sign out"}
                            </button>
                        </div>

                    </div>
                ) : (
                    <button className="linklike" onClick={() => navigate("/login")}>Login</button>
                )}
            </div>
        </div>
    );

    // 三种状态都渲染导航栏；下面主体根据 SHOW_BODY 决定是否渲染
    if (loading) return <NavBar/>;

    return (
        <>
            <NavBar/>

            {/* 未验证邮箱提醒条（登录后且未验证时显示） */}
            {user && !user.emailVerified && (
                <div style={{
                    margin: "8px 16px",
                    padding: "10px 12px",
                    background: "#fffbe6",
                    border: "1px solid #ffe58f",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                }}>
                    <b>Email not verified.</b>
                    <button
                        onClick={handleResendVerify}
                        disabled={sendingVerify}
                        style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #e0e0e0",
                            background: "#fff",
                            cursor: "pointer",
                            fontWeight: 600
                        }}
                    >
                        {sendingVerify ? "Sending…" : "Resend verification email"}
                    </button>
                    {verifyMsg && <span style={{ color: "#555" }}>{verifyMsg}</span>}
                </div>
            )}

            {SHOW_BODY && (
                <main>
                    <Header />
                    <section style={{ padding: "24px 16px" }}>
                        <CardList />
                    </section>
                </main>
            )}
        </>

    );
}
