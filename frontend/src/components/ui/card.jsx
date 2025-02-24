import React from "react";

export function Card({ children, className = "" }) {
  return <div className={`p-4 border rounded-lg shadow-md ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = "" }) {
  return <div className={`font-bold text-lg mb-2 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }) {
  return <div className={`text-gray-700 ${className}`}>{children}</div>;
}
