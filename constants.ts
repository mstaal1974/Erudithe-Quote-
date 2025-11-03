import { User } from './types';

export enum ProjectType {
  SIMPLE = "Simple Conversion",
  REDESIGN = "Creative Redesign",
  UPGRADE = "Instructional Upgrade",
}

export const COSTS_PER_PAGE: Record<ProjectType, number> = {
  [ProjectType.SIMPLE]: 15,
  [ProjectType.REDESIGN]: 30,
  [ProjectType.UPGRADE]: 50,
};

export const PAGES_PER_HOUR: Record<ProjectType, number> = {
  [ProjectType.SIMPLE]: 10,
  [ProjectType.REDESIGN]: 5,
  [ProjectType.UPGRADE]: 2,
};

// User data is now managed in Firebase.
// You can add default users in the Firebase console (Authentication tab)
// and create corresponding documents for them in a 'users' collection in Firestore.
// Example Firestore document for a user in the 'users' collection (doc ID = auth UID):
// {
//   "name": "Admin User",
//   "role": "Admin",
//   "email": "mstaal@blocksure.com.au",
//   "company": "Erudithe"
// }
