import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import PageBuilder from "@/pages/PageBuilder";
import PublicPage from "@/pages/PublicPage";
import Analytics from "@/pages/Analytics";
import GlobalAnalytics from "@/pages/GlobalAnalytics";
import AdminPanel from "@/pages/AdminPanel";
import Domains from "@/pages/Domains";
import Settings from "@/pages/Settings";
import Verification from "@/pages/Verification";
import FAQ from "@/pages/FAQ";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Storage keys
const TOKEN_KEY = "token";
const USER_KEY = "user";

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const api = axios.create({
  baseURL: API,
});

// Add auth header interceptor - automatically adds token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor - handle 401 errors (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper functions for localStorage
const saveAuthData = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check admin access for owner, admin, and moderator roles
  if (adminOnly && !["owner", "admin", "moderator"].includes(user.role)) {
    return <Navigate to="/multilinks" replace />;
  }
  
  return children;
};

function App() {
  // Initialize user from localStorage for instant UI (no flash)
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // On mount: verify token with backend and update user data
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      const storedUser = getStoredUser();
      
      if (token && storedUser) {
        // User data exists in localStorage - show UI immediately
        setUser(storedUser);
        
        // Verify token and refresh user data in background
        try {
          const response = await api.get("/auth/me");
          const freshUser = response.data;
          // Update localStorage and state with fresh data
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (error) {
          // Token invalid/expired - clear everything
          console.warn("Token validation failed:", error.message);
          clearAuthData();
          setUser(null);
        }
      } else if (token) {
        // Token exists but no user data - fetch user
        try {
          const response = await api.get("/auth/me");
          saveAuthData(token, response.data);
          setUser(response.data);
        } catch (error) {
          clearAuthData();
          setUser(null);
        }
      } else {
        // No token - ensure clean state
        clearAuthData();
        setUser(null);
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);

  // Login function - saves both token and user to localStorage
  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { token, user: userData } = response.data;
    
    // Save to localStorage
    saveAuthData(token, userData);
    
    // Update state
    setUser(userData);
    
    return response.data;
  };

  // Register function - saves both token and user to localStorage
  const register = async (email, username, password) => {
    const response = await api.post("/auth/register", { email, username, password });
    const { token, user: userData } = response.data;
    
    // Save to localStorage
    saveAuthData(token, userData);
    
    // Update state
    setUser(userData);
    
    return response.data;
  };

  // Logout function - clears localStorage and state
  const logout = () => {
    clearAuthData();
    setUser(null);
  };

  // Refresh user data from backend
  const refreshUser = async () => {
    try {
      const response = await api.get("/auth/me");
      const freshUser = response.data;
      
      // Update localStorage
      localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      
      // Update state
      setUser(freshUser);
      
      return freshUser;
    } catch (error) {
      console.error("Failed to refresh user:", error.message);
      throw error;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!user && !!getStoredToken();

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      loading, 
      refreshUser,
      isAuthenticated 
    }}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected Routes */}
          <Route path="/multilinks" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute><GlobalAnalytics /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/domains" element={
            <ProtectedRoute><Domains /></ProtectedRoute>
          } />
          <Route path="/verification" element={
            <ProtectedRoute><Verification /></ProtectedRoute>
          } />
          <Route path="/faq" element={
            <ProtectedRoute><FAQ /></ProtectedRoute>
          } />
          <Route path="/page/new" element={
            <ProtectedRoute><PageBuilder /></ProtectedRoute>
          } />
          <Route path="/page/:pageId/edit" element={
            <ProtectedRoute><PageBuilder /></ProtectedRoute>
          } />
          <Route path="/analytics/:pageId" element={
            <ProtectedRoute><Analytics /></ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>
          } />
          
          {/* Public Smart Link Page - must be last to catch /:slug */}
          <Route path="/:slug" element={<PublicPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthContext.Provider>
  );
}

export default App;
