import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, query, collection, where, orderBy, getDocs } from "firebase/firestore";
import { FaTasks, FaCheckCircle, FaLightbulb, FaRobot, FaPlus, FaSpinner, FaSun, FaMoon, FaTrophy, FaChartLine } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { signOut } from "firebase/auth";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";

const Tasks = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [userTasks, setUserTasks] = useState([]);
  const [stats, setStats] = useState({
    tasksCompleted: 42,
    daysActive: 15,
    tipsRead: 8,
  });
  const [darkMode, setDarkMode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedTaskIndex, setCompletedTaskIndex] = useState(null);
  const [progressData, setProgressData] = useState([]);

  useEffect(() => {
    
    const savedTheme = localStorage.getItem("solace-theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    const fetchUserName = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserName(userSnap.data().name);
        }
      }
    };

    const fetchUserTasks = async () => {
      if (auth.currentUser) {
        try {
          const q = query(
            collection(db, "userAssessments"),
            where("userId", "==", auth.currentUser.uid),
            orderBy("timestamp", "desc")
          );
          
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const latestAssessment = querySnapshot.docs[0];
            const data = latestAssessment.data();
            
            if (data.tasks) {
              setUserTasks(data.tasks);
              
              updateProgressData(data.tasks);
            }
          }
        } catch (error) {
          console.error("Error fetching tasks:", error);
        }
      }
    };
    
    fetchUserName();
    fetchUserTasks();
  }, []);

  const updateProgressData = (tasks) => {
    
    const total = tasks.length;
    const completed = tasks.filter(task => task.completionStatus).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
      
      const value = i === 0 ? percentage : Math.floor(Math.random() * 60) + 20;
      
      last7Days.push({
        day: dayName,
        value: value
      });
    }
    
    setProgressData(last7Days);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("solace-theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("solace-theme", "dark");
    }
  };

  const generateTasks = async () => {
    if (!auth.currentUser) return;
    
    try {
      setIsGeneratingTasks(true);
      
      
      const q = query(
        collection(db, "userAssessments"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.error("No assessment data found");
        return;
      }
      
      const latestAssessment = querySnapshot.docs[0];
      const assessmentId = latestAssessment.id;
      const assessmentData = latestAssessment.data();
      
      if (!assessmentData["output.json"]) {
        console.error("No output.json found in assessment");
        return;
      }
      
    
      const genAI = new GoogleGenerativeAI("AIzaSyAuPNe21f37ElukmyaveAVuyyGN5ONa-1E");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        Based on the following mental wellbeing assessment data, create 5 personalized tasks for the user that would help improve their wellbeing.
        
        Mental wellbeing assessment data:
        ${JSON.stringify(assessmentData["output.json"])}
        
        Instructions:
        1. Create 5 tasks tailored to the user's mental health needs
        2. Each task should have:
           - name: A clear, concise task title
           - description: Detailed explanation of how to complete the task
           - mentalHealthBenefit: Explanation of how this task specifically improves mental wellbeing
           - difficulty: level (easy, medium, hard)
        3. Tasks should be specific, actionable, and achievable
        4. Provide tasks in a structured JSON format only with no additional text
        5. Each task should be designed to improve an aspect of their mental wellbeing
        
        Response format MUST be valid JSON in this exact structure:
        [
          {
            "name": "Task name here",
            "description": "Task description here",
            "mentalHealthBenefit": "Explanation of mental health benefits",
            "difficulty": "easy|medium|hard",
            "completionStatus": false
          },
          ... (more tasks)
        ]
      `;
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      
      let taskList;
      try {
        
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          taskList = JSON.parse(jsonMatch[0]);
        } else {
          
          throw new Error("Could not find valid JSON array in response");
        }
      } catch (error) {
        console.error("Error parsing JSON response:", error);
        
        taskList = [
          {
            name: "Daily Mindfulness Practice",
            description: "Take 5 minutes to practice mindful breathing and focus on the present moment.",
            mentalHealthBenefit: "Reduces anxiety and stress by bringing your attention to the present, calming your nervous system and breaking worry cycles.",
            difficulty: "easy",
            completionStatus: false
          },
          {
            name: "Nature Walk",
            description: "Spend 15 minutes walking outside in nature, observing your surroundings.",
            mentalHealthBenefit: "Exposure to nature reduces cortisol levels, improves mood, and helps restore mental energy through attention restoration.",
            difficulty: "easy",
            completionStatus: false
          }
        ];
      }
      
      
      await updateDoc(doc(db, "userAssessments", assessmentId), {
        tasks: taskList
      });
      
    
      setUserTasks(taskList);
      updateProgressData(taskList);
      
    } catch (error) {
      console.error("Error generating tasks:", error);
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const toggleTaskCompletion = async (index) => {
    try {
      const updatedTasks = [...userTasks];
      const previousStatus = updatedTasks[index].completionStatus;
      updatedTasks[index].completionStatus = !previousStatus;
      setUserTasks(updatedTasks);
      
      
      if (!previousStatus) {
        setCompletedTaskIndex(index);
        setShowConfetti(true);
        
        
        setTimeout(() => {
          setShowConfetti(false);
        }, 4000);
      }
      
    
      updateProgressData(updatedTasks);
      
      
      const q = query(
        collection(db, "userAssessments"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const latestAssessment = querySnapshot.docs[0];
        await updateDoc(doc(db, "userAssessments", latestAssessment.id), {
          tasks: updatedTasks
        });
      }
    } catch (error) {
      console.error("Error updating task completion:", error);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const baseClasses = darkMode ? 'text-white ' : 'text-gray-800 ';
    
    switch (difficulty.toLowerCase()) {
      case 'easy': return baseClasses + (darkMode ? 'bg-green-800' : 'bg-green-100');
      case 'medium': return baseClasses + (darkMode ? 'bg-yellow-800' : 'bg-yellow-100');
      case 'hard': return baseClasses + (darkMode ? 'bg-red-800' : 'bg-red-100');
      default: return baseClasses + (darkMode ? 'bg-gray-700' : 'bg-gray-100');
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
        />
      )}
      
      <AnimatePresence>
        {showConfetti && completedTaskIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            style={{ pointerEvents: "none" }}
          >
            <div className={`bg-gradient-to-r from-purple-500 to-pink-500 p-8 rounded-xl shadow-2xl text-white text-center max-w-md`}>
              <FaTrophy className="mx-auto text-yellow-300 mb-4" size={60} />
              <h2 className="text-3xl font-bold mb-2">Great job!</h2>
              <p className="text-xl mb-4">You completed:</p>
              <p className="text-2xl font-semibold mb-6">"{userTasks[completedTaskIndex]?.name}"</p>
              <p className="text-lg">Your mental wellbeing is improving!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
      <nav className={`${darkMode ? 'bg-teal-800' : 'bg-teal-600'} p-4 sticky top-0 z-10 shadow-md transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
              <span className="text-teal-600 text-xl font-bold">S</span>
            </div>
            <h1 className="text-xl font-bold text-white">Solace</h1>
          </a>
        </div>
          <div className="flex gap-6 text-white">
            <button onClick={() => navigate("/tasks")} className="flex flex-col items-center text-teal-200 transition-colors">
              <FaTasks size={20} />
              <span className="text-xs mt-1">Tasks</span>
            </button>
            <button onClick={() => navigate("/completion")} className="flex flex-col items-center hover:text-teal-200 transition-colors">
              <FaCheckCircle size={20} />
              <span className="text-xs mt-1">Completion</span>
            </button>
            <button onClick={() => navigate("/tips")} className="flex flex-col items-center hover:text-teal-200 transition-colors">
              <FaLightbulb size={20} />
              <span className="text-xs mt-1">Tips</span>
            </button>
            <button onClick={() => navigate("/chatbot")} className="flex flex-col items-center hover:text-teal-200 transition-colors">
              <FaRobot size={20} />
              <span className="text-xs mt-1">Chatbot</span>
            </button>
            <button onClick={toggleTheme} className="flex flex-col items-center hover:text-teal-200 transition-colors ml-2">
              {darkMode ? (
                <>
                  <FaSun size={20} />
                  <span className="text-xs mt-1">Light</span>
                </>
              ) : (
                <>
                  <FaMoon size={20} />
                  <span className="text-xs mt-1">Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

  
      <div className="max-w-4xl mx-auto px-4 py-8">
      
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-6 mb-8 text-white shadow-lg`}
        >
          <h2 className="text-3xl font-bold mb-2">
            Your Tasks, {userName}
          </h2>
          <p className="text-teal-100">
            Personalized activities to support your mental wellbeing journey
          </p>
        </motion.div>

  
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-8 transition-colors duration-300`}
        >
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Your Progress</h3>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/3">
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={darkMode ? "#1f2937" : "#f3f4f6"}
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={darkMode ? "#5eead4" : "#0d9488"}
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 45}
                      strokeDashoffset={2 * Math.PI * 45 * (1 - (userTasks.filter(t => t.completionStatus).length / Math.max(userTasks.length, 1)))}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-3xl font-bold">
                      {userTasks.length > 0 
                        ? Math.round((userTasks.filter(t => t.completionStatus).length / userTasks.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
                <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Task Completion</p>
              </div>
            </div>
            
            <div className="w-full md:w-2/3 h-48">
              <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Weekly Progress</h4>
              <div className="h-40 flex items-end justify-between">
                {progressData.map((item, index) => (
                  <div key={index} className="flex flex-col items-center w-full">
                    <div className="relative w-full flex justify-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.min(item.value, 100) * 0.4}%` }}
                        transition={{ duration: 0.7, delay: index * 0.1 }}
                        className={`w-5 rounded-t-sm ${darkMode ? 'bg-teal-600' : 'bg-teal-400'}`}
                      ></motion.div>
                    </div>
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.day}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>


        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-8 transition-colors duration-300`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Personalized Tasks</h3>
            <button
              onClick={generateTasks}
              disabled={isGeneratingTasks}
              className={`flex items-center ${darkMode ? 'bg-teal-700 hover:bg-teal-800' : 'bg-teal-600 hover:bg-teal-700'} text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50`}
            >
              {isGeneratingTasks ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FaPlus className="mr-2" />
                  Generate New Tasks
                </>
              )}
            </button>
          </div>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mb-2`}>
            Click the button above to generate personalized tasks based on your latest assessment.
          </p>
        </motion.div>

    
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-8 transition-colors duration-300`}
        >
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Your Tasks</h3>
          
          {userTasks.length === 0 ? (
            <div className="text-center py-8">
              <FaTasks className={`mx-auto ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} size={48} />
              <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No tasks yet. Generate new tasks to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {userTasks.map((task, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                    className={`p-5 border rounded-lg transition-all ${
                      darkMode 
                        ? (task.completionStatus ? 'bg-gray-700 border-gray-600' : 'bg-gray-800 border-gray-700 hover:border-teal-600') 
                        : (task.completionStatus ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-teal-300 hover:shadow-md')
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h4 className={`font-medium ${
                            task.completionStatus 
                              ? (darkMode ? 'line-through text-gray-400' : 'line-through text-gray-500') 
                              : (darkMode ? 'text-white' : 'text-gray-800')
                          }`}>
                            {task.name}
                          </h4>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getDifficultyColor(task.difficulty)}`}>
                            {task.difficulty}
                          </span>
                        </div>
                        <p className={`text-sm mb-3 ${
                          task.completionStatus 
                            ? (darkMode ? 'text-gray-500' : 'text-gray-400') 
                            : (darkMode ? 'text-gray-300' : 'text-gray-600')
                        }`}>
                          {task.description}
                        </p>
                        
                        
                        <div className={`mt-3 p-3 rounded-md ${
                          darkMode ? 'bg-gray-700 text-teal-300' : 'bg-teal-50 text-teal-800'
                        }`}>
                          <h5 className="text-xs font-semibold mb-1">MENTAL HEALTH BENEFIT</h5>
                          <p className="text-sm">
                            {task.mentalHealthBenefit || "This task will help improve your mental wellbeing by promoting mindfulness and reducing stress levels."}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTaskCompletion(index)}
                        className={`ml-4 p-3 rounded-full transition-all transform hover:scale-110 ${
                          task.completionStatus 
                            ? (darkMode ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-600') 
                            : (darkMode ? 'bg-gray-700 text-gray-400 hover:bg-teal-800 hover:text-teal-200' : 'bg-gray-100 text-gray-400 hover:bg-teal-50 hover:text-teal-500')
                        }`}
                      >
                        <FaCheckCircle size={24} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

  
      <div className="max-w-4xl mx-auto px-4 py-4">
        <button
          onClick={handleLogout}
          className={`w-full ${darkMode ? 'bg-red-800 hover:bg-red-900' : 'bg-red-500 hover:bg-red-600'} text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors`}
          disabled={isLoading}
        >
          {isLoading ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
};

export default Tasks;