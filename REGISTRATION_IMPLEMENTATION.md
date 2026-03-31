# PageTurners Registration System - Implementation Guide

## How to Run Frontend

### Windows (Command Prompt)
```cmd
cd pageturners-frontend
npm install
npm run dev
```

Access at http://localhost:5175


## What Has Been Completed

### Frontend - DONE
- Registration form with 4 fields (Email, Password, Confirm Password, Username)
- Client-side validation with real-time error messages
- UI with book texture background and brown theme
- Collapsible password requirements checklist with live progress tracking
- API integration via registerUser() function
- Success/error message display

## Frontend Validation Rules - ALL IMPLEMENTED
- Username: 3-20 characters, letters/numbers/underscore/hyphen only
- Email: valid format with @ and domain (any domain accepted: .com, .org, .co.uk, etc.)
  - Real-time validation: shows error as user types if @ missing or format invalid
- Password: 8+ characters with uppercase, lowercase, and number
  - Collapsible requirements checklist with real-time status updates
- Confirm Password: must match password field

### Backend - API STRUCTURE CREATED (Not Integrated)

File: `pageturners-backend/routes/auth.py`

An API endpoint structure has been created but is NOT fully functional yet. 

**IMPORTANT FOR BACKEND TEAM:**
The endpoint receives requests and validates basic input, but does NOT create users yet. 

Backend developer must integrate this with actual backend code:
1. Check if email already exists in database
2. Check if username already exists in database
3. Hash password with bcrypt
4. Create user in MongoDB
5. Send verification email
6. Return response to frontend

The endpoint currently returns placeholder success response.


## Frontend Files

- `src/pages/Register.jsx` - Registration form with real-time validation and password requirements checklist
- `src/api/auth.js` - registerUser() function that calls backend API
- `src/styles/Auth.css` - Brown theme styling with book texture background


## How It Works

1. User fills registration form with real-time validation feedback
2. Password requirements display dynamically (checklist updates as user types)
3. Email validation shows error immediately if @ missing or format invalid
4. Frontend validates all fields before sending
5. Frontend sends POST to http://localhost:5000/api/auth/register
6. Request body: {username, email, password}
7. Backend must process and respond with: {success: boolean, message: string, user_id?: string}
8. Frontend shows response message and redirects on success


## Backend API Structure

POST /api/auth/register receives:
```json
{
  "username": "string",
  "email": "string",  
  "password": "string"
}
```

Backend must return on success (status 201):
```json
{
  "success": true,
  "message": "Registration successful. Verification code sent to your email.",
  "user_id": "mongodb_user_id"
}
```

Backend must return on error (status 409 for duplicates):
```json
{
  "success": false,
  "message": "Email already registered"
}
```


## Backend Integration Checklist

For backend developer:

1. Enable CORS to allow frontend requests from http://localhost:5175
2. In POST /api/auth/register endpoint:
   - Validate all fields present (already done in structure)
   - Check email uniqueness (case-insensitive)
   - Check username uniqueness (case-insensitive)
   - Hash password with bcrypt
   - Create user in MongoDB with fields: username, email, password_hash, is_verified (false), created_at
   - Send verification email with code
   - Return 201 with user_id on success
   - Return 409 with appropriate message if email/username exists
3. Test integration with frontend at http://localhost:5175
4. Verify MongoDB contains hashed passwords


## Testing

### Frontend Tests
```bash
npm test
```

**Test Coverage:**
- Register Component tests: Form rendering, validation, submission, error handling, edge cases
- Authentication API tests: Request format verification, response handling

**Current Status:**
- ✅ All frontend tests pass
- 📝 Backend integration tests are commented out and ready to uncomment when backend is deployed
- Tests focus on validating frontend logic and API response handling

**To Enable Backend Tests:**
Once backend is fully implemented and running:
1. Uncomment the commented backend integration tests in:
   - `src/api/auth.test.js` - Backend API integration tests
   - `src/pages/Register.test.jsx` - Component API integration tests
2. Run `npm test` to verify backend integration


## Important Notes

- Confirm password is NOT sent to backend (only used for frontend validation)
- Email stored as lowercase in database for consistency
- Username stored as user typed it
- Password must be hashed, never stored plain
- Use proper HTTP status codes: 201 (success), 409 (conflict), 400 (bad request), 500 (error)
- MongoDB connection string in .env file already configured


