import axios from "axios";

export const KHALTI_CONFIG = {
    baseUrl: "https://a.khalti.com/api/v2",
};

export const getKhaltiConfig = () => {
    return {
        baseUrl: KHALTI_CONFIG.baseUrl,
        secretKey: process.env.KHALTI_TEST_SECRET_KEY,
        publicKey: process.env.KHALTI_TEST_PUBLIC_KEY,
    };
};

export const initiateKhaltiPayment = async (data: {
    return_url: string;
    website_url: string;
    amount: number;
    purchase_order_id: string;
    purchase_order_name: string;
    customer_info: {
        name: string;
        email: string;
        phone?: string;
    };
}) => {
    const { baseUrl, secretKey } = getKhaltiConfig();

    if (!secretKey) {
        throw new Error("KHALTI_TEST_SECRET_KEY is missing in .env");
    }

    try {
        const response = await axios.post(
            `${baseUrl}/epayment/initiate/`,
            {
                ...data,
                amount: Math.round(data.amount * 100),
            },
            {
                headers: {
                    Authorization: `Key ${secretKey}`,
                    "Content-Type": "application/json",
                },
            },
        );

        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.detail || "Failed to initiate Khalti payment",
        );
    }
};

export const verifyKhaltiPayment = async (pidx: string) => {
    const { baseUrl, secretKey } = getKhaltiConfig();

    if (!secretKey) {
        throw new Error("KHALTI_TEST_SECRET_KEY is missing in .env");
    }

    try {
        const response = await axios.post(
            `${baseUrl}/epayment/lookup/`,
            { pidx },
            {
                headers: {
                    Authorization: `Key ${secretKey}`,
                    "Content-Type": "application/json",
                },
            },
        );

        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.detail || "Failed to verify Khalti payment",
        );
    }
};