# TwitterX API Examples

This document provides comprehensive examples for using the TwitterX API endpoints.

## Authentication

### 1. User Registration

**Endpoint:** `POST /v1/auth/signup`

**Request:**
```json
{
  "username": "john_doe123",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "displayName": "John Doe",
  "birthDate": "1990-01-15"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "clx1234567890abcdef",
    "username": "john_doe123",
    "email": "john.doe@example.com",
    "displayName": "John Doe",
    "bio": null,
    "location": null,
    "websiteUrl": null,
    "profilePicturePath": null,
    "headerImagePath": null,
    "emailVerified": false,
    "isVerified": false,
    "isPrivate": false,
    "followerCount": 0,
    "followingCount": 0,
    "tweetCount": 0,
    "createdAt": "2024-08-13T14:22:00Z",
    "updatedAt": "2024-08-13T14:22:00Z"
  },
  "requiresEmailVerification": true
}
```

### 2. User Sign In

**Endpoint:** `POST /v1/auth/signin`

**Request:**
```json
{
  "emailOrUsername": "john_doe123",
  "password": "SecurePassword123!",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sign in successful",
  "user": {
    "id": "clx1234567890abcdef",
    "username": "john_doe123",
    "email": "john.doe@example.com",
    "displayName": "John Doe",
    "emailVerified": true,
    "isVerified": false,
    "isPrivate": false,
    "followerCount": 150,
    "followingCount": 75,
    "tweetCount": 42,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-08-13T14:22:00Z"
  },
  "sessionToken": "sess_clx1234567890abcdef",
  "expiresAt": "2024-09-13T14:22:00Z"
}
```

### 3. Google OAuth

**Step 1 - Initiate OAuth:** `GET /v1/auth/google?state=optional_csrf_token`

**Response (302):** Redirects to Google OAuth authorization URL

**Step 2 - OAuth Callback:** `GET /v1/auth/callback/google?code=auth_code&state=csrf_token`

**Response (200):**
```json
{
  "success": true,
  "message": "Google OAuth authentication successful",
  "user": {
    "id": "clx1234567890abcdef",
    "username": "johndoe_google",
    "email": "john.doe@gmail.com",
    "displayName": "John Doe",
    "emailVerified": true,
    "isVerified": false,
    "isPrivate": false,
    "followerCount": 0,
    "followingCount": 0,
    "tweetCount": 0,
    "createdAt": "2024-08-13T14:22:00Z",
    "updatedAt": "2024-08-13T14:22:00Z"
  },
  "sessionToken": "sess_clx1234567890abcdef",
  "expiresAt": "2024-09-13T14:22:00Z",
  "provider": "google"
}
```

### 4. Password Reset

**Step 1 - Request Reset:** `POST /v1/auth/password/reset/request`

**Request:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent."
}
```

**Step 2 - Reset Password:** `POST /v1/auth/password/reset`

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful. Please sign in with your new password."
}
```

### 5. Email Verification

**Verify Email:** `POST /v1/auth/email/verify`

**Request:**
```json
{
  "token": "verification_token_from_email"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully."
}
```

**Resend Verification:** `POST /v1/auth/email/resend-verification`

