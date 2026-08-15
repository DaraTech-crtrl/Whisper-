/**
 * Helper to transform Firebase error codes and messages into user-friendly text.
 */
export function getFriendlyErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred. Please try again.";

  let code = "";
  if (typeof err === "string") {
    code = err;
  } else if (err.code) {
    code = err.code;
  } else if (err.message) {
    code = err.message;
  }

  // Parse code if formatted like "Firebase: Error (auth/invalid-credential)."
  const authMatch = code.match(/auth\/([a-zA-Z0-9_-]+)/);
  if (authMatch) {
    code = `auth/${authMatch[1]}`;
  }

  const firestoreMatch = code.match(/firestore\/([a-zA-Z0-9_-]+)/);
  if (firestoreMatch) {
    code = `firestore/${firestoreMatch[1]}`;
  }

  switch (code) {
    // Auth - Invalid Credentials / Passwords
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
      return "Incorrect email or password. Please verify your details and try again.";
    
    case "auth/user-not-found":
      return "No account exists with this email. Would you like to create one?";
    
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please sign in instead.";
    
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    
    case "auth/weak-password":
      return "Password is too weak. Please use at least 8 characters with a mix of letters and numbers.";
    
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    
    case "auth/too-many-requests":
      return "Too many failed attempts. For your security, access is temporarily paused. Please try again in a few moments.";
    
    case "auth/network-request-failed":
      return "Network connection issue. Please check your internet and try again.";
    
    case "auth/popup-blocked":
    case "auth/cancelled-popup-request":
      return "The Google popup was blocked by your browser. Please allow popups or use Email & Password.";
    
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled before completion.";
    
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please enable Email/Password or Google in your Firebase Console.";
    
    case "auth/requires-recent-login":
      return "Please log in again to confirm this sensitive action.";
    
    case "auth/expired-action-code":
      return "This password reset link has expired. Please request a new one.";
    
    case "auth/invalid-action-code":
      return "This password reset link is invalid or has already been used.";
    
    case "auth/unauthorized-domain":
      return "This domain is not authorized in your Firebase Console. Please add it under Authentication > Settings > Authorized domains.";

    case "auth/credential-already-in-use":
      return "This credential is already associated with another user account.";

    case "auth/account-exists-with-different-credential":
      return "An account already exists with the same email using a different sign-in method.";

    case "permission-denied":
    case "firestore/permission-denied":
      return "Permission denied. Please verify your account access.";

    case "unavailable":
    case "firestore/unavailable":
      return "The service is temporarily unavailable. Please try again shortly.";

    default:
      if (typeof err?.message === "string" && !err.message.includes("Firebase:") && !err.message.includes("auth/")) {
        return err.message;
      }
      return "Authentication failed. Please verify your information and try again.";
  }
}
