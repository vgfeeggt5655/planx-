
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Resource, User, Subject } from '../types';

import * as resourceService from '../services/googleSheetService';
import * as authService from '../services/authService';
import * as subjectService from '../services/subjectService';

import { generateImage } from '../services/geminiService';
import { uploadFile } from '../services/archiveService';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import ProgressBar from '../components/ProgressBar';
import SubjectSelectionDialog from '../components/SubjectSelectionDialog';
import { ChevronDownIcon, EditIcon, TrashIcon, PlusCircleIcon, UserGroupIcon, ClipboardListIcon, VideoIcon, ArrowUpIcon, ArrowDownIcon, SearchIcon } from '../components/Icons';


type AdminTab = 'content' | 'users' | 'subjects';

// ====================================================================================
// Resource Form Modal (extracted from the old ResourceFormPage)
// ====================================================================================

// Helper function to convert a data URL to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Could not determine MIME type from data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, { type: mime });
}

interface ResourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    resourceToEdit: Resource | null;
}

const ResourceFormModal: React.FC<ResourceFormModalProps> = ({ isOpen, onClose, onSave, resourceToEdit }) => {
    const isEditMode = Boolean(resourceToEdit);

    const [title, setTitle] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Video source selection
    const [videoInputMethod, setVideoInputMethod] = useState<'upload' | 'link'>('upload');
    
    // For creating new resources
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    
    // For editing links directly OR replacing files
    const [videoLink, setVideoLink] = useState('');
    const [pdfLink, setPdfLink] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
    const [newPdfFile, setNewPdfFile] = useState<File | null>(null);
    const [newImageFile, setNewImageFile] = useState<File | null>(null);


    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ stage: '', percentage: 0 });
    const [error, setError] = useState<string | null>(null);
    const [isSubjectDialogOpen, setSubjectDialogOpen] = useState(false);
    
    const isYoutubeLink = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const availableSubjects = await subjectService.getSubjects();
                setSubjects(availableSubjects);
                if (resourceToEdit) {
                    setTitle(resourceToEdit.title);
                    setSubjectName(resourceToEdit.Subject_Name);
                    setVideoLink(resourceToEdit.video_link);
                    setPdfLink(resourceToEdit.pdf_link);
                    setImageUrl(resourceToEdit.image_url);
                    if (isYoutubeLink(resourceToEdit.video_link)) {
                        setVideoInputMethod('link');
                    } else {
                        setVideoInputMethod('upload');
                    }
                } else if (availableSubjects.length > 0) {
                    setSubjectName(availableSubjects[0].Subject_Name);
                }
            } catch (err) { console.error("Failed to load subjects", err); }
        };

        if (isOpen) {
            fetchSubjects();
            // Reset form state when modal opens
            if (resourceToEdit) {
                 setTitle(resourceToEdit.title);
                 setSubjectName(resourceToEdit.Subject_Name);
                 setVideoLink(resourceToEdit.video_link);
                 setPdfLink(resourceToEdit.pdf_link);
                 setImageUrl(resourceToEdit.image_url);
                 setVideoInputMethod(isYoutubeLink(resourceToEdit.video_link) ? 'link' : 'upload');
            } else {
                setTitle('');
                setSubjectName('');
                setVideoFile(null);
                setPdfFile(null);
                setVideoLink('');
                setPdfLink('');
                setImageUrl('');
                setVideoInputMethod('upload');
            }
            setNewVideoFile(null);
            setNewPdfFile(null);
            setNewImageFile(null);
            setError(null);
            setProgress({ stage: '', percentage: 0 });
        }
    }, [isOpen, resourceToEdit]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title || !subjectName) {
            setError('Title and Subject Name are required.');
            return;
        }
        if (!isEditMode) {
             if (videoInputMethod === 'upload' && !videoFile) {
                setError('A video file is required for the "Upload" option.');
                return;
            }
            if (videoInputMethod === 'link' && !videoLink.trim()) {
                setError('A YouTube video link is required for the "Link" option.');
                return;
            }
            if (!pdfFile) {
                setError('A PDF file is required for new resources.');
                return;
            }
        }

        setLoading(true);
        try {
            if (isEditMode && resourceToEdit) {
                 let updatedVideoLink = videoLink;
                 let updatedPdfLink = pdfLink;
                 let updatedImageUrl = imageUrl;
                 const baseName = resourceToEdit.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                 // Max identifier length is 100. ID is variable. Let's cap baseName at 80 to be safe.
                 const safeBaseName = (baseName || 'item').substring(0, 80);
                 const itemName = `${safeBaseName}-${resourceToEdit.id}`;

                if (newVideoFile) {
                    setProgress({ stage: 'Uploading new video...', percentage: 0 });
                    updatedVideoLink = await uploadFile(newVideoFile, itemName, (p) => setProgress({ stage: `Uploading video...`, percentage: p }));
                }
                if (newPdfFile) {
                    setProgress({ stage: 'Uploading new PDF...', percentage: 0 });
                    updatedPdfLink = await uploadFile(newPdfFile, itemName, (p) => setProgress({ stage: `Uploading PDF...`, percentage: p }));
                }
                if (newImageFile) {
                    setProgress({ stage: 'Uploading new image...', percentage: 0 });
                    updatedImageUrl = await uploadFile(newImageFile, itemName, (p) => setProgress({ stage: `Uploading image...`, percentage: p }));
                }
                
                setProgress({ stage: 'Updating resource details...', percentage: 95 });
                const resourceToUpdate: Resource = {
                    ...resourceToEdit,
                    title,
                    Subject_Name: subjectName,
                    video_link: updatedVideoLink,
                    pdf_link: updatedPdfLink,
                    image_url: updatedImageUrl,
                };
                await resourceService.updateResource(resourceToUpdate);
                setProgress({ stage: 'Update complete!', percentage: 100 });

            } else {
                if (!pdfFile) throw new Error("PDF file is missing.");
                const baseName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                // Max identifier length is 100. Timestamp is 13 chars. Let's cap baseName at 80.
                const safeBaseName = (baseName || 'item').substring(0, 80);
                const itemName = `${safeBaseName}-${Date.now()}`;
                
                let finalVideoUrl = '';
                if (videoInputMethod === 'upload') {
                    if (!videoFile) throw new Error("Video file is missing.");
                    finalVideoUrl = await uploadFile(videoFile, itemName, (p) => setProgress({ stage: `Uploading Video: ${videoFile.name}`, percentage: p }));
                } else {
                    if (!videoLink.trim()) throw new Error("YouTube link is missing.");
                    finalVideoUrl = videoLink;
                }
                
                const pdfUrl = await uploadFile(pdfFile, itemName, (p) => setProgress({ stage: `Uploading PDF: ${pdfFile.name}`, percentage: p }));
                
                setProgress({ stage: 'Generating AI cover image...', percentage: 25 });
                const imagePrompt = `Educational content for subject: "${subjectName}", with the title: "${title}"`;
                const base64Image = await generateImage(imagePrompt);
                setProgress({ stage: 'Uploading AI cover image...', percentage: 75 });
                const aiImageFile = dataURLtoFile(base64Image, 'cover.jpg');
                const imageUrl = await uploadFile(aiImageFile, itemName, (p) => setProgress({ stage: `Uploading AI cover image...`, percentage: p }));

                setProgress({ stage: 'Finalizing resource...', percentage: 50 });
                await resourceService.createResource({ title, Subject_Name: subjectName, video_link: finalVideoUrl, pdf_link: pdfUrl, image_url: imageUrl });
                setProgress({ stage: 'Resource created!', percentage: 100 });
            }
            setTimeout(() => {
                onSave();
                handleClose();
            }, 1000);
        } catch (err: any) {
            console.error(err);
            setError(`Operation failed: ${err.message || 'Please try again.'}`);
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setLoading(false);
        setError(null);
        setProgress({ stage: '', percentage: 0 });
        onClose();
    };

    if (!isOpen) return null;

    const inputClass = "mt-1 block w-full px-3 py-2 bg-surface border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-text-primary placeholder-text-secondary transition";
    const fileInputClass = "mt-1 block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 transition-colors";

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-surface border border-border-color rounded-lg shadow-2xl p-6 w-full max-w-2xl transform transition-all animate-fade-in-up">
                <h2 className="text-xl font-bold text-text-primary mb-4">{isEditMode ? 'Edit Resource' : 'Add New Resource'}</h2>
                {loading ? (
                    <ProgressBar text={progress.stage} progress={progress.percentage} />
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                         {error && <div className="bg-red-500/20 border-l-4 border-red-400 text-red-300 p-4 rounded-md" role="alert"><p>{error}</p></div>}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-text-secondary">Title</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Subject Name</label>
                            <button type="button" onClick={() => setSubjectDialogOpen(true)} className={`${inputClass} text-left flex justify-between items-center`}>
                                <span className={subjectName ? 'text-text-primary' : 'text-text-secondary'}>{subjectName || 'Select a subject...'}</span>
                                <ChevronDownIcon className="h-5 w-5 text-text-secondary" />
                            </button>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Video Source</label>
                             <div className="flex rounded-md shadow-sm bg-background/50 p-1 border border-border-color">
                                <button type="button" onClick={() => setVideoInputMethod('upload')} className={`px-4 py-2 text-sm font-medium transition-colors rounded-md flex-1 ${videoInputMethod === 'upload' ? 'bg-primary text-background shadow' : 'text-text-secondary hover:bg-surface'}`}>
                                    Upload File
                                </button>
                                <button type="button" onClick={() => setVideoInputMethod('link')} className={`px-4 py-2 text-sm font-medium transition-colors rounded-md flex-1 ${videoInputMethod === 'link' ? 'bg-primary text-background shadow' : 'text-text-secondary hover:bg-surface'}`}>
                                    YouTube Link
                                </button>
                            </div>
                        </div>
                        {isEditMode ? (
                           <>
                                {videoInputMethod === 'upload' ? (
                                    <div className="p-3 bg-background/50 rounded-md space-y-2">
                                        <label className="block text-sm font-medium text-text-secondary">Video File</label>
                                        <p className="text-xs text-text-secondary truncate" title={videoLink}>Current: {videoLink}</p>
                                        <label className="block text-xs font-medium text-text-secondary mt-2">Upload New Video to Replace (Optional)</label>
                                        <input type="file" onChange={(e) => handleFileChange(e, setNewVideoFile)} accept="video/*" className={fileInputClass} />
                                    </div>
                                ) : (
                                    <div className="p-3 bg-background/50 rounded-md space-y-2">
                                        <label htmlFor="video_link" className="block text-sm font-medium text-text-secondary">YouTube Video Link</label>
                                        <input type="url" id="video_link" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} required className={inputClass} placeholder="e.g., https://www.youtube.com/watch?v=..." />
                                    </div>
                                )}
                                <div className="p-3 bg-background/50 rounded-md space-y-2">
                                    <label htmlFor="pdf_link" className="block text-sm font-medium text-text-secondary">PDF Link</label>
                                    <input type="url" id="pdf_link" value={pdfLink} onChange={(e) => setPdfLink(e.target.value)} required className={inputClass} />
                                    <label className="block text-xs font-medium text-text-secondary mt-2">Replace PDF (Optional)</label>
                                    <input type="file" onChange={(e) => handleFileChange(e, setNewPdfFile)} accept="application/pdf" className={fileInputClass} />
                                </div>
                                <div className="p-3 bg-background/50 rounded-md space-y-2">
                                    <label htmlFor="image_url" className="block text-sm font-medium text-text-secondary">Cover Image URL</label>
                                    <input type="url" id="image_url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required className={inputClass} />
                                    <label className="block text-xs font-medium text-text-secondary mt-2">Replace Image (Optional)</label>
                                    <input type="file" onChange={(e) => handleFileChange(e, setNewImageFile)} accept="image/*" className={fileInputClass} />
                                </div>
                            </>
                        ) : (
                            <>
                                {videoInputMethod === 'upload' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary">Video File</label>
                                        <input type="file" onChange={(e) => handleFileChange(e, setVideoFile)} required={videoInputMethod === 'upload'} accept="video/*" className={fileInputClass} />
                                    </div>
                                ) : (
                                     <div>
                                        <label className="block text-sm font-medium text-text-secondary">YouTube Video Link</label>
                                        <input type="url" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} required={videoInputMethod === 'link'} placeholder="e.g., https://www.youtube.com/watch?v=..." className={inputClass} />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary">PDF Document</label>
                                    <input type="file" onChange={(e) => handleFileChange(e, setPdfFile)} required accept="application/pdf" className={fileInputClass} />
                                </div>
                            </>
                        )}
                        <div className="flex justify-end pt-4 gap-4">
                            <button type="button" onClick={handleClose} className="bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition">Cancel</button>
                            <button type="submit" className="bg-primary text-background font-bold py-2 px-6 rounded-md hover:bg-cyan-400 transition">{isEditMode ? 'Save Changes' : 'Add Resource'}</button>
                        </div>
                    </form>
                )}
            </div>
             <SubjectSelectionDialog isOpen={isSubjectDialogOpen} onClose={() => setSubjectDialogOpen(false)} subjects={subjects} selectedSubject={subjectName} onSelectSubject={setSubjectName} />
        </div>
    );
};


