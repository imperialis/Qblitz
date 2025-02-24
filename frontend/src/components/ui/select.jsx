import React, { useState } from "react";

export function Select({ children, className = "" }) {
  return <div className={`relative ${className}`}>{children}</div>;
}

export function SelectTrigger({ children, className = "", ...props }) {
  return (
    <button className={`px-3 py-2 border rounded-md w-full text-left ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SelectValue({ value, placeholder = "Select an option" }) {
  return <span>{value || placeholder}</span>;
}

export function SelectContent({ children, className = "" }) {
  return (
    <div className={`absolute w-full border rounded-md bg-white mt-1 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function SelectItem({ value, children, onSelect }) {
  return (
    <div className="p-2 hover:bg-gray-200 cursor-pointer" onClick={() => onSelect(value)}>
      {children}
    </div>
  );
}
