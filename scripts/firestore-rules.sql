-- Firestore Security Rules
-- Copy these rules to your Firebase Console > Firestore Database > Rules

-- rules_version = '2';
-- service cloud.firestore {
--   match /databases/{database}/documents {
--     // Users can only read/write their own user document
--     match /users/{userId} {
--       allow read, write: if request.auth != null && request.auth.uid == userId;
--     }
    
--     // Messages are readable by all authenticated users
--     // but can only be created by authenticated users
--     match /messages/{messageId} {
--       allow read: if request.auth != null;
--       allow create: if request.auth != null 
--         && request.auth.uid == resource.data.senderId;
--       allow update, delete: if false; // Messages cannot be updated or deleted
--     }
--   }
-- }


// Temporary rule for testing - make it more restrictive later
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}