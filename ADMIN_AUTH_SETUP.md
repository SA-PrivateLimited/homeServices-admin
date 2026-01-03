# Admin Authentication Setup

This document explains how admin authentication works using the Firebase service account key.

## Overview

The admin authentication system uses the Firebase service account (`serviceAccountKey.json`) to verify and grant admin access. Admin users are verified through:

1. **Admin Email List**: Predefined list of authorized admin emails
2. **Firestore Role Check**: Users with `role: 'admin'` in Firestore
3. **Service Account Email**: The service account email itself has admin access

## Service Account Configuration

The service account key is located at:
```
firebase/serviceAccountKey.json
```

**Service Account Email**: `firebase-adminsdk-fbsvc@home-services-1ea69.iam.gserviceaccount.com`

## Authorized Admin Emails

The following emails have admin access (configured in `adminAuthService.ts`):

- `jobforsandeep2025@gmail.com`
- `firebase-adminsdk-fbsvc@home-services-1ea69.iam.gserviceaccount.com` (service account)

## How It Works

### 1. Admin Login Screen (`AdminLoginScreen.tsx`)

- Uses `adminAuthService.loginAsAdmin()` to verify admin access
- Checks if email is in authorized admin list
- Verifies user has `role: 'admin'` in Firestore
- Creates admin user document if needed

### 2. Google Sign-In (`LoginScreen.tsx`)

- After successful Google Sign-In, verifies admin access
- Automatically grants admin access if email is authorized
- Updates user role to 'admin' in Firestore

### 3. Admin Auth Service (`adminAuthService.ts`)

Provides the following functions:

- `verifyAdminAccess(email)`: Checks if email has admin access
- `loginAsAdmin(email, password)`: Login with admin verification
- `createAdminUser(email, password, name)`: Create new admin user
- `grantAdminAccess(email)`: Grant admin access to existing user
- `isCurrentUserAdmin()`: Check if current user is admin

## Adding New Admin Users

### Method 1: Add to Admin Email List

Edit `HomeServicesAdmin/src/services/adminAuthService.ts`:

```typescript
const ADMIN_EMAILS = [
  'jobforsandeep2025@gmail.com',
  'newadmin@example.com', // Add here
  SERVICE_ACCOUNT_EMAIL,
];
```

### Method 2: Grant Admin Access via Code

```typescript
import adminAuthService from './services/adminAuthService';

// Grant admin access to existing user
await adminAuthService.grantAdminAccess('user@example.com');
```

### Method 3: Set Role in Firestore

Manually set `role: 'admin'` in Firestore for the user document in the `users` collection.

## Security Notes

1. **Service Account Key**: Keep `serviceAccountKey.json` secure and never commit it to public repositories
2. **Admin Verification**: Always verify admin access before granting privileges
3. **Role Checks**: Multiple screens verify admin role before allowing access
4. **Email Authorization**: Only emails in the admin list can get admin access automatically

## Troubleshooting

### User Cannot Login as Admin

1. Check if email is in `ADMIN_EMAILS` list
2. Verify user has `role: 'admin'` in Firestore
3. Check Firebase Auth user exists
4. Verify service account key is valid

### Google Sign-In Not Granting Admin Access

1. Verify email is in admin list
2. Check Firestore user document exists
3. Ensure role update succeeds
4. Check console logs for errors

## Files Modified

- `src/services/adminAuthService.ts` - New admin authentication service
- `src/screens/AdminLoginScreen.tsx` - Updated to use admin auth service
- `src/screens/LoginScreen.tsx` - Updated to verify admin access for Google Sign-In

