import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./Home/components/ProtectedRoute";

// 懒加载页面
const Login = lazy(() => import("./Login/Login.jsx"));
const SignUp = lazy(() => import("./SignUp/SignUp.jsx"));
const Home = lazy(() => import("./Home/Home.jsx"));
const PostComposePage = lazy(() => import("./features/posts/PostComposePage.jsx"));
const FindQuestionPage = lazy(() => import("./features/posts/FindQuestionPage.jsx"));
const PlansPage = lazy(() => import("./features/billing/PlansPage.jsx"));
const CheckoutPage = lazy(() => import("./features/billing/CheckoutPage.jsx"));
const Profile = lazy(() => import("./Home/Profile"));
const ProfileSecurity = lazy(() => import("./Home/ProfileSecurity"));
const ForgotPassword = lazy(() => import("./Login/ForgotPassword"));
const MessagesPage =lazy(()=>import("./features/messages/MessagesPage"))
export default function App() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
            <Routes>
                {/* 公共路由 */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/home" element={<Home />} />
                <Route path="/posts/find" element={<FindQuestionPage />} />
                <Route path="/forgot" element={<ForgotPassword />} />

                {/* 需要登录的路由 */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/posts/new" element={<PostComposePage />} />
                    <Route path="/plans" element={<PlansPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/security" element={<ProfileSecurity />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/messages/:id" element={<MessagesPage />} />
                </Route>

                {/* 兜底 */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Suspense>
    );
}
