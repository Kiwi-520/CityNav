"use client"; // This component uses client-side interactivity
// Note: The "use client" directive at the top of the file indicates that this is a Client Component, which is necessary for any component that uses state, event handlers (onClick), or browser APIs.

import React from "react";

// Define the shape of the props this component expects
interface ButtonProps {
  label: string;
  onClick: () => void;
  className?: string; // Optional class name for styling
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  className,
}) => {
  return (
    <button onClick={onClick} className={className}>
      {label}
    </button>
  );
};
