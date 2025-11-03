import React, { useState, useMemo } from 'react';
import { Project, User } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
// Use Firebase v9 modular SDK for all imports for consistency.
// FIX: Changed firebase imports to use the scoped @firebase packages to resolve module loading issues.
import { createUserWithEmailAndPassword } from '@firebase/auth';
import type { Auth } from '@firebase/auth';
import { doc, setDoc } from '@firebase/firestore';
import type { Firestore } from '@firebase/firestore';


interface WorkerManagementProps {
  db: Firestore;
  auth: Auth;
  workers: User[];
  projects: Project[];
}

const WorkerManagement: React.FC<WorkerManagementProps> = ({ db, auth, workers, projects }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newWorker, setNewWorker] = useState({ name: '', email: '', weeklyCapacity: '40', password: 'password123' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const workerLoads = useMemo(() => {
        const loads = new Map<string, number>();
        workers.forEach(w => loads.set(w.id, 0));
        projects.forEach(p => {
            if (p.assignedTo && p.status === 'In Progress') {
                const currentLoad = loads.get(p.assignedTo) || 0;
                loads.set(p.assignedTo, currentLoad + p.timeAllowance);
            }
        });
        return loads;
    }, [workers, projects]);
    
    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            // Use v9 modular createUserWithEmailAndPassword method.
            const userCredential = await createUserWithEmailAndPassword(auth, newWorker.email, newWorker.password);
            const user = userCredential.user;

            const workerData = {
                name: newWorker.name,
                email: newWorker.email,
                role: 'Worker',
                company: 'Erudithe',
                phone: '',
                weeklyCapacity: parseInt(newWorker.weeklyCapacity, 10) || 40,
            };
            
            // Create a document in the 'users' collection with the UID as the ID
            await setDoc(doc(db, "users", user.uid), workerData);

            setNewWorker({ name: '', email: '', weeklyCapacity: '40', password: 'password123' });
            setIsModalOpen(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getCapacityColor = (percentage: number) => {
        if (percentage > 90) return 'bg-red-500';
        if (percentage > 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-[#433e3c]">Worker Capacity</h3>
                <Button onClick={() => setIsModalOpen(true)} className="py-1 px-3 text-sm">Add Worker</Button>
            </div>
            <div className="space-y-3">
                {workers.map(worker => {
                    const load = workerLoads.get(worker.id) || 0;
                    const capacity = worker.weeklyCapacity || 0;
                    const percentage = capacity > 0 ? (load / capacity) * 100 : 0;
                    return (
                        <div key={worker.id}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold">{worker.name}</span>
                                <span className="text-stone-500">{load} / {capacity} hrs</span>
                            </div>
                            <div className="w-full bg-stone-200 rounded-full h-2.5">
                                <div 
                                    className={`h-2.5 rounded-full ${getCapacityColor(percentage)}`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h2 className="text-xl font-bold mb-4">Add New Worker</h2>
                <form onSubmit={handleAddWorker} className="space-y-4">
                    <Input label="Name" id="name" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} required/>
                    <Input label="Email" id="email" type="email" value={newWorker.email} onChange={e => setNewWorker({...newWorker, email: e.target.value})} required/>
                    <Input label="Password (default is 'password123')" id="password" type="text" value={newWorker.password} onChange={e => setNewWorker({...newWorker, password: e.target.value})} required/>
                    <Input label="Weekly Capacity (hours)" id="capacity" type="number" value={newWorker.weeklyCapacity} onChange={e => setNewWorker({...newWorker, weeklyCapacity: e.target.value})} required/>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>{isLoading ? 'Adding...' : 'Add Worker'}</Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
};

export default WorkerManagement;