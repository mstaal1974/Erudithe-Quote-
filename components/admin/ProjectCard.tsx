import React, { useState } from 'react';
import { Project, User, ProjectLog } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface ProjectCardProps {
    project: Project;
    workers: User[];
    getWorkerName: (workerId: string) => string;
    onAddLog: (projectId: string, logData: { type: 'comment'; content: string }) => void;
    onUpdateStatus: (projectId: string, newStatus: Project['status']) => void;
    onAssignWorker: (projectId: string, workerId: string) => void;
}

const LogIcon: React.FC<{ type: ProjectLog['type'] }> = ({ type }) => {
    const iconMap = {
        comment: "M2.25 12.76c0 1.6 1.12 2.92 2.62 3.44.32.11.64.18.97.24 1.64.28 3.4.43 5.16.43s3.52-.15 5.16-.43c.33-.06.65-.13.97-.24 1.5-.52 2.62-1.83 2.62-3.44 0-1.2-.6-2.25-1.5-2.85-.38-.25-.78-.45-1.2-.62C15.93 8.6 14.1 8.5 12.5 8.5s-3.43.1-5.02.84c-.42.17-.82.37-1.2.62-.9.6-1.5 1.66-1.5 2.86Z",
        hours: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .41.34.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z",
        status_change: "m16.03 4.47.97-.97a.75.75 0 0 1 1.06 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l2.47 2.47 5.97-5.97Z",
        file_upload: "M9.97 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 1 1-1.06 1.06L12 7.31V15a.75.75 0 0 1-1.5 0V7.31L9.22 8.53a.75.75 0 0 1-1.06-1.06l1.81-1.81Z M4 14.25a.75.75 0 0 1 .75.75v2c0 .41.34.75.75.75h9a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 15.25 20h-9A2.25 2.25 0 0 1 4 17.75v-2a.75.75 0 0 1 .75-.75Z",
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d={iconMap[type]} clipRule="evenodd" />
        </svg>
    )
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, workers, getWorkerName, onAddLog, onUpdateStatus, onAssignWorker }) => {
    const [comment, setComment] = useState('');
    const [isLogVisible, setIsLogVisible] = useState(false);
    
    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if(comment.trim()) {
            onAddLog(project.id, { type: 'comment', content: comment });
            setComment('');
        }
    }

    const progress = project.timeAllowance > 0 ? ((project.hoursUsed || 0) / project.timeAllowance) * 100 : 0;
    
    const statusClasses: Record<Project['status'], string> = {
        'Pending Assignment': 'bg-yellow-100 text-yellow-800',
        'In Progress': 'bg-blue-100 text-blue-800',
        'Ready for Review': 'bg-purple-100 text-purple-800',
        'Completed': 'bg-green-100 text-green-800',
        'On Hold': 'bg-stone-100 text-stone-800'
    };

    return (
        <Card>
            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div>
                    <p className="font-bold text-[#195606]">{project.projectType}</p>
                    <p className="text-sm text-stone-600">{project.userDetails.name} ({project.userDetails.company})</p>
                    <p className="text-xs text-stone-400">ID: {project.id}</p>
                </div>
                <div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[project.status]}`}>
                        {project.status}
                    </span>
                </div>
            </div>
            
            {project.aiSummary && (
                <div className="mb-4 p-3 bg-stone-50 rounded-md border border-stone-200">
                    <p className="text-xs font-semibold text-stone-500">AI Summary &amp; Analysis</p>
                    <p className="text-sm text-stone-700 italic">"{project.aiSummary}"</p>
                    {project.aiSuggestionRationale && (
                        <p className="mt-2 text-xs text-green-800 bg-green-50 p-2 rounded-md">
                            <span className="font-semibold">Rationale:</span> {project.aiSuggestionRationale}
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                    <p className="text-stone-500">Cost</p>
                    <p className="font-semibold">${project.totalCost.toFixed(2)}</p>
                </div>
                 <div>
                    <p className="text-stone-500">Pages</p>
                    <p className="font-semibold">{project.pageCount}</p>
                </div>
                <div>
                    <p className="text-stone-500">Est. Hours</p>
                    <p className="font-semibold">{project.timeAllowance}</p>
                </div>
                 <div>
                    <p className="text-stone-500">Deadline</p>
                    <p className="font-semibold">{project.deadline || 'N/A'}</p>
                </div>
            </div>
            
            {(project.status === 'In Progress' || project.status === 'Ready for Review') && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-stone-600">Progress</span>
                        <span className="text-stone-500">{project.hoursUsed?.toFixed(2) || 0} / {project.timeAllowance} hrs</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            <div className="bg-stone-50 p-3 rounded-md flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs text-stone-500">Assigned To</p>
                    {project.status === 'Pending Assignment' ? (
                        <select
                            className="text-sm p-1 border border-stone-300 rounded-md"
                            onChange={(e) => onAssignWorker(project.id, e.target.value)}
                            defaultValue=""
                        >
                            <option value="" disabled>Assign...</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    ) : (
                        <p className="font-semibold">{getWorkerName(project.assignedTo || '')}</p>
                    )}
                </div>

                {project.status === 'Ready for Review' && (
                    <Button onClick={() => onUpdateStatus(project.id, 'Completed')} className="text-xs py-1 px-2">
                        Mark as Complete
                    </Button>
                )}

                <button onClick={() => setIsLogVisible(!isLogVisible)} className="text-xs font-semibold text-stone-500 hover:text-stone-800">
                    {isLogVisible ? 'Hide Log' : `Show Log (${project.log.length})`}
                </button>
            </div>
            
            {isLogVisible && (
                <div className="mt-4 pt-4 border-t border-stone-200">
                    <h4 className="font-semibold text-sm mb-2 text-[#433e3c]">Project Log</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {project.log.slice().reverse().map(log => (
                            <div key={log.timestamp} className="flex items-start gap-2 text-sm">
                                <LogIcon type={log.type} />
                                <div>
                                    <p className="text-stone-800">{log.content}</p>
                                    <p className="text-xs text-stone-400">{log.author} - {new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handlePostComment} className="mt-4 flex gap-2">
                        <input
                            type="text"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-grow w-full px-3 py-1.5 border border-stone-300 rounded-md shadow-sm focus:ring-[#195606] focus:border-[#195606] sm:text-sm"
                        />
                        <Button type="submit" variant="secondary" className="text-xs py-1 px-3">Post</Button>
                    </form>
                </div>
            )}
        </Card>
    );
};

export default ProjectCard;