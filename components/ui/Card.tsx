import React from 'react';

// FIX: Allow `Card` component to accept standard HTML attributes like `onClick`.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;