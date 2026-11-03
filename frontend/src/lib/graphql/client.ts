"use client";

import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from "@apollo/client";

const httpLink = createHttpLink({
  uri: "/graphql",
  credentials: "same-origin",
});

const authLink = new ApolloLink((operation, forward) => {
  if (typeof window !== "undefined") {
    const token =
      sessionStorage.getItem("assetguard_tab_token") ||
      localStorage.getItem("assetguard_session_token");
    const tabEmail =
      sessionStorage.getItem("assetguard_tab_email") ||
      (() => {
        try {
          const u = sessionStorage.getItem("assetguard_tab_user") || localStorage.getItem("assetguard_current_user");
          return u ? JSON.parse(u).email : null;
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
