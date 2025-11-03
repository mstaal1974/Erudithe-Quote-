import React, { useState, useMemo } from 'react';
import { Project, Quote, User } from '../types';
import QuoteCard from './admin/QuoteCard';
import ProjectCard from './admin/ProjectCard';
import StatsDashboard from './admin/StatsDashboard';
import WorkerManagement from './admin/WorkerManagement';
import ProjectFilters from './admin/ProjectFilters';
import TimelineView from './TimelineView';
// Use Firebase v9 modular SDK for all imports for consistency.
// FIX: Changed firebase imports to use the scoped @firebase packages to resolve module loading issues.
import { doc, setDoc, updateDoc } from '@firebase/firestore';
import type { Firestore } from '@firebase/firestore';
import type { Auth } from '@firebase/auth';
import { addBusinessDays } from '../utils/dateUtils';

interface AdminDashboardProps {
  db: Firestore;
  auth: Auth;
  quotes: Quote[];
  projects: Project[];
  workers: User[];
  users: User[];
  onAddLog: (projectId: string, logData: { type: 'comment'; content: string }) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['status']) => void;
}

type AdminTab = 'projects' | 'quotes' | 'timeline';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ db, auth, quotes, projects, workers, users, onAddLog, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const getWorkerName = (workerId: string): string => {
    return workers.find(w => w.id === workerId)?.name || 'Unassigned';
  };

  const handleApproveQuote = async (quote: Quote) => {
    const newProjectId = `proj-${new Date().getTime()}`;
    const newProject: Project = {
      id: newProjectId,
      quoteId: quote.id,
      projectType: quote.projectType,
      pageCount: quote.pageCount,
      totalCost: quote.totalCost,
      timeAllowance: quote.timeAllowance,
      createdAt: new Date().toISOString(),
      userDetails: quote.userDetails,
      sourceFiles: quote.sourceFiles,
      completedFiles: [],
      status: 'Pending Assignment',
      log: [],
      aiSummary: quote.aiSummary,
      aiSuggestionRationale: quote.aiSuggestionRationale,
    };
    
    // Create the new project and update the quote status
    const projectRef = doc(db, 'projects', newProjectId);
    await setDoc(projectRef, newProject);

    const quoteRef = doc(db, 'quotes', quote.id);
    await updateDoc(quoteRef, { status: 'Approved' });
  };

  const handleRejectQuote = async (quoteId: string) => {
    const quoteRef = doc(db, 'quotes', quoteId);
    await updateDoc(quoteRef, { status: 'Rejected' });
  };

  const handleAssignWorker = async (projectId: string, workerId: string) => {
    const projectRef = doc(db, 'projects', projectId);
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const workDays = Math.ceil(project.timeAllowance / 8); // 8-hour work day
    const deadline = addBusinessDays(new Date(), workDays);
    
    const logContent = `Project assigned to ${getWorkerName(workerId)}. Status changed to 'In Progress'.`;
    const newLogEntry: any = {
        timestamp: new Date().toISOString(),
        author: 'System',
        authorId: 'system',
        type: 'status_change',
        content: logContent,
    };

    await updateDoc(projectRef, {
        assignedTo: workerId,
        status: 'In Progress',
        deadline: deadline.toISOString().split('T')[0],
        log: [...project.log, newLogEntry]
    });
  };
  
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          p.userDetails.name.toLowerCase().includes(searchLower) ||
          p.userDetails.company.toLowerCase().includes(searchLower) ||
          p.id.toLowerCase().includes(searchLower);
        
        const status = statusFilter === 'Pending' ? 'Pending Assignment' : statusFilter;
        const matchesStatus = status === 'All' || p.status === status;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projects, searchTerm, statusFilter]);

  const pendingQuotes = useMemo(() => quotes.filter(q => q.status === 'Pending'), [quotes]);

  return (
    <div className="space-y-8">
      <StatsDashboard projects={projects} workers={workers} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex border-b border-stone-200">
                    <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'projects' ? 'border-b-2 border-[#195606] text-[#195606]' : 'text-stone-500'}`}>Projects ({filteredProjects.length})</button>
                    <button onClick={() => setActiveTab('quotes')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'quotes' ? 'border-b-2 border-[#195606] text-[#195606]' : 'text-stone-500'}`}>New Quotes ({pendingQuotes.length})</button>
                    <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'timeline' ? 'border-b-2 border-[#195606] text-[#195606]' : 'text-stone-500'}`}>Timeline</button>
                </div>
            </div>

            {activeTab === 'projects' && (
              <div className="space-y-4">
                <ProjectFilters 
                  searchTerm={searchTerm} 
                  setSearchTerm={setSearchTerm} 
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
                {filteredProjects.map(p => (
                  <ProjectCard 
                    key={p.id} 
                    project={p} 
                    workers={workers} 
                    getWorkerName={getWorkerName}
                    onAddLog={onAddLog}
                    onUpdateStatus={onUpdateStatus}
                    onAssignWorker={handleAssignWorker}
                  />
                ))}
                {filteredProjects.length === 0 && <p className="text-center text-stone-500 py-8">No projects match the current filters.</p>}
              </div>
            )}

            {activeTab === 'quotes' && (
              <div className="space-y-4">
                {pendingQuotes.map(q => (
                  <QuoteCard key={q.id} quote={q} onApprove={handleApproveQuote} onReject={handleRejectQuote} />
                ))}
                {pendingQuotes.length === 0 && <p className="text-center text-stone-500 py-8">No new quotes to review.</p>}
              </div>
            )}

             {activeTab === 'timeline' && <TimelineView projects={projects} />}
        </div>
        <div className="space-y-6">
            <WorkerManagement db={db} auth={auth} workers={workers} projects={projects} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;