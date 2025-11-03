import React, { useMemo } from 'react';
import { Project } from '../types';
import { subtractBusinessDays, getDaysBetween } from '../utils/dateUtils';
import Card from './ui/Card';

interface TimelineViewProps {
  projects: Project[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TimelineView: React.FC<TimelineViewProps> = ({ projects }) => {
  const scheduledProjects = useMemo(() => {
    return projects
      .filter(p => p.deadline && p.status !== 'Pending Assignment')
      .map(p => {
        const deadline = new Date(p.deadline + 'T00:00:00'); // Ensure date is parsed correctly without timezone issues
        const workDays = Math.ceil(p.timeAllowance / 8);
        const startDate = subtractBusinessDays(new Date(deadline), workDays); // use a copy
        return { ...p, startDate, deadline };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [projects]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (scheduledProjects.length === 0) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { minDate: firstDayOfMonth, maxDate: lastDayOfMonth, totalDays: getDaysBetween(firstDayOfMonth, lastDayOfMonth) + 1 };
    }

    let min = new Date(scheduledProjects[0].startDate);
    let max = new Date(scheduledProjects[0].deadline);

    scheduledProjects.forEach(p => {
      if (p.startDate < min) min = p.startDate;
      if (p.deadline > max) max = p.deadline;
    });

    const minDate = new Date(min);
    minDate.setDate(minDate.getDate() - 7); // 1 week padding before
    const maxDate = new Date(max);
    maxDate.setDate(maxDate.getDate() + 7); // 1 week padding after

    return { minDate, maxDate, totalDays: getDaysBetween(minDate, maxDate) + 1 };
  }, [scheduledProjects]);
  
  const dateHeaders = useMemo(() => {
    const dates = [];
    let currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [minDate, maxDate]);

  const monthHeaders = useMemo(() => {
    const months: { name: string; year: number; colSpan: number }[] = [];
    if (dateHeaders.length === 0) return months;

    let currentMonth = dateHeaders[0].getMonth();
    let currentYear = dateHeaders[0].getFullYear();
    let colSpan = 0;

    dateHeaders.forEach(date => {
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        colSpan++;
      } else {
        months.push({ name: `${MONTH_NAMES[currentMonth]}`, year: currentYear, colSpan });
        currentMonth = date.getMonth();
        currentYear = date.getFullYear();
        colSpan = 1;
      }
    });
    months.push({ name: `${MONTH_NAMES[currentMonth]}`, year: currentYear, colSpan });

    return months;
  }, [dateHeaders]);
  
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-500 hover:bg-blue-600';
      case 'Completed': return 'bg-green-500 hover:bg-green-600';
      case 'On Hold': return 'bg-stone-400 hover:bg-stone-500';
      default: return 'bg-gray-400';
    }
  };

  if (scheduledProjects.length === 0) {
    return (
      <Card>
        <h2 className="text-2xl font-bold mb-4 text-[#433e3c]">Project Timeline</h2>
        <p className="text-stone-500 text-center py-8">No scheduled projects to display. Assign projects and set deadlines to see them here.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-4 text-[#433e3c]">Project Timeline</h2>
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: `${totalDays * 40}px` }}>
          {/* Timeline Header */}
          <div className="sticky top-0 bg-white z-10">
              {/* Month headers */}
              <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}>
                  {monthHeaders.map((month, i) => (
                      <div key={`${month.name}-${month.year}-${i}`} className="text-center font-semibold text-sm py-1 border-b border-r border-stone-200" style={{ gridColumn: `span ${month.colSpan} / span ${month.colSpan}` }}>
                          {month.name} {month.year}
                      </div>
                  ))}
              </div>
              {/* Day headers */}
              <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}>
                  {dateHeaders.map(date => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const isToday = date.toDateString() === new Date().toDateString();
                      return (
                          <div key={date.toISOString()} className={`text-center text-xs py-1 border-b border-r border-stone-200 ${isWeekend ? 'bg-stone-100' : ''}`}>
                              <span className={`w-6 h-6 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-[#195606] text-white font-bold' : ''}`}>{date.getDate()}</span>
                          </div>
                      )
                  })}
              </div>
          </div>

          {/* Timeline Body */}
          <div className="relative pt-2">
            {/* Grid lines */}
            <div className="absolute inset-0 grid h-full" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}>
                {dateHeaders.map((date, i) => (
                    <div key={i} className="border-r border-stone-100 h-full"></div>
                ))}
            </div>

            {/* Project Bars */}
            <div className="relative">
              {scheduledProjects.map((p, index) => {
                const leftOffsetDays = getDaysBetween(minDate, p.startDate);
                const durationDays = getDaysBetween(p.startDate, p.deadline) + 1;
                
                if (leftOffsetDays < 0 || durationDays <= 0) return null; // Don't render if outside the range
                
                const barStyle = {
                  left: `${(leftOffsetDays / totalDays) * 100}%`,
                  width: `${(durationDays / totalDays) * 100}%`,
                  top: `${index * 2.5}rem`, // Stagger rows
                };

                return (
                  <div
                    key={p.id}
                    className="absolute h-8 group"
                    style={barStyle}
                  >
                    <div className={`h-full w-full rounded-md text-white text-xs px-2 flex items-center truncate cursor-pointer transition-all duration-200 ${getStatusColor(p.status)}`}>
                        {p.projectType} - {p.userDetails.company}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 w-64 bg-stone-800 text-white text-xs rounded-md p-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none transform -translate-x-1/2 left-1/2">
                        <p className="font-bold">{p.projectType}</p>
                        <p>{p.userDetails.name} ({p.userDetails.company})</p>
                        <p className="text-stone-300 mt-1 pt-1 border-t border-stone-600">
                            {p.startDate.toLocaleDateString()} - {p.deadline.toLocaleDateString()}
                        </p>
                        <p className="text-stone-300">{durationDays} days</p>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-stone-800"></div>
                    </div>
                  </div>
                );
              })}
              {/* Add placeholder height to container to make it scrollable */}
              <div style={{ height: `${scheduledProjects.length * 2.5 + 1}rem` }}></div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TimelineView;
