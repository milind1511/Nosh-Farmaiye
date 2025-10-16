import { useCallback, useContext, useEffect } from "react";
import "./Verify.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { toast } from "react-toastify";

const Verify = () => {
    const [searchParams] = useSearchParams();
    const success = searchParams.get("success");
    const orderId = searchParams.get("orderId");
    const { url, clearCart } = useContext(StoreContext);
    const navigate = useNavigate();

    const verifyPayment = useCallback(async () => {
        if (!success || !orderId) {
            navigate("/");
            return;
        }

        try {
            const response = await axios.post(`${url}/api/order/verify`, {
                success,
                orderId,
            });
            if (response.data.success) {
                clearCart();
                toast.success("Order Placed Successfully");
                navigate("/myorders");
            } else {
                toast.error(response.data.message || "Something went wrong");
                navigate("/");
            }
        } catch (error) {
            toast.error("Verification failed. Please contact support.");
            navigate("/");
        }
    }, [clearCart, navigate, orderId, success, url]);

    useEffect(() => {
        verifyPayment();
    }, [verifyPayment]);

    return (
        <div className="verify">
            <div className="spinner"></div>
        </div>
    );
};

export default Verify;
