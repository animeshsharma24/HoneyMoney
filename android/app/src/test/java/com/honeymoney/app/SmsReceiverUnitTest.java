package com.honeymoney.app;

import static org.junit.Assert.*;
import org.junit.Test;

public class SmsReceiverUnitTest {

    @Test
    public void testIsFinancialTransactionSms_DebitSms() {
        String sms = "Dear Customer, INR 450.00 debited from A/C XX1234 on 25-Sep-26 to SWIGGY. Ref 928310.";
        assertTrue(SmsReceiver.isFinancialTransactionSms(sms));
    }

    @Test
    public void testIsFinancialTransactionSms_CreditCardSpent() {
        String sms = "Alert: Rs. 1,299 spent on SBI Credit Card ending 5210 at ZOMATO on 24-Sep-26.";
        assertTrue(SmsReceiver.isFinancialTransactionSms(sms));
    }

    @Test
    public void testIsFinancialTransactionSms_ExcludeOtp() {
        String sms = "Your OTP for login to Bank Portal is 849201. Do not share this with anyone.";
        assertFalse(SmsReceiver.isFinancialTransactionSms(sms));
    }

    @Test
    public void testIsFinancialTransactionSms_ExcludePromo() {
        String sms = "Congratulations! You are pre-approved for personal loan of Rs 5 Lakhs. Click here to apply.";
        assertFalse(SmsReceiver.isFinancialTransactionSms(sms));
    }
}
