"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { authApi, type User } from "../api/api";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export type AuthState = {
  user: User | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<User>;
  signup: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<User>;
  signout: () => Promise<void>;
};

async function fetchCurrentUser(): Promise<User | null> {
  try {
    const data = await authApi.me();
    return data.user;
  } catch {
    // Preserve your existing behavior: treat a failed /me
    // request as an unauthenticated session.
    return null;
  }
}

export function useAuth(): AuthState {
  const queryClient = useQueryClient();

  // The backend is the source of truth for the signed-in user.
  const {
    data: user = null,
    isPending,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const signinMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<User> => {
      const data = await authApi.signin({ email, password });
      return data.user;
    },

    onSuccess: (signedInUser) => {
      queryClient.setQueryData<User | null>(
        AUTH_QUERY_KEY,
        signedInUser,
      );
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      email: string;
      password: string;
    }): Promise<User> => {
      const data = await authApi.signup(input);
      return data.user;
    },

    onSuccess: (signedUpUser) => {
      queryClient.setQueryData<User | null>(
        AUTH_QUERY_KEY,
        signedUpUser,
      );
    },
  });

  const signoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await authApi.logout();
    },

    onSuccess: () => {
      // Remove cached data that may belong to the previous user.
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey[0] !== "auth",
      });

      queryClient.setQueryData<User | null>(
        AUTH_QUERY_KEY,
        null,
      );
    },
  });

  return {
    user,
    loading: isPending,

    signin: (email, password) =>
      signinMutation.mutateAsync({ email, password }),

    signup: (input) =>
      signupMutation.mutateAsync(input),

    signout: () =>
      signoutMutation.mutateAsync(),
  };
}