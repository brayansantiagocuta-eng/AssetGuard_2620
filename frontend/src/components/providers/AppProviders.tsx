"use client";

import React from "react";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/lib/graphql/client";
import { AuthProvider } from "@/context/AuthContext";
import { AuthNavigationGuard } from "@/components/providers/AuthNavigationGuard";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <AuthNavigationGuard>{children}</AuthNavigationGuard>
      </AuthProvider>
    </ApolloProvider>
  );
}
