import React, { useState, useMemo, useEffect } from 'react';
import { User, Project, Quote, StoredFile, ProjectLog } from './types';
// Use Firebase v9 modular SDK for all imports for consistency.
// FIX: Changed firebase imports to use the scoped @firebase packages to resolve module loading issues.
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from '@firebase/auth';
import type { Auth } from '@firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, getDoc, query, where, setDoc, getDocs } from '@firebase/firestore';
import type { Firestore } from '@firebase/firestore';
import type { FirebaseStorage } from '@firebase/storage';

import LoginPage from './components/auth/LoginPage';
import QuoteWidget from './components/QuoteWidget';
import AdminDashboard from './components/AdminDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import ClientDashboard from './components/ClientDashboard';

type View = 'login' | 'quote';

interface AppProps {
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

const App: React.FC<AppProps> = ({ db, auth, storage }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('quote');

  useEffect(() => {
    // Listen for authentication state changes using v9 modular syntax.
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        // User is signed in, get their custom user data from Firestore
        const userDocRef = doc(db, 'users', userAuth.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setCurrentUser({ id: userAuth.uid, ...userDoc.data() } as User);
        } else {
           console.error(`Firestore document for user ${userAuth.uid} not found. Logging out.`);
           signOut(auth);
           setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db]);

  useEffect(() => {
    // Real-time listeners for data collections
    const unsubProjects = onSnapshot(collection(db, 'projects'), snapshot => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });
    const unsubQuotes = onSnapshot(collection(db, 'quotes'), snapshot => {
      setQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });

    return () => {
      unsubProjects();
      unsubQuotes();
      unsubUsers();
    };
  }, [db]);


  const handleLogin = async (email: string, password?: string) => {
    setAuthError(null);
    const isClientLogin = !password;

    try {
        const effectivePassword = isClientLogin ? 'client-default-password' : password!;
        // Use v9 modular signInWithEmailAndPassword method.
        await signInWithEmailAndPassword(auth, email, effectivePassword);
    } catch (error: any) {
        // If sign-in fails, and it was a client attempting to log in...
        if (isClientLogin && ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) {
            // Check if a project exists for this client email
            const clientProjectsQuery = query(collection(db, "projects"), where("userDetails.email", "==", email));
            const querySnapshot = await getDocs(clientProjectsQuery);

            if (!querySnapshot.empty) {
                // Project exists. This is a legitimate client. Let's create their Auth account if it doesn't exist.
                if (error.code === 'auth/user-not-found') {
                    try {
                        // Use v9 modular createUserWithEmailAndPassword method.
                        const userCredential = await createUserWithEmailAndPassword(auth, email, 'client-default-password');
                        const projectData = querySnapshot.docs[0].data();
                        const clientUserData: Omit<User, 'id'> = {
                            email: email,
                            role: 'Client',
                            name: projectData.userDetails.name,
                            company: projectData.userDetails.company,
                            phone: projectData.userDetails.phone,
                        };
                        await setDoc(doc(db, 'users', userCredential.user.uid), clientUserData);
                        // The onAuthStateChanged listener will now handle logging them in.
                    } catch (createError: any) {
                        console.error("Client account creation failed:", createError);
                        setAuthError("Failed to set up client account. Please contact support.");
                    }
                } else {
                    setAuthError("There was a problem logging in as a client. Please contact support.");
                }
            } else {
                setAuthError('No project found for this email address. Please request a quote first.');
            }
        } else {
            setAuthError('Invalid email or password.');
        }
    }
  };


  const handleLogout = () => {
    // Use v9 modular signOut method.
    signOut(auth);
    setCurrentView('login');
  };

  const handleAddQuote = async (quote: Omit<Quote, 'id' | 'createdAt' | 'status'>) => {
    try {
      await addDoc(collection(db, 'quotes'), {
        ...quote,
        createdAt: new Date().toISOString(),
        status: 'Pending',
      });
      alert('Quote submitted! You will be contacted shortly.');
      setCurrentView('login');
    } catch (error) {
      console.error("Error adding quote: ", error);
      alert("There was an error submitting your quote.");
    }
  };
  
  const handleAddLog = async (projectId: string, logData: { type: ProjectLog['type']; content: string; hoursLogged?: number }) => {
    if (!currentUser) return;
    const projectRef = doc(db, 'projects', projectId);
    
    const newLogEntry: ProjectLog = {
      timestamp: new Date().toISOString(),
      author: currentUser.name,
      authorId: currentUser.id,
      type: logData.type,
      content: logData.content,
      hoursLogged: logData.hoursLogged,
    };
    
    const projectDoc = await getDoc(projectRef);
    const currentHours = projectDoc.data()?.hoursUsed || 0;
    const newHours = currentHours + (logData.hoursLogged || 0);

    await updateDoc(projectRef, {
      log: arrayUnion(newLogEntry),
      hoursUsed: newHours
    });
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: Project['status']) => {
    if (!currentUser) return;
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    const currentStatus = projectDoc.data()?.status || 'N/A';

    const logContent = `Status changed from '${currentStatus}' to '${newStatus}'.`;
    const newLogEntry: ProjectLog = {
        timestamp: new Date().toISOString(),
        author: currentUser.name,
        authorId: currentUser.id,
        type: 'status_change',
        content: logContent,
    };

    await updateDoc(projectRef, {
      status: newStatus,
      log: arrayUnion(newLogEntry)
    });
  };

  const handleFileUpload = async (projectId: string, file: StoredFile) => {
    if (!currentUser) return;
    const projectRef = doc(db, 'projects', projectId);

    const logContent = `Uploaded file: ${file.name}`;
    const newLogEntry: ProjectLog = {
        timestamp: new Date().toISOString(),
        author: currentUser.name,
        authorId: currentUser.id,
        type: 'file_upload',
        content: logContent,
    };
    
    await updateDoc(projectRef, {
      completedFiles: arrayUnion(file),
      log: arrayUnion(newLogEntry)
    });
  };

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Worker') {
      return projects.filter(p => p.assignedTo === currentUser.id);
    }
    if (currentUser.role === 'Client') {
      return projects.filter(p => p.userDetails.email.toLowerCase() === currentUser.email.toLowerCase());
    }
    return [];
  }, [currentUser, projects]);

  const workers = useMemo(() => users.filter(u => u.role === 'Worker'), [users]);

  const renderDashboard = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case 'Admin':
        return <AdminDashboard
          db={db}
          auth={auth}
          quotes={quotes}
          projects={projects}
          workers={workers}
          users={users}
          onAddLog={handleAddLog}
          onUpdateStatus={handleUpdateProjectStatus}
        />;
      case 'Worker':
        return <WorkerDashboard 
          storage={storage}
          projects={userProjects} 
          onFileUpload={handleFileUpload}
          onAddLog={handleAddLog}
          onUpdateStatus={handleUpdateProjectStatus}
        />;
      case 'Client':
        return <ClientDashboard 
          projects={userProjects} 
          client={currentUser} 
          onAddLog={handleAddLog}
        />;
      default:
        return null;
    }
  };
  
  if (isAuthLoading) {
      return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="bg-stone-50 min-h-screen font-sans text-stone-800">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#195606]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm10.293 4.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8 10.586l5.293-5.293z" clipRule="evenodd" />
            </svg>
            <h1 className="text-2xl font-bold text-[#433e3c]">Erudithe</h1>
          </div>
          {currentUser && (
            <div className="flex items-center gap-4">
              <span className="text-sm">Welcome, {currentUser.name}</span>
              <button onClick={handleLogout} className="text-sm font-semibold text-[#195606] hover:text-green-800">Logout</button>
            </div>
          )}
        </nav>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {!currentUser ? (
          <div className="flex justify-center items-start pt-16">
            {currentView === 'login' && <LoginPage onLogin={handleLogin} error={authError} onSwitchToQuote={() => setCurrentView('quote')} />}
            {currentView === 'quote' && <QuoteWidget storage={storage} onAddQuote={handleAddQuote} onSwitchToLogin={() => setCurrentView('login')} />}
          </div>
        ) : (
          renderDashboard()
        )}
      </main>
    </div>
  );
};

export default App;