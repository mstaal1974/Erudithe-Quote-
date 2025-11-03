import React from 'react';

interface ProjectFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter }) => {
    const statuses = ['All', 'Pending', 'In Progress', 'Completed', 'On Hold'];
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <input
                type="text"
                placeholder="Search by client, company, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[#195606] focus:border-[#195606] sm:text-sm"
            />
            <div className="flex items-center gap-2">
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[#195606] focus:border-[#195606] sm:text-sm"
                >
                    {statuses.map(status => (
                        <option key={status} value={status}>{status === 'Pending' ? 'Pending Assignment' : status}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default ProjectFilters;