**Request:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If the email exists and is unverified, a verification email has been sent."
}
```

### 6. Sign Out

**Sign Out Current Session:** `POST /v1/auth/signout`

**Headers:**
```
Authorization: Bearer sess_clx1234567890abcdef
```

**Request:**
```json
{
  "signOutAll": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully signed out"
}
```

## User Management

### 1. Get User Profile

**Endpoint:** `GET /v1/users/profile`

**Headers:**
```
Authorization: Bearer sess_clx1234567890abcdef
```

**Response (200):**
```json
{
  "id": "clx1234567890abcdef",
  "username": "john_doe123",
  "usernameLower": "john_doe123",
  "email": "john.doe@example.com",
  "emailLower": "john.doe@example.com",
  "displayName": "John Doe",
  "bio": "Software developer passionate about technology.",
  "location": "San Francisco, CA",
  "websiteUrl": "https://johndoe.dev",
  "profilePicturePath": "/uploads/profiles/user123.jpg",
  "headerImagePath": "/uploads/headers/user123.jpg",
  "birthDate": "1990-01-15",
  "followerCount": 150,
  "followingCount": 75,
  "tweetCount": 42,
  "isVerified": false,
  "isPrivate": false,
  "isSuspended": false,
  "suspensionReason": null,
  "emailVerified": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-08-13T14:22:00Z"
}
```

### 2. Update User Profile

**Endpoint:** `PUT /v1/users/profile`

**Headers:**
```
Authorization: Bearer sess_clx1234567890abcdef
```

**Request:**
```json
{
  "displayName": "John Doe Jr.",
  "bio": "Senior software developer passionate about technology and innovation.",
  "location": "New York, NY",
  "websiteUrl": "https://johndoe.dev"
}
```

**Response (200):**
```json
{
  "id": "clx1234567890abcdef",
  "username": "john_doe123",
  "displayName": "John Doe Jr.",
  "bio": "Senior software developer passionate about technology and innovation.",
  "location": "New York, NY",
  "websiteUrl": "https://johndoe.dev",
  "updatedAt": "2024-08-13T15:30:00Z"
}
```

### 3. Change Username

**Endpoint:** `PUT /v1/users/username`

**Headers:**
```
Authorization: Bearer sess_clx1234567890abcdef
```

**Request:**
```json
{
  "username": "john_doe_2024"
}
```

**Response (200):**
```json
{
  "id": "clx1234567890abcdef",
  "username": "john_doe_2024",
  "usernameLower": "john_doe_2024",
  "updatedAt": "2024-08-13T15:30:00Z"
}
```

### 4. Session Management

**List Active Sessions:** `GET /v1/users/sessions`

**Headers:**
```
Authorization: Bearer sess_clx1234567890abcdef
```

**Response (200):**
```json
[
  {
    "sessionId": "clx1234567890abcdef",
    "deviceInfo": "Desktop",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "createdAt": "2024-08-13T14:22:00Z",
    "lastUsedAt": "2024-08-13T15:30:00Z",
    "expiresAt": "2024-09-13T14:22:00Z",
    "isActive": true,
    "isCurrent": true
  },
  {
    "sessionId": "clx0987654321fedcba",
    "deviceInfo": "Mobile Device",
    "ipAddress": "192.168.1.101",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...",
    "createdAt": "2024-08-12T10:15:00Z",
    "lastUsedAt": "2024-08-12T18:45:00Z",
    "expiresAt": "2024-11-12T10:15:00Z",
    "isActive": true,
    "isCurrent": false
  }
]
```

**Revoke Specific Session:** `DELETE /v1/users/sessions/{sessionId}`

**Headers:**
```
Authorization: Bearer sess_clx1234567890abcdef
```

**Response (204):** No content

**Revoke All Other Sessions:** `DELETE /v1/users/sessions`

**Headers:**
```
Authorization: Bearer sess_clx1234567890abcdef
```

**Response (204):** No content

### 5. Account Deactivation

**Endpoint:** `DELETE /v1/users/account`

**Headers:**
```
Authorization: Bearer sess_clx1234567890abcdef
```

**Response (204):** No content

## Admin Endpoints

### 1. User Moderation

**Moderate User:** `POST /v1/users/admin/moderate/{userId}`

**Headers:**
```
Authorization: Bearer admin_session_token
```

**Request:**
```json
{
  "action": "suspend",
  "reason": "Violation of community guidelines"
}
```

**Response (200):**
```json
{
  "id": "clx1234567890abcdef",
  "username": "john_doe123",
  "isSuspended": true,
  "suspensionReason": "Violation of community guidelines",
  "isVerified": false,
  "isShadowBanned": false,
  "shadowBanReason": null,
  "updatedAt": "2024-08-13T15:30:00Z"
}
```

### 2. Get Moderation Status

**Endpoint:** `GET /v1/users/admin/moderation-status/{userId}`

**Headers:**
```
Authorization: Bearer admin_session_token
```

**Response (200):**
```json
{
  "isSuspended": true,
  "suspensionReason": "Violation of community guidelines",
  "isVerified": false,
  "isShadowBanned": false,
  "shadowBanReason": null,
  "suspiciousActivityCount": 3,
  "lastSuspiciousActivity": "2024-08-13T12:00:00Z",
  "failedLoginAttempts": 0,
  "lockedUntil": null
}
```

### 3. Report Suspicious Activity

**Endpoint:** `POST /v1/users/admin/report-suspicious/{userId}`

**Headers:**
```
Authorization: Bearer admin_session_token
```

**Request:**
```json
{
  "activityType": "rapid_following",
  "details": "User followed 100+ accounts in 5 minutes",
  "autoRestrict": false
}
```

**Response (204):** No content

## Health Check

**Endpoint:** `GET /healthz`

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-08-13T15:30:00Z",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

## Error Responses

### Common Error Formats

**Validation Error (400):**
```json
{
  "statusCode": 400,
  "message": [
    "Username must be between 3 and 15 characters",
    "Please provide a valid email address"
  ],
  "error": "Bad Request",
  "timestamp": "2024-08-13T15:30:00Z",
  "path": "/v1/auth/signup"
}
```

**Username Unavailable (409):**
```json
{
  "statusCode": 409,
  "message": "Username 'john_doe123' is not available",
  "error": "Conflict",
  "timestamp": "2024-08-13T15:30:00Z",
  "path": "/v1/auth/signup",
  "code": "USERNAME_UNAVAILABLE",
  "suggestions": ["john_doe124", "john_doe_2024", "johndoe123"]
}
```

**Rate Limit Exceeded (429):**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "error": "Too Many Requests",
  "timestamp": "2024-08-13T15:30:00Z",
  "path": "/v1/auth/signin",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600
}
```

**Account Suspended (403):**
```json
{
  "statusCode": 403,
  "message": "Account has been suspended",
  "error": "Forbidden",
  "timestamp": "2024-08-13T15:30:00Z",
  "path": "/v1/auth/signin",
  "code": "ACCOUNT_SUSPENDED",
  "reason": "Violation of community guidelines"
}
```

## Authentication Schemes

### Session Token Authentication

Most endpoints require session token authentication:

```
Authorization: Bearer sess_clx1234567890abcdef
```

### OAuth2 (Google)

For Google OAuth endpoints, the flow involves:

1. Redirect user to `/v1/auth/google`
2. User authorizes with Google
3. Google redirects to `/v1/auth/callback/google` with authorization code
4. Server exchanges code for tokens and creates user session

## Rate Limiting

Different endpoints have different rate limits:

- **Signup:** 10 attempts per hour per IP
- **Login:** 20 attempts per hour per IP
- **Password Reset Request:** 5 attempts per hour per IP
- **Email Verification Resend:** 3 attempts per hour per IP
- **OAuth:** 10 attempts per hour per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)
