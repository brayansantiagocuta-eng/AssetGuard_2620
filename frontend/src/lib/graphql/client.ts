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
    if (token) {
      operation.setContext(({ headers = {} }) => ({
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
          "X-Session-Token": token,
        },
      }));
    }
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
