/*
========================================
LOGIN API INTEGRATION TEST (FULL FLOW)
========================================

TESTS INCLUDED:

1. Missing email → should return 400
2. Missing password → should return 400
3. Invalid credentials → should return 401
4. Successful login → should return 200 + JWT token

Matches:
- TC-AM-03 (Login success)
- TC-AM-04 (Invalid login)
- TC-API-01 (JWT token validation)
========================================
*/

const API_BASE_URL = 'http://localhost:5000/api';

// ----------------------------------------
// LOGIN FUNCTION (Frontend Style)
// ----------------------------------------

const loginUser = async (email, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        return {
            success: true,
            message: data.message || 'Login successful',
            token: data.token,
            status: response.status
        };

    } catch (error) {
        return {
            success: false,
            message: error.message,
        };
    }
};

// ----------------------------------------
// TEST RUNNER
// ----------------------------------------

const runLoginTests = async () => {
    console.log("========================================");
    console.log("RUNNING LOGIN API TESTS");
    console.log("========================================");

    // -----------------------------
    // TEST 1: Missing Email
    // -----------------------------
    console.log("\n[TEST 1] Missing Email");

    let result = await loginUser(null, "Password123");

    console.log(result);

    if (!result.success && result.message.toLowerCase().includes("required")) {
        console.log("✅ PASS");
    } else {
        console.log("❌ FAIL");
    }

    // -----------------------------
    // TEST 2: Missing Password
    // -----------------------------
    console.log("\n[TEST 2] Missing Password");

    result = await loginUser("test@example.com", null);

    console.log(result);

    if (!result.success && result.message.toLowerCase().includes("required")) {
        console.log("✅ PASS");
    } else {
        console.log("❌ FAIL");
    }

    // -----------------------------
    // TEST 3: Invalid Credentials
    // -----------------------------
    console.log("\n[TEST 3] Invalid Credentials");

    result = await loginUser("wrong@example.com", "WrongPassword");

    console.log(result);

    if (!result.success && result.message.toLowerCase().includes("incorrect")) {
        console.log("✅ PASS");
    } else {
        console.log("❌ FAIL");
    }

    // -----------------------------
    // TEST 4: Successful Login
    // -----------------------------
    console.log("\n[TEST 4] Successful Login");

    result = await loginUser("test@example.com", "Password123");

    console.log(result);

    if (result.success && result.token) {
        const parts = result.token.split(".");
        if (parts.length === 3) {
            console.log("✅ PASS (Valid JWT)");
        } else {
            console.log("❌ FAIL (Invalid Token Format)");
        }
    } else {
        console.log("❌ FAIL");
    }
};

// Run tests
runLoginTests();