-- Firebase Storage Security Rules
-- Copy these rules to your Firebase Console > Storage > Rules

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Voice notes can only be uploaded by the user who owns the folder
    match /voice_notes/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
