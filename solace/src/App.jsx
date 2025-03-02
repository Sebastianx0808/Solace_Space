import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Questionnaire from "./pages/Questionnaire";
import Tasks from "./pages/Tasks";
import Chatbot from "./pages/Chatbot";
import ProgressPage  from "./pages/ProgressPage";
import Tips from "./pages/Tips";
import Journal  from "./pages/Journal";

import "./index.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setIsNewUser(user?.metadata.creationTime === user?.metadata.lastSignInTime);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-soft-white">
        <div className="animate-pulse text-teal-blue text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-soft-white min-h-screen">
      <Router>
        <Routes>
          <Route path="/" element={
            user ? (
              isNewUser && !localStorage.getItem('questionnaireCompleted') 
                ? <Navigate to="/questionnaire" /> 
                : <HomePage />
            ) : <Navigate to="/login" />
          } />
          
          <Route path="/home" element={
            user ? <HomePage /> : <Navigate to="/login" />
          } />
          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/questionnaire" element={user ? <Questionnaire /> : <Navigate to="/login" />} />
          <Route path="/tasks" element={<Tasks /> }/>
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/completion" element={<ProgressPage />} />
          <Route path="/tips" element={<Tips />} />
          <Route path="/journal" element={<Journal />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;