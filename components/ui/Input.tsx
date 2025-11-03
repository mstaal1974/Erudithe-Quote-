import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#433e3c] mb-1">
        {label}
      </label>
      <input
        id={id}
        className="w-full px-4 py-2 border border-stone-300 rounded-md shadow-sm focus:ring-[#195606] focus:border-[#195606] sm:text-sm"
        {...props}
      />
    </div>
  );
};

export default Input;