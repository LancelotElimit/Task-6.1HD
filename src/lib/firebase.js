// src/lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore /*, initializeFirestore*/ } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC4m6xwFjRTOUKk68vpBFysubmUrqLrrN8",
    authDomain: "task-71p-6d5ef.firebaseapp.com",
    projectId: "task-71p-6d5ef",
    // 建议改为 "task-71p-6d5ef.appspot.com"
    storageBucket: "task-71p-6d5ef.firebasestorage.app",
    appId: "1:489957127485:web:11a5d66157f38caffe8154",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// 如需减少本地开发 400 噪音，可用强制长轮询：
// const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const db = getFirestore(app,"task81d");
const storage = getStorage(app);
const auth = getAuth(app);

// Google 登录（保持与 9.1C 行为一致）
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
export const googleSignIn = () => signInWithPopup(auth, provider);

// 导出统一实例
export { app, auth, db, storage };
// 统一用 ts() 生成服务器时间戳
export const ts = serverTimestamp;
