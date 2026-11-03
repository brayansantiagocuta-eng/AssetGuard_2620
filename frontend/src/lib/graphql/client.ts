"use client";

import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from "@apollo/client";

const httpLink = createHttpLink({
  uri: "/graphql",
  credentials: "same-origin",
});

const authLink = new ApolloLink((operation, forward) => {
  if (typeof window !== "undefined") {
    const tabEmail =
      sessionStorage.getItem("assetguard_tab_email") ||
      (() => {
        try {
          const u = sessionStorage.getItem("assetguard_tab_user");
          return u ? JSON.parse(u).email : null;
        } catch {
          return null;
        }
      })();
    const token =
      sessionStorage.getItem("assetguard_tab_token") ||
      (() => {
        if (!tabEmail) return null;
        try {
          const raw = localStorage.getItem("assetguard_tokens_by_email_v1");
          if (!raw) return null;
          const map = JSON.parse(raw) as Record<string, string>;
          return map[tabEmail.trim().toLowerCase()] || null;
        } catch {
          return null;
        }
      })();
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        ...(token
          ? {
              authorization: `Bearer ${token}`,
              "X-Session-Token": token,
            }
          : {}),
        ...(tabEmail ? { "X-Tab-User-Email": tabEmail } : {}),
      },
    }));
  }
  return forward(operation);
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          assetsPaged: {
            keyArgs: ["status", "categoryId", "locationId", "search"],
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
});
