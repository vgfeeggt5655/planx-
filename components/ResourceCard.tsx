import React from 'react';
import { useNavigate } from 'https://esm.sh/react-router-dom';
import { Resource, User } from '../types';
import { EditIcon, TrashIcon } from './Icons';

interface ResourceCardProps {
  resource: Resource;
  onDelete: (id: string) => void;
  userRole?: User['role'];
  animationDelay: string;
  watchProgress?: number;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onDelete, userRole, animationDelay, watchProgress }) => {
  const navigate = useNavigate();
  const canEdit = userRole === 'admin' || userRole === 'super_admin';
  const canDelete = userRole === 'super_admin';

  const handleEdit = () => {
    navigate('/admin', { state: { resourceToEdit: resource } });
  };
  
  const handleWatch = () => {
    navigate(`/watch/${resource.id}`);
  };

  return (
    <div 
      className="bg-surface rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 animate-fade-in-up flex flex-col h-full border border-border-color"
      style={{ animationDelay }}
    >
      <div className="relative aspect-video cursor-pointer" onClick={handleWatch}>
        <img
          src={resource.image_url}
          alt={resource.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(resource.title)}/1280/720`;
          }}
        />
        {watchProgress !== undefined && watchProgress > 0 && (
           <div className="absolute bottom-0 left-0 w-full h-2.5 bg-black/50">
               <div 
                   className="h-full bg-primary rounded-r-full" 
                   style={{ width: `${watchProgress}%` }}
               ></div>
           </div>
        )}
      </div>
      
      <div className="p-4 flex-grow flex flex-col">
        <div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">{resource.Subject_Name}</p>
            <h3 
              className="text-md font-bold text-text-primary leading-tight hover:text-primary transition-colors cursor-pointer"
              onClick={handleWatch}
             >
              {resource.title}
            </h3>
        </div>
      </div>
        
      {(canEdit || canDelete) && (
        <div className="flex gap-1 p-2 border-t border-border-color bg-background/50">
          {canEdit && (
            <button
              onClick={handleEdit}
              className="p-2 text-text-secondary rounded-md hover:bg-slate-600 hover:text-primary transition-colors flex-grow justify-center flex items-center"
              aria-label="Edit"
            >
              <EditIcon className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(resource.id);
              }}
              className="p-2 text-text-secondary rounded-md hover:bg-slate-600 hover:text-red-500 transition-colors flex-grow justify-center flex items-center"
              aria-label="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceCard;