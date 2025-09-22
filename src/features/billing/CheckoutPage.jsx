import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm.jsx";
import "./Checkoutpage.css";

export default function CheckoutPage() {
    const [params] = useSearchParams();
    const amount = Number(params.get("amount") || 500);
    const currency = params.get("currency") || "AUD";
    const options = useMemo(() => ({ appearance: { theme: "stripe" } }), []);
    const pk = process.env.REACT_APP_STRIPE_PK;

    if (!pk) {
        return (
            <div className="checkout-container">
                <h1>Checkout</h1>
                <p className="checkout-error">
                    lack Stripe public key please set it in <code>.env.local</code>
                    <code>REACT_APP_STRIPE_PK</code>，then restart <code>npm start</code>。
                </p>
            </div>
        );
    }

    const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PK);

    return (
        <div className="checkout-container">
            <h1>Checkout</h1>
            <p>gonna pay：{currency} ${(amount / 100).toFixed(2)}</p>
            <Elements stripe={stripePromise} options={options}>
                <CheckoutForm amount={amount} currency={currency} />
            </Elements>
        </div>
    );
}
