import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function ProtectedRoute() {
    const [ready, setReady] = useState(false);
    const [ok, setOk] = useState(false);
    const nav = useNavigate();
    const loc = useLocation();
    useEffect(() => onAuthStateChanged(auth, (u) => {
        setOk(!!u); setReady(true);
        if (!u) nav("/login", { replace: true, state: { from: loc } });
    }), [nav, loc]);
    if (!ready) return <div style={{ padding: 24 }}>Checking session…</div>;
    return ok ? <Outlet /> : null;
}
