import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

const API_URL = import.meta.env.VITE_API_URL;

export default function SubscribeAfterVerify() {
    const formRef = useRef(null);

    useEffect(() => {
        if (formRef.current) {
            formRef.current.submit();
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Verifiering lyckades ✅</h1>
                <p className="text-text-muted">
                    Skickar dig vidare till betalning...
                </p>
            </div>
            <form
                ref={formRef}
                action={`${API_URL}/stripe/create-checkout-session`}
                method="POST"
                className="hidden"
            >
                <input type="hidden" name="lookup_key" value="OMXSUM_premium_test-ea67345" />
            </form>
        </div>
    );
}