// ====================================================================================
// Main Admin Dashboard Page
// ====================================================================================

const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<AdminTab>('content');
    
    // Global States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Resources State
    const [resources, setResources] = useState<Resource[]>([]);
    const [resourceSearchTerm, setResourceSearchTerm] = useState('');
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [resourceToEdit, setResourceToEdit] = useState<Resource | null>(null);
    const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
    
    // Users State
    const [users, setUsers] = useState<User[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userDialog, setUserDialog] = useState<{action: 'delete' | 'updateRole' | null, user: User | null, newRole?: User['role']}>({action: null, user: null});

    // Subjects State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [editingSubject, setEditingSubject] = useState<{ subject: Subject; newName: string } | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOrderChanged, setIsOrderChanged] = useState(false);

    
    const fetchData = useCallback(async (tab: AdminTab) => {
        setLoading(true);
        setError(null);
        try {
            if (tab === 'content') {
                const data = await resourceService.getResources();
                setResources(data.reverse());
            } else if (tab === 'users' && user?.role === 'super_admin') {
                const data = await authService.getUsers();
                setUsers(data.filter(u => u.id !== user?.id)); // Exclude self
            } else if (tab === 'subjects') {
                const data = await subjectService.getSubjects();
                setSubjects(data.sort((a, b) => a.number - b.number));
                setIsOrderChanged(false);
            }
        } catch (err) {
            setError(`Failed to load ${tab}. Please refresh.`);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData(activeTab);
    }, [activeTab, fetchData]);
    
    // Search Filter Logic
    const filteredResources = useMemo(() => resources.filter(r => 
        r.title.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
        r.Subject_Name.toLowerCase().includes(resourceSearchTerm.toLowerCase())
    ), [resources, resourceSearchTerm]);

    const filteredUsers = useMemo(() => users.filter(u =>
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    ), [users, userSearchTerm]);

    const filteredSubjects = useMemo(() => subjects.filter(s =>
        s.Subject_Name.toLowerCase().includes(subjectSearchTerm.toLowerCase())
    ), [subjects, subjectSearchTerm]);


    // Resource Actions
    const handleAddResource = () => { setResourceToEdit(null); setFormModalOpen(true); };
    const handleEditResource = (res: Resource) => { setResourceToEdit(res); setFormModalOpen(true); };
    const handleDeleteResource = async () => {
        if (!resourceToDelete) return;
        await resourceService.deleteResource(resourceToDelete.id);
        setResourceToDelete(null);
        fetchData('content');
    };

    // User Actions
    const handleUserRoleChange = async (targetUser: User, newRole: User['role']) => {
        if (targetUser.role === newRole) return;
        await authService.updateUser({ ...targetUser, role: newRole });
        setUserDialog({action: null, user: null});
        fetchData('users');
    };
    const handleDeleteUser = async () => {
        if (!userDialog.user) return;
        await authService.deleteUser(userDialog.user.id);
        setUserDialog({action: null, user: null});
        fetchData('users');
    };

    // Subject Actions
    const handleAddSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubjectName.trim()) return;
        setIsSubmitting(true);
        await subjectService.addSubject(newSubjectName);
        setNewSubjectName('');
        await fetchData('subjects');
        setIsSubmitting(false);
    };
    const handleUpdateSubject = async () => {
        if (!editingSubject) return;
        setIsSubmitting(true);
        await subjectService.updateSubject(editingSubject.subject.id, editingSubject.newName);
        setEditingSubject(null);
        await fetchData('subjects');
        setIsSubmitting(false);
    };
    const handleDeleteSubject = async () => {
        if (!subjectToDelete) return;
        setIsSubmitting(true);
        await subjectService.deleteSubject(subjectToDelete.id);
        setSubjectToDelete(null);
        await fetchData('subjects');
        setIsSubmitting(false);
    };
    
    const handleMoveSubject = (index: number, direction: 'up' | 'down') => {
        const newSubjects = [...subjects];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSubjects.length) return;

        [newSubjects[index], newSubjects[targetIndex]] = [newSubjects[targetIndex], newSubjects[index]];
        setSubjects(newSubjects);
        setIsOrderChanged(true);
    };
    
    const handleSaveOrder = async () => {
        setIsSubmitting(true);
        try {
            // Create a series of update promises
            const updatePromises = subjects.map((subject, index) => 
                subjectService.updateSubject(subject.id, subject.Subject_Name, index)
            );
            await Promise.all(updatePromises);
            setIsOrderChanged(false);
        } catch (error) {
            console.error("Failed to save subject order:", error);
            setError("Could not save the new order. Please try again.");
        } finally {
            setIsSubmitting(false);
            fetchData('subjects'); // Refresh data
        }
    };
    
    const TabButton: React.FC<{tab: AdminTab, label: string, icon: React.ReactNode}> = ({ tab, label, icon }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
                activeTab === tab ? 'text-primary border-primary' : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-color'
            }`}
        >
            {icon}<span className="hidden sm:inline">{label}</span>
        </button>
    );
    
    const inputClass = "flex-grow block w-full px-3 py-2 bg-surface border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-text-secondary transition";
    const searchInputClass = "w-full pl-10 pr-3 py-2 bg-surface border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-text-secondary transition";


    return (
        <div className="container mx-auto px-2 sm:px-4 py-8 pt-20 sm:pt-24">
            <div className="mb-6 border-b border-border-color pb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Admin Dashboard</h1>
                <p className="text-sm sm:text-md text-text-secondary">Manage application content and users.</p>
            </div>

            <div className="border-b border-border-color flex gap-1 sm:gap-4">
                <TabButton tab="content" label="Content" icon={<VideoIcon className="h-5 w-5"/>} />
                <TabButton tab="subjects" label="Subjects" icon={<ClipboardListIcon className="h-5 w-5"/>} />
                {user?.role === 'super_admin' && <TabButton tab="users" label="Users" icon={<UserGroupIcon className="h-5 w-5"/>} />}
            </div>

            <div className="mt-6">
                {error && <div className="text-center text-red-500 text-xl">{error}</div>}
                {loading && <Spinner />}

                {!loading && !error && (
                    <>
                        {/* CONTENT TAB */}
                        {activeTab === 'content' && (
                             <div className="bg-surface border border-border-color rounded-lg shadow-md p-2 sm:p-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                                    <h2 className="text-xl font-bold">Manage Content</h2>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <div className="relative flex-grow">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input type="text" placeholder="Search content..." value={resourceSearchTerm} onChange={e => setResourceSearchTerm(e.target.value)} className={searchInputClass} />
                                        </div>
                                        <button onClick={handleAddResource} className="bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-cyan-400 transition flex items-center justify-center gap-2 flex-shrink-0"><PlusCircleIcon className="h-5 w-5" /> <span className="hidden sm:inline">Add New</span></button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto overscroll-x-contain">
                                    <table className="min-w-full divide-y divide-border-color">
                                        <thead className="bg-background/50"><tr>
                                            <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Title</th>
                                            <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Subject</th>
                                            <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-border-color">
                                            {filteredResources.map(res => (
                                                <tr key={res.id} className="hover:bg-background/50">
                                                    <td className="px-2 sm:px-4 py-3 text-sm text-text-primary truncate max-w-xs">{res.title}</td>
                                                    <td className="px-2 sm:px-4 py-3 text-sm text-text-secondary">{res.Subject_Name}</td>
                                                    <td className="px-2 sm:px-4 py-3 text-right flex gap-1 sm:gap-2 justify-end">
                                                        <button onClick={() => handleEditResource(res)} className="p-2 text-text-secondary hover:text-primary"><EditIcon className="h-5 w-5" /></button>
                                                        {(user?.role === 'admin' || user?.role === 'super_admin') && 
                                                            <button onClick={() => setResourceToDelete(res)} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="h-5 w-5" /></button>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* USERS TAB */}
                        {activeTab === 'users' && user?.role === 'super_admin' && (
                             <div className="bg-surface border border-border-color rounded-lg shadow-md p-2 sm:p-4">
                                 <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                                     <h2 className="text-xl font-bold">Manage Users</h2>
                                     <div className="relative w-full sm:w-1/2">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input type="text" placeholder="Search by name or email..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} className={searchInputClass} />
                                     </div>
                                 </div>
                                 <div className="overflow-x-auto overscroll-x-contain">
                                     <table className="min-w-full divide-y divide-border-color">
                                         <thead className="bg-background/50"><tr>
                                             <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                                             <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                                             <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Role</th>
                                             <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                                         </tr></thead>
                                         <tbody className="divide-y divide-border-color">
                                             {filteredUsers.map(u => (
                                                 <tr key={u.id} className="hover:bg-background/50">
                                                     <td className="px-2 sm:px-4 py-3 text-sm text-text-primary">{u.name}</td>
                                                     <td className="px-2 sm:px-4 py-3 text-sm text-text-primary truncate max-w-xs">{u.email}</td>
                                                     <td className="px-2 sm:px-4 py-3 text-sm text-text-secondary">
                                                         <select value={u.role} onChange={(e) => handleUserRoleChange(u, e.target.value as User['role'])} className={`${inputClass} max-w-xs py-1`}>
                                                             <option value="user">User</option>
                                                             <option value="admin">Admin</option>
                                                             <option value="super_admin">Super Admin</option>
                                                         </select>
                                                     </td>
                                                     <td className="px-2 sm:px-4 py-3 text-right">
                                                        <button onClick={() => setUserDialog({action: 'delete', user: u})} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="h-5 w-5" /></button>
                                                     </td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             </div>
                        )}
                        
                        {/* SUBJECTS TAB */}
                        {activeTab === 'subjects' && (
                             <div className="bg-surface border border-border-color rounded-lg shadow-md p-2 sm:p-4 relative">
                                {isSubmitting && <div className="absolute inset-0 bg-surface/80 z-10 flex items-center justify-center"><Spinner text="Processing..." /></div>}
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                                     <h2 className="text-xl font-bold">Manage Subjects</h2>
                                     <div className="relative w-full sm:w-1/2">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input type="text" placeholder="Search subjects..." value={subjectSearchTerm} onChange={e => setSubjectSearchTerm(e.target.value)} className={searchInputClass} />
                                     </div>
                                 </div>
                                <form onSubmit={handleAddSubject} className="flex gap-2 mb-4">
                                    <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="New subject name" className={inputClass} required />
                                    <button type="submit" className="bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-cyan-400 transition">Add</button>
                                </form>
                                 {isOrderChanged && (
                                    <div className="bg-primary/20 border border-primary/50 text-primary p-3 rounded-md mb-4 flex justify-between items-center">
                                        <span>You've changed the subject order.</span>
                                        <button onClick={handleSaveOrder} className="bg-primary text-background font-bold py-1 px-4 rounded-md hover:bg-cyan-400 transition">Save Order</button>
                                    </div>
                                )}
                                <div className="max-h-96 overflow-y-auto overscroll-y-contain scrollbar-thin pr-2">
                                    <ul className="divide-y divide-border-color">
                                        {filteredSubjects.map((s, index) => (
                                            <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                                                {editingSubject?.subject.id === s.id ? (
                                                    <div className="flex-grow flex gap-2 items-center">
                                                        <input type="text" value={editingSubject.newName} onChange={e => setEditingSubject({...editingSubject, newName: e.target.value})} className={inputClass} autoFocus onBlur={handleUpdateSubject} onKeyDown={e => e.key === 'Enter' && handleUpdateSubject()} />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex flex-col">
                                                                <button onClick={() => handleMoveSubject(index, 'up')} disabled={index === 0} className="p-1 text-text-secondary hover:text-primary disabled:opacity-30"><ArrowUpIcon className="h-4 w-4" /></button>
                                                                <button onClick={() => handleMoveSubject(index, 'down')} disabled={index === subjects.length - 1} className="p-1 text-text-secondary hover:text-primary disabled:opacity-30"><ArrowDownIcon className="h-4 w-4" /></button>
                                                            </div>
                                                            <span className="text-sm text-text-primary">{s.Subject_Name}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setEditingSubject({subject: s, newName: s.Subject_Name})} className="p-2 text-text-secondary hover:text-primary"><EditIcon className="h-5 w-5" /></button>
                                                            <button onClick={() => setSubjectToDelete(s)} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="h-5 w-5" /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            <ResourceFormModal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} onSave={() => fetchData('content')} resourceToEdit={resourceToEdit} />
            <ConfirmDialog isOpen={!!resourceToDelete} onClose={() => setResourceToDelete(null)} onConfirm={handleDeleteResource} title="Delete Resource" message={<>Delete <strong>{resourceToDelete?.title}</strong>? This is irreversible.</>} />
            <ConfirmDialog isOpen={userDialog.action === 'delete'} onClose={() => setUserDialog({action: null, user: null})} onConfirm={handleDeleteUser} title="Delete User" message={<>Delete user <strong>{userDialog.user?.email}</strong>? This is irreversible.</>} />
            <ConfirmDialog isOpen={!!subjectToDelete} onClose={() => setSubjectToDelete(null)} onConfirm={handleDeleteSubject} title="Delete Subject" message={<>Delete subject <strong>{subjectToDelete?.Subject_Name}</strong>? This is irreversible.</>} />
        </div>
    );
};

export default AdminDashboardPage;
