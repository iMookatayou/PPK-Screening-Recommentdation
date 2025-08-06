// src/app/print-form/layout.tsx
import React from 'react';

export default function PrintFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-layout">
      {children}
    </div>
  );
}
