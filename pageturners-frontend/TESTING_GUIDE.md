# Register Component - Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
cd pageturners-frontend
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Visit `http://localhost:5173/register` to see the register form.

### 3. Run Tests
```bash
npm test
```

### 4. Run Tests with Watch Mode
```bash
npm test -- --watch
```

## Manual Testing Checklist

### Basic Form Functionality
- [ ] All form fields are visible and accessible
- [ ] Placeholder text is displayed in inputs
- [ ] Form is responsive on mobile (resize browser to test)

### Form Validation Tests

#### Username Field
- [ ] Show error when username is empty
- [ ] Show error when username is 2 characters
- [ ] Show error when username exceeds 20 characters
- [ ] Show error when username contains special characters like @!#$
- [ ] Accept valid usernames: `testuser`, `test_user`, `test-user`, `user123`
- [ ] Accept maximum 20 character username
- [ ] Error disappears when user starts typing after validation error

#### Email Field
- [ ] Show error when email is empty
- [ ] Show error for invalid formats: `testemail`, `test@`, `@example.com`
- [ ] Accept valid emails: `test@example.com`, `user+tag@example.co.uk`
- [ ] Accept emails with numbers and special characters

#### Password Field
- [ ] Show error when password is empty
- [ ] Show error when password is 7 characters
- [ ] Show error when password has no uppercase: `password123`
- [ ] Show error when password has no lowercase: `PASSWORD123`
- [ ] Show error when password has no number: `Password`
- [ ] Accept valid password: `Password123`
- [ ] Password hint text shows helpful requirements

#### Confirm Password Field
- [ ] Show error when confirm password is empty
- [ ] Show error when passwords don't match: `Password123` vs `Password456`
- [ ] Error clears when passwords match

### Form Submission Tests

#### Valid Form Submission (requires backend)
1. Fill form with:
   - Username: `testuser123`
   - Email: `test@example.com`
   - Password: `MyPassword123`
   - Confirm Password: `MyPassword123`
2. Click "Create Account" button
3. [ ] Loading state shows "Creating Account..."
4. [ ] Button is disabled during submission
5. [ ] Form inputs are disabled during submission
6. [ ] Success message appears
7. [ ] Form clears after success
8. [ ] Redirects to login page after 2 seconds

#### Error Scenarios (requires backend)

**Duplicate Email:**
1. Register with email that already exists
2. [ ] Error message shows: "Email already registered"
3. [ ] Form is not cleared
4. [ ] User can correct and resubmit

**Server Error:**
1. Backend returns error response
2. [ ] Error message displays appropriately
3. [ ] Form is not cleared
4. [ ] User can retry

**Network Error:**
1. Simulate network failure (DevTools → Offline)
2. Click submit
3. [ ] Error message displays
4. [ ] Form is not cleared

### UI/UX Tests

- [ ] Success message has green background and checkmark icon
- [ ] Error messages have red background and X icon
- [ ] Messages fade in smoothly with animation
- [ ] Buttons have hover effects (shadow and lift on hover)
- [ ] Buttons have click effects (pressing down)
- [ ] Links are underlined on hover
- [ ] Form layout looks good on mobile (320px width)
- [ ] Form layout looks good on tablet (768px width)
- [ ] Form layout looks good on desktop (1024px width+)

### Accessibility Tests

- [ ] Tab through form fields in order: username → email → password → confirm → button
- [ ] Form labels are associated with inputs (click label, input gets focus)
- [ ] Error messages have `role="alert"` for screen readers
- [ ] Error messages are visible and red
- [ ] Can use keyboard to submit (Tab to button, Enter)

## Testing with Mock Backend

### Using the Test Suite

The tests include comprehensive mocks of the API. To run:

```bash
npm test
```

This will test:

1. **Form Validation (37 tests)**
   - All validation rules
   - Error display and clearing
   - Field interactions

2. **Form Submission (5 tests)**
   - Correct API calls
   - Loading states
   - Prevention of duplicate submissions

3. **Success Handling (2 tests)**
   - Success message display
   - Form clearing

4. **Error Handling (3 tests)**
   - API error display
   - Network error handling
   - Error recovery

5. **Edge Cases (5 tests)**
   - Special characters in emails
   - Whitespace handling
   - Input disabling
   - Rapid submissions

6. **API Functions (15+ tests)**
   - registerUser function
   - loginUser function
   - logoutUser function
   - verifyEmail function

**Total Tests**: 70+ test cases covering all functionality

## Integration Testing

When backend is ready, test with real API:

### 1. Start Backend
```bash
cd pageturners-backend
python app.py
```

### 2. Update API URL (if needed)
Edit `src/api/auth.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### 3. Test Registration Flow
- Fill form with new email
- Submit
- Check email for verification code
- Verify email flow
- Login with new account

## Test Coverage Report

To generate coverage report:

```bash
npm test -- --coverage
```

Expected coverage:
- Statements: >95%
- Branches: >90%
- Functions: >95%
- Lines: >95%

## Common Issues & Fixes

### Issue: Validation errors not appearing
**Fix**: Ensure you clicked the submit button, don't just blur fields

### Issue: Tests timing out
**Fix**: Clear browser cache, restart dev server:
```bash
npm run dev
```

### Issue: Form not submitting
**Fix**: 
1. Check browser console for errors (F12)
2. Ensure all validation passes (no red error text)
3. Check backend is running on correct port

### Issue: CORS error when submitting
**Fix**: Add CORS to backend:
```python
from flask_cors import CORS
CORS(app)
```

### Issue: Token not being saved
**Fix**: Check localStorage is enabled in browser, verify token response has token field

## Performance Testing

To test form responsiveness:

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with form
5. Stop recording
6. Analyze: Should be no red bars (jank)

Expected performance:
- Form input response: <16ms
- Validation error appearance: <100ms
- Button disable/enable: <50ms

## Accessibility Testing

### Using Browser DevTools
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Audit → Accessibility
4. Expected score: >90

### Using Screen Reader
- Windows: NVDA (free)
- Mac: VoiceOver (built-in, Cmd+F5)
- Test: Can you navigate form and understand all content?

## Browser Testing

Test on these browsers minimum:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (Mac)
- [ ] Edge
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Deployment Checklist

Before deploying to production:
- [ ] All tests pass
- [ ] No console errors
- [ ] API endpoints verified working
- [ ] CORS configured on backend
- [ ] Environment variables set correctly
- [ ] Performance acceptable (<3s load time)
- [ ] Accessibility score >90
- [ ] Mobile responsive verified
- [ ] Password requirements documented
- [ ] Error handling verified

---

**Total Test Cases**: 70+  
**Estimated Coverage**: 95%+  
**Last Updated**: March 30, 2026
