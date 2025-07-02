-- 🔒 SIMPLIFIED Firestore Security Rules
-- Copy these rules to your Firebase Console > Firestore Database > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 🔒 SIMPLIFIED: Messages are filtered by conversationId
    match /messages/{messageId} {
      // Users can only read messages in their own conversation
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.conversationId;
      
      // Users can only create messages in their own conversation
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.conversationId;
      
      // Messages cannot be updated or deleted by users
      allow update, delete: if false;
    }
    
    // Subscriptions are private to each user
    match /subscriptions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
