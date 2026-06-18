import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  isLoading: false,
  error: null,
  login: ({ email }) => {
    set({
      user: {
        name: "Food Lover",
        email
      }
    });
  },
  signup: ({ firstName, lastName, email }) => {
    set({
      user: {
        name: `${firstName} ${lastName}`.trim() || "Food Lover",
        email
      }
    });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null })
}));

export default useAuthStore;
