const API_BASE = 'http://localhost:3000';

async function testReset() {
    try {
        console.log("1. Requesting password reset code for user 'lucky'...");
        let res = await fetch(`${API_BASE}/api/user/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'lucky' })
        });
        console.log(`Forgot Password Status: ${res.status}`);
        let data = await res.json();
        console.log("Forgot Password Response:", data);

        if (res.status !== 200) {
            console.error("Forgot password request failed.");
            return;
        }

        console.log("\n2. Fetching generated OTP code from debug endpoint...");
        res = await fetch(`${API_BASE}/api/debug/reset-code/lucky`);
        console.log(`Debug Get Code Status: ${res.status}`);
        let debugData = await res.json();
        console.log("Debug Get Code Response:", debugData);

        if (res.status !== 200) {
            console.error("Could not retrieve OTP code.");
            return;
        }
        
        const code = debugData.code;

        console.log(`\n3. Verifying OTP code '${code}' and resetting password to 'Admin@1234' (valid format)...`);
        res = await fetch(`${API_BASE}/api/user/verify-otp-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'lucky',
                code: code,
                newPassword: 'Admin@1234'
            })
        });
        console.log(`Verify OTP Status: ${res.status}`);
        let verifyData = await res.json();
        console.log("Verify OTP Response:", verifyData);

        if (res.status === 200) {
            console.log("\n✅ SUCCESS: Password reset flow completed successfully!");
        } else {
            console.error("\n❌ FAILED: Verification or reset failed.");
        }
    } catch (err) {
        console.error("Test execution failed:", err);
    }
}

testReset();
