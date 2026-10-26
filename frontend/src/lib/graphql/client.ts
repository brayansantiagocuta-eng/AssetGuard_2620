"use client";

import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";

const httpLink = createHttpLink({
  uri: "/graphql",
  credentials: "same-origin",
});

export const apolloClient = new ApolloClient({
  link: httpLink,
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
