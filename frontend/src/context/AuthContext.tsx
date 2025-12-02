"use client";
import { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  user: any;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("user");
    if (token) {
      setUser({ token }); // you could decode JWT here if needed
    } else {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
