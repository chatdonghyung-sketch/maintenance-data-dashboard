import { ReactNode } from 'react';

interface FolderCardProps {
  title: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function FolderCard({ title, children, onClick, className = '' }: FolderCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={`bg-[#0a1525] rounded-lg border border-[#1c2d3f] hover:border-[#2a3f5f] transition-all ${
        onClick ? 'cursor-pointer text-left' : ''
      } ${className}`}
    >
      <div className="p-4">
        {title && <h3 className="text-white text-base font-bold mb-4">{title}</h3>}
        {children}
      </div>
    </Component>
  );
}