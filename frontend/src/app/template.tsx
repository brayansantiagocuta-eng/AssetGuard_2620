"use client";

import React from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col w-full animate-page-enter">
      {children}
    </div>
  );
}
