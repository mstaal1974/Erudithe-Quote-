import React, { useState } from 'react';
import { Project, User, ProjectLog } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

interface ClientDashboardProps {
  projects: Project[];
  client: User;
  onAddLog: (projectId: string, logData: { type: 'comment'; content: string }) => void;
}

const ClientProjectCard: React.FC<{
  project: Project;
  onAddLog: (projectId: string, logData: { type: 'comment'; content: string }) => void;
}> = ({ project, onAddLog }) => {
    const [comment, setComment] = useState('');
    const [isLogVisible, setIsLogVisible] = useState(false);

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if(comment.trim()) {
            onAddLog(project.id, { type: 'comment', content: comment });
            setComment('');
        }
    }
    
    const statusClasses: Record<Project['status'], string> = {
        'Pending Assignment': 'bg-yellow-100 text-yellow-800',
        'In Progress': 'bg-blue-100 text-blue-800',
        'Ready for Review': 'bg-purple-100 text-purple-800',
        'Completed': 'bg-green-100 text-green-800',
        'On Hold': 'bg-stone-100 text-stone-800'
    };

    return (
        <Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <div className="md:col-span-2">
                <p className="font-bold text-[#195606]">{project.projectType}</p>
                <p className="text-sm text-stone-500">Pages: {project.pageCount} | Cost: ${project.totalCost.toFixed(2)}</p>
                <p className="text-xs text-stone-400">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[project.status]}`}>
                    {project.status}
                </span>
            </div>
            <div className="space-y-2 text-sm">
                <div>
                <h4 className="font-semibold mb-1">Source Files</h4>
                {project.sourceFiles.map(f => (
                    <a key={f.name} href={f.downloadURL} target="_blank" rel="noopener noreferrer" className="block text-green-800 hover:underline truncate">
                    {f.name}
                    </a>
                ))}
                </div>
                {project.completedFiles.length > 0 && (
                <div className="mt-2">
                    <h4 className="font-semibold mb-1">Completed Files</h4>
                    {project.completedFiles.map(f => (
                    <a key={f.uploadedAt} href={f.downloadURL} target="_blank" rel="noopener noreferrer" className="block text-green-800 hover:underline truncate">
                        {f.name}
                    </a>
                    ))}
                </div>
                )}
            </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200">
                 <button onClick={() => setIsLogVisible(!isLogVisible)} className="text-sm font-semibold text-stone-600 hover:text-stone-900 mb-2">
                    {isLogVisible ? 'Hide Communication Log' : `View Communication Log (${project.log.length})`}
                </button>
                {isLogVisible && (
                     <div className="mt-2">
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-3">
                            {project.log.slice().reverse().map(log => (
                                <div key={log.timestamp} className="flex items-start gap-2 text-sm">
                                    <div>
                                        <p className="text-stone-800">{log.content}</p>
                                        <p className="text-xs text-stone-400">{log.author} - {new Date(log.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handlePostComment} className="flex gap-2">
                            <input
                                type="text"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Add a comment or question..."
                                className="flex-grow w-full px-3 py-1.5 border border-stone-300 rounded-md shadow-sm focus:ring-[#195606] focus:border-[#195606] sm:text-sm"
                            />
                            <Button type="submit" variant="secondary" className="text-xs py-1 px-3">Send</Button>
                        </form>
                    </div>
                )}
            </div>
        </Card>
    );
}


const ClientDashboard: React.FC<ClientDashboardProps> = ({ projects, client, onAddLog }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-[#433e3c] mb-6">Your Projects</h2>
      {projects.length === 0 ? (
        <Card>
          <p className="text-stone-500">You have not created any projects yet. Start by creating a new quote.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map(project => (
            <ClientProjectCard key={project.id} project={project} onAddLog={onAddLog} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;