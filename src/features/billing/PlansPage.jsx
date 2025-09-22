import { useNavigate } from "react-router-dom";
import "./PlansPage.css";

export default function PlansPage() {
    const navigate = useNavigate();
    const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/home"));

    return (
        <div className="plans-container">
            {/* 返回 + 标题 */}
            <div className="plans-header">
                <button
                    onClick={goBack}
                    aria-label="Go back"
                    title="Back"
                    className="back-btn"
                >
                    ← Back
                </button>
                <h1 className="plans-title">Pricing Plans</h1>
            </div>

            <div className="plans-grid">
                <div className="plan-card">
                    <h2 className="plan-title">Free</h2>
                    <ul className="plan-list">
                        <li>Basic functions: posting, reading</li>
                        <li>Markdown rendering and code highlighting</li>
                    </ul>
                    <button className="plan-btn" onClick={() => navigate("/home")}>
                        Continue to use Free
                    </button>
                </div>

                <div className="plan-card plan-card--premium">
                    <h2 className="plan-title">Premium</h2>
                    <ul className="plan-list">
                        <li>Theme and banner/message</li>
                        <li>Content control or management support</li>
                        <li>(Optional) Analytical Dashboard</li>
                    </ul>
                    {/* 价格仅示例：$5.00 AUD -> 500 分 */}
                    <button
                        className="plan-btn plan-btn--primary"
                        onClick={() => navigate("/checkout?amount=500&currency=AUD")}
                    >
                        Go Premium ($5)
                    </button>
                </div>
            </div>
        </div>
    );
}
