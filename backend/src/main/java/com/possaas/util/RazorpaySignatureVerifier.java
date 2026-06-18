package com.possaas.util;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.razorpay.RazorpayException;
import com.razorpay.Utils;

@Component
public class RazorpaySignatureVerifier {

    @Value("${app.razorpay.key.secret}")
    private String razorpayKeySecret;

    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(options, razorpayKeySecret);
        } catch (RazorpayException e) {
            return false;
        }
    }
}
