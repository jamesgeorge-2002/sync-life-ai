# Firestore Security Rules

To allow your web application to read and write your dashboard data (tasks, notes, health metrics, habits, etc.) correctly, you must update your Firestore security rules in the Firebase Console.

## Steps to Apply:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **lifesync-ai-7a745**.
3. In the left sidebar, click **Firestore Database**.
4. Go to the **Rules** tab.
5. Replace the existing rules with the following rules:
6. Click **Publish**.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own profile and all subcollections
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```
