import { useEffect, useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function CheckoutForm({ amount, currency }) {
    const stripe = useStripe();
    const elements = useElements();
    const [clientSecret, setClientSecret] = useState(null);
    const [status, setStatus] = useState("idle");

    useEffect(() => {
        (async () => {
            try {
                const url = process.env.REACT_APP_PI_URL;
                     console.log("fetching PI:", url, { amount, currency });
                     const res = await fetch(url, {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({ amount, currency }),
                         });
                     if (!res.ok) {
                           const text = await res.text();
                           throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
                         }
                     const data = await res.json();
                     setClientSecret(data.clientSecret);
                   } catch (e) {
                     console.error("createPaymentIntent failed:", e);
                     alert(`支付服务暂不可用：${e.message}`);
                   }


        })();
    }, [amount, currency]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements || !clientSecret) return;
        setStatus("processing");

        const card = elements.getElement(CardElement);
        const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: { card },
        });

        if (error) {
            console.error(error);
            setStatus("failed");
            return;
        }

        if (paymentIntent && paymentIntent.status === "succeeded") {
            // 标记用户为 premium
            const uid = auth.currentUser?.uid;
            if (uid) {
                await setDoc(
                    doc(db, "users", uid),
                    { plan: "premium", premiumSince: new Date().toISOString() },
                    { merge: true }
                );
            }
            setStatus("succeeded");
            alert("支付成功！你现在是 Premium。");
        } else {
            setStatus("failed");
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <CardElement options={{ hidePostalCode: true }} />
            </div>
            <button disabled={!stripe || status === "processing"}>
                {status === "processing" ? "处理中..." : "支付"}
            </button>
        </form>
    );
}
