"use client";
import React from "react";

export interface ButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = () => null;
export default Button;
