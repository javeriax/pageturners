# Forgot Password Feature - Testing Guide

## Pre-Testing Checklist
- [ ] Backend server is running
- [ ] Frontend development server is running
- [ ] Gmail/SMTP credentials are properly configured in `.env`
- [ ] At least one user account exists in the database for testing

## Test Cases

### Test 1: Request Password Reset (Email Request)
1. Navigate to Login page
2. Click "Forgot Password?" button
3. Enter registered email address
4. Click "Send Reset Code"
5. **Expected**: 
   - Success message appears: "Password reset code sent! Check your email..."
   - Modal transitions to reset code step
   - Check email inbox for password reset email

### Test 2: Invalid Email
1. Navigate to Login page
2. Click "Forgot Password?" button
3. Try submitting with:
   - Empty email → "Email is required"
   - Invalid email (no @) → "Email must include the @ symbol"
   - Invalid format → "Please enter a valid email address"
4. **Expected**: Error messages appear below email field

### Test 3: Non-existent Email
1. Navigate to Login page
2. Click "Forgot Password?" button
3. Enter email that doesn't exist in database
4. Click "Send Reset Code"
5. **Expected**: Generic message: "If this email exists in our system..."

### Test 4: Reset Password with Valid Code
1. Complete Test 1 to get reset code from email
2. Copy reset code from email
3. In modal's second step:
   - Enter reset code (should be 6 characters)
   - Enter new password (at least 8 characters)
   - Confirm password
   - Click "Reset Password"
4. **Expected**:
   - Success message: "Password reset successfully! You will be redirected..."
   - Modal closes automatically
   - Can now login with new password

### Test 5: Password Validation
1. In password reset form, try:
   - Password < 8 characters → "Password must be at least 8 characters..."
   - Mismatched confirmation → "Passwords do not match"
   - Empty password → "New password is required"
2. **Expected**: Error messages appear

### Test 6: Invalid Reset Code
1. In password reset form:
   - Enter wrong reset code
   - Enter valid new password
   - Click "Reset Password"
2. **Expected**: "Invalid or expired reset code"

### Test 7: Expired Reset Code
1. Request password reset email
2. Wait 61 minutes (or modify timestamp in database for faster testing)
3. Try to reset password with old code
4. **Expected**: "Reset code has expired. Please request a new one."

### Test 8: Back Button
1. Request password reset
2. See success message and move to reset step
3. Click "← Back to Email" button
4. **Expected**: Return to email request form

### Test 9: Modal Close Button
1. Click "Forgot Password?" button
2. Click ✕ (close button) in top-right
3. **Expected**: Modal closes and form state resets

### Test 10: Login with New Password
1. Complete password reset
2. Try to login with old password → "Invalid email or password"
3. Try to login with new password → Should succeed and redirect to dashboard
4. **Expected**: Redirected to dashboard with valid token

## Email Verification Checklist

### Verify Email Contains:
- [ ] "Reset Your Password" header
- [ ] Reset code (6 characters)
- [ ] Reset link with email and code as URL parameters
- [ ] Expiration notice (1 hour)
- [ ] Security notice about ignoring if not requested

### Reset Link Format:
```
http://localhost:5173/reset-password?email=user@example.com&code=ABC123
```

## Success Criteria
- ✅ Modal opens and closes properly
- ✅ Email validation works
- ✅ Reset code is received via email
- ✅ Password reset succeeds with valid code
- ✅ New password allows login
- ✅ Old password no longer works
- ✅ All error messages display appropriately
- ✅ Modal can be reused on Profile page (test after integration)

## Known Limitations
- Reset codes expire after 1 hour (configurable in backend)
- Minimum password length is 8 characters
- Email must be properly configured in `.env`

## Debugging Tips
- Check browser console for API errors
- Check backend logs for email sending status
- Verify database has user with correct email
- Check that password_reset_code is stored in database
- Verify SMTP settings in `.env` file
