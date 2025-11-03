import { ProjectType } from './constants';

export interface StoredFile {
  name: string;
  downloadURL: string; // URL from Firebase Cloud Storage
  uploadedAt: string; // ISO string
}

export interface User {
  id: string; // This will be the Firebase Auth UID
  email: string;
  // passwordHash is no longer needed, Firebase handles it
  role: 'Admin' | 'Worker' | 'Client';
  name: string;
  company?: string;
  phone?: string;
  weeklyCapacity?: number; // Only for workers
}

export interface Quote {
    id: string;
    projectType: ProjectType;
    pageCount: number;
    totalCost: number;
    timeAllowance: number;
    createdAt: string; // ISO string
    userDetails: {
        name: string;
        email: string;
        company: string;
        phone: string;
    };
    sourceFiles: StoredFile[];
    status: 'Pending' | 'Approved' | 'Rejected';
    aiSummary?: string;
    aiSuggestionRationale?: string;
}

export interface ProjectLog {
  timestamp: string; // ISO string
  author: string; // name of the user
  authorId: string; // user id
  content: string; 
  type: 'comment' | 'hours' | 'status_change' | 'file_upload';
  hoursLogged?: number; // Only for 'hours' type
}

export interface Project {
  id: string;
  quoteId: string;
  projectType: ProjectType;
  pageCount: number;
  totalCost: number;
  timeAllowance: number; // in hours
  createdAt: string; // ISO string
  userDetails: {
    name: string;
    email: string;
    company: string;
    phone: string;
  };
  sourceFiles: StoredFile[];
  completedFiles: StoredFile[];
  status: 'Pending Assignment' | 'In Progress' | 'Ready for Review' | 'Completed' | 'On Hold';
  assignedTo?: string; // worker's user id
  deadline?: string; // ISO string date only
  hoursUsed?: number;
  log: ProjectLog[];
  aiSummary?: string;
  aiSuggestionRationale?: string;
}