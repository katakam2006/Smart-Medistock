require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;

    console.log("Configured User:", SMTP_USER);
    console.log("Configured Pass Length:", SMTP_PASS ? SMTP_PASS.length : 0);

    if (!SMTP_USER || !SMTP_PASS || SMTP_PASS.includes('xxxx')) {
        console.error("❌ ERROR: SMTP credentials not set or contain placeholders in .env file.");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    try {
        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: `"Smart MediStock Test" <${SMTP_USER}>`,
            to: SMTP_USER, // send to oneself
            subject: 'Smart MediStock - SMTP Test Email',
            text: 'If you are reading this, SMTP configuration is working perfectly!'
        });
        console.log("✅ SUCCESS! Test email sent successfully:", info.messageId);
    } catch (err) {
        console.error("❌ FAILED to send email:", err.message);
    }
}

testEmail();
