rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Messages are only accessible by the sender or conversation participant
    match /messages/{messageId} {
      // Users can only read messages they sent or that belong to their conversation
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.senderId ||
        request.auth.uid == resource.data.conversationId ||
        (resource.data.isAI == true && request.auth.uid == resource.data.conversationId)
      );
      
      // Users can only create messages as themselves
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.senderId;
      
      // Messages cannot be updated or deleted by users
      allow update, delete: if false;
    }
    
    // Subscriptions are private to each user
    match /subscriptions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}