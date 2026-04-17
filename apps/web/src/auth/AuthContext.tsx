import React, { createContext, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../api/client";

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  staffRoomNumber: string | null;
  rewardPoints: number;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  googleLogin: (input: { idToken: string; staffRoomNumber?: string }) => Promise<void>;
  registerStudent: (input: { name: string; email: string; password: string }) => Promise<void>;
  registerTeacher: (input: { name: string; email: string; password: string; staffRoomNumber: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: User }>("/api/auth/me"),
    retry: false
  });

  const setUser = (user: User | null) => {
    if (user) queryClient.setQueryData(["me"], { user });
    else queryClient.removeQueries({ queryKey: ["me"], exact: true });
  };

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiFetch<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => setUser(data.user)
  });

  const googleMutation = useMutation({
    mutationFn: (input: { idToken: string; staffRoomNumber?: string }) =>
      apiFetch<{ user: User }>("/api/auth/google", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => setUser(data.user)
  });

  const registerStudentMutation = useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      apiFetch<{ user: User }>("/api/auth/register/student", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => setUser(data.user)
  });

  const registerTeacherMutation = useMutation({
    mutationFn: (input: { name: string; email: string; password: string; staffRoomNumber: string }) =>
      apiFetch<{ user: User }>("/api/auth/register/teacher", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => setUser(data.user)
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      setUser(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("cart_student_v1");
        window.localStorage.removeItem("cart_teacher_v1");
      }
    }
  });

  const value: AuthContextValue = {
    user: meQuery.data?.user ?? null,
    isLoading: meQuery.isLoading,
    login: async (input) => {
      await loginMutation.mutateAsync(input);
    },
    googleLogin: async (input) => {
      await googleMutation.mutateAsync(input);
    },
    registerStudent: async (input) => {
      await registerStudentMutation.mutateAsync(input);
    },
    registerTeacher: async (input) => {
      await registerTeacherMutation.mutateAsync(input);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    }
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

