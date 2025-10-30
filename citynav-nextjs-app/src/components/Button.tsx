"use client";
import React from "react";

export interface ButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

// Deprecated: legacy Button is not used; retain a no-op to avoid breaking stray imports.
export const Button: React.FC<ButtonProps> = () => null;
export default Button;
