import React, { useState } from 'react';
import { Project, ProjectLog, StoredFile } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
// FIX: Separate Firebase value and type imports.
// FIX: Changed firebase imports to use the scoped @firebase packages to resolve module loading issues.
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import type { FirebaseStorage } from '@firebase/storage';

interface WorkerDashboardProps {
  storage: FirebaseStorage;
  projects: Project[];
  onFileUpload: (projectId: string, file: StoredFile) => void;
  onAddLog: (projectId: string, logData: { type: ProjectLog['type']; content: string; hoursLogged?: number }) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['status']) => void;
}

const fileToStoredFile = async (file: File, storage: FirebaseStorage): Promise<StoredFile> => {
    const storageRef = ref(storage, `completed-files/${Date.now()}-${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return {
        name: file.name,
        downloadURL: downloadURL,
        uploadedAt: new Date().toISOString(),
    };
};

const WorkerProjectCard: React.FC<{ 
    storage: FirebaseStorage;
    project: Project, 
    onFileUpload: (projectId: string, file: StoredFile) => void;
    onAddLog: (projectId: string, logData: { type: ProjectLog['type']; content: string; hoursLogged?: number }) => void;
    onUpdateStatus: (projectId: string, newStatus: Project['status']) => void;
}> = ({ storage, project, onFileUpload, onAddLog, onUpdateStatus }) => {
    const [minutesToLog, setMinutesToLog] = useState(0);
    const [comment, setComment] = useState('');
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, projectId: string) => {
        if (e.target.files && e.target.files[0]) {
          const file = await fileToStoredFile(e.target.files[0], storage);
          onFileUpload(projectId, file);
        }
    };
    
    const handleLogTime = (e: React.FormEvent) => {
        e.preventDefault();
        if(minutesToLog > 0) {
            const hours = minutesToLog / 60;
            const content = `Logged ${minutesToLog} minutes (${hours.toFixed(2)} hours).`;
            onAddLog(project.id, { type: 'hours', content, hoursLogged: hours });
            setMinutesToLog(0);
        }
    }
    
    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if(comment.trim()) {
            onAddLog(project.id, { type: 'comment', content: comment });
            setComment('');
        }
    }

    const progress = project.timeAllowance > 0 ? ((project.hoursUsed || 0) / project.timeAllowance) * 100 : 0;

    return (
        <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Project Info */}
                <div className="md:col-span-1 space-y-3">
                    <div>
                        <p className="font-bold text-lg text-[#195606]">{project.projectType}</p>
                        <p className="text-sm text-stone-500">Client: {project.userDetails.name}</p>
                        <p className="text-sm text-stone-500">Pages: {project.pageCount} | Est. Hours: {project.timeAllowance}</p>
                        {project.deadline && <p className="text-sm font-semibold text-red-600">Deadline: {new Date(project.deadline + 'T00:00:00').toLocaleDateString()}</p>}
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Source Files</h4>
                        {project.sourceFiles.map(f => (
                            <a key={f.name} href={f.downloadURL} target="_blank" rel="noopener noreferrer" className="block text-sm text-green-800 hover:underline">
                                {f.name}
                            </a>
                        ))}
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Progress</h4>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-stone-500">{project.hoursUsed?.toFixed(2) || 0} / {project.timeAllowance} hrs</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Middle Column: Actions */}
                <div className="md:col-span-1 space-y-4">
                    <form onSubmit={handleLogTime} className="space-y-2 bg-stone-50 p-3 rounded-md">
                        <label htmlFor={`log-time-${project.id}`} className="block text-sm font-semibold text-[#433e3c]">Log Time</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number"
                                id={`log-time-${project.id}`}
                                value={minutesToLog}
                                onChange={(e) => setMinutesToLog(parseInt(e.target.value, 10) || 0)}
                                step="10"
                                min="0"
                                className="w-24 px-2 py-1 border border-stone-300 rounded-md shadow-sm sm:text-sm"
                            />
                            <span className="text-sm text-stone-500">minutes</span>
                            <Button type="submit" className="text-xs py-1 px-2" disabled={minutesToLog <= 0}>Log</Button>
                        </div>
                    </form>
                    
                    <div className="space-y-2">
                        <label htmlFor={`upload-${project.id}`} className="w-full text-center cursor-pointer text-sm text-white bg-[#433e3c] hover:bg-stone-800 px-3 py-1.5 rounded-md inline-block">
                             Upload Completed File
                         </label>
                         <input type="file" id={`upload-${project.id}`} className="hidden" onChange={(e) => handleFileUpload(e, project.id)} />
                    </div>

                    {project.status === 'In Progress' && (
                        <Button onClick={() => onUpdateStatus(project.id, 'Ready for Review')} className="w-full">
                            Mark as Ready for Review
                        </Button>
                    )}
                     {project.status === 'Ready for Review' && (
                        <p className="text-center text-sm text-purple-700 bg-purple-100 p-2 rounded-md">Project submitted for review.</p>
                     )}
                </div>

                {/* Right Column: Log */}
                <div className="md:col-span-1">
                     <h4 className="font-semibold text-sm mb-2 text-[#433e3c]">Project Log</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border-l-2 border-stone-100 pl-3">
                        {project.log.slice().reverse().map(log => (
                            <div key={log.timestamp} className="text-sm">
                                <p className="text-stone-800">{log.content}</p>
                                <p className="text-xs text-stone-400">{log.author} - {new Date(log.timestamp).toLocaleTimeString()}</p>
                            </div>
                        ))}
                    </div>
                     <form onSubmit={handlePostComment} className="mt-2 flex gap-2">
                        <input
                            type="text"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-grow w-full px-3 py-1.5 border border-stone-300 rounded-md shadow-sm sm:text-sm"
                        />
                        <Button type="submit" variant="secondary" className="text-xs py-1 px-3">Post</Button>
                    </form>
                </div>
            </div>
        </Card>
    )
}

const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ storage, projects, onFileUpload, onAddLog, onUpdateStatus }) => {
  return (
     <div>
      <h2 className="text-3xl font-bold text-[#433e3c] mb-6">Your Assigned Projects</h2>
      {projects.length === 0 ? (
        <Card><p className="text-stone-500">You have no projects assigned to you.</p></Card>
      ) : (
        <div className="space-y-6">
          {projects.map(p => (
            <WorkerProjectCard 
                key={p.id}
                storage={storage}
                project={p}
                onFileUpload={onFileUpload}
                onAddLog={onAddLog}
                onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;