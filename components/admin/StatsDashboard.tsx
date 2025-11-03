import React, { useMemo } from 'react';
import { Project, User } from '../../types';
import Card from '../ui/Card';

interface StatsDashboardProps {
  projects: Project[];
  workers: User[];
}

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <Card className="text-center">
        <p className="text-sm text-stone-500">{title}</p>
        <p className="text-2xl font-bold text-[#195606]">{value}</p>
    </Card>
);

const StatsDashboard: React.FC<StatsDashboardProps> = ({ projects, workers }) => {
    const stats = useMemo(() => {
        const totalProjects = projects.length;
        if (totalProjects === 0) {
            return { avgPages: 0, completionRate: 0, utilizationRate: 0 };
        }

        const avgPages = projects.reduce((acc, p) => acc + p.pageCount, 0) / totalProjects;
        
        const completedProjects = projects.filter(p => p.status === 'Completed').length;
        const completionRate = (completedProjects / totalProjects) * 100;

        const totalInProgressHours = projects
            .filter(p => p.status === 'In Progress')
            .reduce((acc, p) => acc + p.timeAllowance, 0);

        const totalWorkerCapacity = workers.reduce((acc, w) => acc + (w.weeklyCapacity || 0), 0);
        const utilizationRate = totalWorkerCapacity > 0 ? (totalInProgressHours / totalWorkerCapacity) * 100 : 0;
        
        return {
            avgPages,
            completionRate,
            utilizationRate
        };

    }, [projects, workers]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Avg. Pages / Project" value={stats.avgPages.toFixed(1)} />
        <StatCard title="Completion Rate" value={`${stats.completionRate.toFixed(0)}%`} />
        <StatCard title="Team Utilization" value={`${stats.utilizationRate.toFixed(0)}%`} />
    </div>
  );
};

export default StatsDashboard;
