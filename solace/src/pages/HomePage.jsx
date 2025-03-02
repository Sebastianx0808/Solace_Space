import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { 
  FaTasks, 
  FaCheckCircle, 
  FaLightbulb, 
  FaRobot,
  FaBook,
  FaCalendarAlt,
  FaChartLine,
  FaUserFriends,
  FaMedal,
  FaBell,
  FaCog,
  FaHeart,
  FaWater,
  FaLeaf,
  FaMoon,
  FaSun,
  FaRunning
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const HomePage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [darkMode, setDarkMode] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [recentJournals, setRecentJournals] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [streakCount, setStreakCount] = useState(0);
  const [quote, setQuote] = useState({
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  });

  const [stats, setStats] = useState({
    tasksCompleted: 0,
    daysActive: 0,
    tipsRead: 0,
    journalEntries: 0,
    meditationMinutes: 0,
    wellnessScore: 0
  });

  const [wellnessMetrics, setWellnessMetrics] = useState({
    sleep: { value: 7, goal: 8, unit: "hours" },
    water: { value: 4, goal: 8, unit: "glasses" },
    exercise: { value: 20, goal: 30, unit: "minutes" },
    mood: { value: "good", history: ["neutral", "good", "good", "great", "good", "neutral", "good"] }
  });

  
  const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Your mental health is a priority. Your happiness is essential. Your self-care is a necessity.", author: "Unknown" },
    { text: "Self-care is how you take your power back.", author: "Lalah Delia" },
    { text: "You don't have to control your thoughts. You just have to stop letting them control you.", author: "Dan Millman" },
    { text: "There is hope, even when your brain tells you there isn't.", author: "John Green" },
    { text: "Mental health problems don't define who you are. They are something you experience.", author: "Unknown" },
    { text: "You are not alone in this journey. Recovery is possible.", author: "Unknown" },
    { text: "The strongest people are those who win battles we know nothing about.", author: "Unknown" }
  ];


  const challenges = [
    "Take a 10-minute walk outside",
    "Write down three things you're grateful for",
    "Practice deep breathing for 5 minutes",
    "Reach out to a friend you haven't spoken to in a while",
    "Try a new healthy recipe",
    "Declutter one small space in your home",
    "Meditate for 10 minutes",
    "Limit screen time after 8 PM"
  ];

  
  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        setIsLoading(true);
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserName(userData.name || "User");

            
            setStats({
              tasksCompleted: userData.tasksCompleted || 0,
              daysActive: userData.daysActive || 0,
              tipsRead: userData.tipsRead || 0,
              journalEntries: userData.journalEntries || 0,
              meditationMinutes: userData.meditationMinutes || 0,
              wellnessScore: userData.wellnessScore || 75,
            });

            
            setStreakCount(userData.streak || 0);

            
            setDarkMode(userData.darkMode || false);

            
            const defaultMetrics = {
              sleep: { value: 7, goal: 8, unit: "hours" },
              water: { value: 4, goal: 8, unit: "glasses" },
              exercise: { value: 20, goal: 30, unit: "minutes" },
              mood: {
                value: "good",
                history: ["neutral", "good", "good", "great", "good", "neutral", "good"],
              },
            };
            setWellnessMetrics({
              ...defaultMetrics,
              ...(userData.wellnessMetrics || {}), 
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false); 
        }
      }
    };

  fetchUserData();

  
    
    
    const randomIndex = Math.floor(Math.random() * challenges.length);
    setDailyChallenge(challenges[randomIndex]);
    
    
    const quoteIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[quoteIndex]);
    
    
    const lastMoodCheck = localStorage.getItem('lastMoodCheck');
    const today = new Date().toDateString();
    if (lastMoodCheck !== today) {
      
      setTimeout(() => setShowMoodModal(true), 2000);
    }
    
    
    const fetchJournals = async () => {
      if (auth.currentUser) {
        const journalsQuery = query(
          collection(db, "journals"),
          where("userId", "==", auth.currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        
        const querySnapshot = await getDocs(journalsQuery);
        const journals = [];
        querySnapshot.forEach((doc) => {
          journals.push({ id: doc.id, ...doc.data() });
        });
        
        setRecentJournals(journals);
      }
    };
    
    
    const fetchTasks = async () => {
      if (auth.currentUser) {
        const tasksQuery = query(
          collection(db, "tasks"),
          where("userId", "==", auth.currentUser.uid),
          where("completed", "==", false),
          orderBy("dueDate", "asc"),
          limit(5)
        );
        
        const querySnapshot = await getDocs(tasksQuery);
        const tasks = [];
        querySnapshot.forEach((doc) => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        
        setUpcomingTasks(tasks);
      }
    };
    
    fetchJournals();
    fetchTasks();
    
    
    setTimeout(() => {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }, 1000);
    
  }, []);

  
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleMoodSelect = async (mood) => {
    try {
      
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        
        
        const newMoodHistory = [...wellnessMetrics.mood.history.slice(-6), mood];
        
        await updateDoc(userRef, {
          "wellnessMetrics.mood.value": mood,
          "wellnessMetrics.mood.history": newMoodHistory
        });
        
        
        setWellnessMetrics({
          ...wellnessMetrics,
          mood: {
            value: mood,
            history: newMoodHistory
          }
        });
      }
      
      
      localStorage.setItem('lastMoodCheck', new Date().toDateString());
      
      
      setShowMoodModal(false);
      
    } catch (error) {
      console.error("Error updating mood:", error);
    }
  };

  
  const calculateProgress = (current, goal) => {
    const percentage = (current / goal) * 100;
    return Math.min(percentage, 100); 
  };

  
  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        darkMode: newMode
      });
    }
  };

  
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  
  const MoodTrackingModal = () => (
    <AnimatePresence>
      {showMoodModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl`}
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">How are you feeling today?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Tracking your mood helps us personalize your experience.</p>
            
            <div className="grid grid-cols-5 gap-3 mb-6">
              <button 
                onClick={() => handleMoodSelect("terrible")}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
              >
                <span className="text-3xl mb-1">😞</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Terrible</span>
              </button>
              <button 
                onClick={() => handleMoodSelect("bad")}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
              >
                <span className="text-3xl mb-1">😕</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Bad</span>
              </button>
              <button 
                onClick={() => handleMoodSelect("neutral")}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900 transition-colors"
              >
                <span className="text-3xl mb-1">😐</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Neutral</span>
              </button>
              <button 
                onClick={() => handleMoodSelect("good")}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
              >
                <span className="text-3xl mb-1">🙂</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Good</span>
              </button>
              <button 
                onClick={() => handleMoodSelect("great")}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
              >
                <span className="text-3xl mb-1">😄</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Great</span>
              </button>
            </div>
            
            <div className="flex justify-between">
              <button 
                onClick={() => {
                  localStorage.setItem('lastMoodCheck', new Date().toDateString());
                  setShowMoodModal(false);
                }}
                className="text-gray-600 dark:text-gray-400 hover:underline text-sm"
              >
                Remind me later
              </button>
              <button 
                onClick={() => setShowMoodModal(false)} 
                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  
  const Notification = () => (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg">
            <p>Welcome back! You're on a {streakCount} day streak! 🔥</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  
  const ChatbotFloat = () => {
    return (
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        <motion.button
          whileHover={{ scale: .65 }}
          whileTap={{ scale: 0.45 }}
          onClick={() => navigate("/chatbot")}
          className="bg-purple-600 text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center"
        >
          <FaRobot size={20} className="sm:size-10" />
          <span className="ml-2 text-sm sm:text-base">Click me for help!</span>
        </motion.button>
      </div>
    );
  };

  
  const renderMoodHistory = () => {
    const moodColors = {
      terrible: "bg-red-500",
      bad: "bg-orange-400",
      neutral: "bg-yellow-400",
      good: "bg-green-400",
      great: "bg-teal-500"
    };
    
    return (
      <div className="flex space-x-1 items-end h-10 mt-2">
        {wellnessMetrics.mood.history.map((mood, index) => (
          <div
            key={index}
            className={`${moodColors[mood]} w-full rounded-t-md`}
            style={{ height: `${mood === 'terrible' ? 20 : mood === 'bad' ? 40 : mood === 'neutral' ? 60 : mood === 'good' ? 80 : 100}%` }}
          ></div>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      
      <Notification />
      
    
      <MoodTrackingModal />
      
      
      <nav className="bg-teal-600 dark:bg-teal-800 p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
              <span className="text-teal-600 text-xl font-bold">S</span>
            </div>
            <h1 className="text-xl font-bold text-white">Solace</h1>
          </div>
          <div className="hidden md:flex gap-6 text-white">
            <button 
              onClick={() => navigate("/tasks")} 
              className={`flex flex-col items-center hover:text-teal-200 transition-colors ${activeTab === "tasks" ? "text-teal-200" : ""}`}
            >
              <FaTasks size={20} />
              <span className="text-xs mt-1">Tasks</span>
            </button>
            <button 
              onClick={() => navigate("/completion")} 
              className={`flex flex-col items-center hover:text-teal-200 transition-colors ${activeTab === "completion" ? "text-teal-200" : ""}`}
            >
              <FaCheckCircle size={20} />
              <span className="text-xs mt-1">Progress</span>
            </button>
            <button 
              onClick={() => navigate("/tips")} 
              className={`flex flex-col items-center hover:text-teal-200 transition-colors ${activeTab === "tips" ? "text-teal-200" : ""}`}
            >
              <FaLightbulb size={20} />
              <span className="text-xs mt-1">Tips</span>
            </button>
            <button 
              onClick={() => navigate("/journal")} 
              className={`flex flex-col items-center hover:text-teal-200 transition-colors ${activeTab === "journal" ? "text-teal-200" : ""}`}
            >
              <FaBook size={20} />
              <span className="text-xs mt-1">Journal</span>
            </button>
            <button 
              onClick={() => navigate("/chatbot")} 
              className={`flex flex-col items-center hover:text-teal-200 transition-colors ${activeTab === "chatbot" ? "text-teal-200" : ""}`}
            >
              <FaRobot size={20} />
              <span className="text-xs mt-1">Chatbot</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleDarkMode} className="text-white hover:text-teal-200 transition-colors">
              {darkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
            </button>
            <div className="relative">
              <button className="text-white hover:text-teal-200 transition-colors">
                <FaBell size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
            </div>
            <button 
              onClick={() => navigate("/settings")}
              className="text-white hover:text-teal-200 transition-colors hidden sm:block"
            >
              <FaCog size={20} />
            </button>
          </div>
        </div>
      </nav>

      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-10">
        <div className="flex justify-around">
          <button 
            onClick={() => {
              setActiveTab("home");
              navigate("/");
            }} 
            className={`flex flex-col items-center p-3 ${activeTab === "home" ? "text-teal-600 dark:text-teal-400" : "text-gray-600 dark:text-gray-400"}`}
          >
            <FaHeart size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab("tasks");
              navigate("/tasks");
            }} 
            className={`flex flex-col items-center p-3 ${activeTab === "tasks" ? "text-teal-600 dark:text-teal-400" : "text-gray-600 dark:text-gray-400"}`}
          >
            <FaTasks size={20} />
            <span className="text-xs mt-1">Tasks</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab("journal");
              navigate("/journal");
            }} 
            className={`flex flex-col items-center p-3 ${activeTab === "journal" ? "text-teal-600 dark:text-teal-400" : "text-gray-600 dark:text-gray-400"}`}
          >
            <FaBook size={20} />
            <span className="text-xs mt-1">Journal</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab("chatbot");
              navigate("/chatbot");
            }} 
            className={`flex flex-col items-center p-3 ${activeTab === "chatbot" ? "text-teal-600 dark:text-teal-400" : "text-gray-600 dark:text-gray-400"}`}
          >
            <FaRobot size={20} />
            <span className="text-xs mt-1">Chat</span>
          </button>
        </div>
      </div>

      
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-teal-700 dark:to-cyan-800 rounded-xl p-6 mb-8 text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <FaHeart size={120} />
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Welcome back, {userName}!
              </h2>
              <p className="text-teal-100">
                We're here to support your journey to wellbeing
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center">
              <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg flex items-center">
                <span className="text-2xl mr-2">🔥</span>
                <div>
                  <p className="text-sm text-teal-100">Current Streak</p>
                  <p className="text-xl font-bold">{streakCount} days</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 relative overflow-hidden`}>
            <div className="absolute -bottom-4 -right-4 opacity-5">
              <FaChartLine size={120} />
            </div>
            <h3 className="text-xl font-semibold mb-4">Wellness Score</h3>
            <div className="flex justify-between items-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke={darkMode ? "#1F2937" : "#F3F4F6"} 
                    strokeWidth="10" 
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke={stats.wellnessScore > 80 ? "#10B981" : stats.wellnessScore > 60 ? "#3B82F6" : stats.wellnessScore > 40 ? "#F59E0B" : "#EF4444"} 
                    strokeWidth="10" 
                    strokeDasharray={`${stats.wellnessScore * 2.83} 283`} 
                    strokeDashoffset="0" 
                    strokeLinecap="round" 
                    transform="rotate(-90 50 50)" 
                  />
                  <text x="50" y="55" fontSize="20" fontWeight="bold" textAnchor="middle" fill={darkMode ? "white" : "black"}>
                    {stats.wellnessScore}
                  </text>
                </svg>
              </div>
              <div className="flex-1 ml-6">
                <p className={`text-${darkMode ? 'gray-300' : 'gray-600'} mb-2`}>Your wellness score is based on your activity, mood tracking, and task completion.</p>
                <button 
                  onClick={() => navigate("/wellness-report")}
                  className="text-teal-600 dark:text-teal-400 text-sm hover:underline"
                >
                  View detailed report →
                </button>
              </div>
            </div>
          </div>
          
          
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 relative overflow-hidden`}>
            <div className="absolute -bottom-4 -right-4 opacity-5">
              <FaMedal size={120} />
            </div>
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-2">🏆</span>
              <h3 className="text-xl font-semibold">Daily Challenge</h3>
            </div>
            <p className={`text-${darkMode ? 'white' : 'gray-800'} text-lg font-medium mb-4`}>{dailyChallenge}</p>
            <div className="flex justify-between">
              <button 
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg shadow transition-colors"
                onClick={() => {
                  
                  alert("Challenge accepted! Good luck!");
                }}
              >
                Accept Challenge
              </button>
              <button 
                className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded-lg shadow transition-colors`}
                onClick={() => {
                  
                  const newIndex = Math.floor(Math.random() * challenges.length);
                  setDailyChallenge(challenges[newIndex]);
                }}
              >
                Try Another
              </button>
            </div>
          </div>
        </motion.div>

      
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-8`}
        >
          <h3 className="text-xl font-semibold mb-4">Daily Inspiration</h3>
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="flex-1">
              <blockquote className={`text-xl italic ${darkMode ? 'text-gray-300' : 'text-gray-700'} border-l-4 border-teal-500 pl-4 mb-4 md:mb-0`}>
                "{quote.text}"
              </blockquote>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>- {quote.author}</p>
            </div>
            <div className="flex mt-4 md:mt-0">
              <button 
                onClick={() => {
                  
                  alert("Quote saved to your collection!");
                }}
                className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 p-2 rounded-full hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors mr-2"
              >
                <FaHeart size={16} />
              </button>
              <button 
                onClick={() => {
                
                  const newIndex = Math.floor(Math.random() * quotes.length);
                  setQuote(quotes[newIndex]);
                }}
                className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} p-2 rounded-full transition-colors`}
              >
                <FaLightbulb size={16} />
              </button>
            </div>
            </div>
        </motion.div>

      
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6`}>
            <h3 className="text-xl font-semibold mb-4">Wellness Tracking</h3>
            
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <FaMoon size={16} className="mr-2 text-indigo-500" />
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sleep</span>
                </div>
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {wellnessMetrics.sleep.value}/{wellnessMetrics.sleep.goal} {wellnessMetrics.sleep.unit}
                </span>
              </div>
              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full"
                  style={{ width: `${calculateProgress(wellnessMetrics.sleep.value, wellnessMetrics.sleep.goal)}%` }}
                ></div>
              </div>
            </div>
            
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <FaWater size={16} className="mr-2 text-blue-500" />
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Water</span>
                </div>
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {wellnessMetrics.water.value}/{wellnessMetrics.water.goal} {wellnessMetrics.water.unit}
                </span>
              </div>
              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${calculateProgress(wellnessMetrics.water.value, wellnessMetrics.water.goal)}%` }}
                ></div>
              </div>
            </div>
            
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <FaRunning size={16} className="mr-2 text-green-500" />
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Exercise</span>
                </div>
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {wellnessMetrics.exercise.value}/{wellnessMetrics.exercise.goal} {wellnessMetrics.exercise.unit}
                </span>
              </div>
              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${calculateProgress(wellnessMetrics.exercise.value, wellnessMetrics.exercise.goal)}%` }}
                ></div>
              </div>
            </div>
            
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <FaHeart size={16} className="mr-2 text-red-500" />
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mood Trends</span>
                </div>
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} capitalize`}>
                  Today: {wellnessMetrics.mood.value}
                </span>
              </div>
              {renderMoodHistory()}
            </div>
            
            <button 
              onClick={() => navigate("/wellness-tracking")}
              className="mt-4 text-teal-600 dark:text-teal-400 text-sm hover:underline"
            >
              Update your wellness metrics →
            </button>
          </div>
          
          
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Recent Journal Entries</h3>
              <button 
                onClick={() => navigate("/journal/new")}
                className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded-lg text-sm shadow transition-colors"
              >
                New Entry
              </button>
            </div>
            
            {recentJournals.length > 0 ? (
              <div className="space-y-4">
                {recentJournals.map(journal => (
                  <div 
                    key={journal.id}
                    className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-4 rounded-lg cursor-pointer transition-colors`}
                    onClick={() => navigate(`/journal/${journal.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{journal.title || "Untitled Entry"}</h4>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(journal.createdAt.toDate())}
                      </span>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2`}>
                      {journal.content}
                    </p>
                    <div className="flex mt-2">
                      {journal.mood && (
                        <span className="text-sm bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2 py-1 rounded-full text-xs mr-2">
                          Mood: {journal.mood}
                        </span>
                      )}
                      {journal.tags && journal.tags.map(tag => (
                        <span 
                          key={tag}
                          className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs mr-2"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <FaBook size={32} className="mx-auto mb-2 opacity-50" />
                <p>No journal entries yet</p>
                <p className="text-sm mt-1">Start writing about your thoughts and feelings</p>
              </div>
            )}
            
            <button 
              onClick={() => navigate("/journal")}
              className="mt-4 text-teal-600 dark:text-teal-400 text-sm hover:underline"
            >
              View all journal entries →
            </button>
          </div>
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          {/* Upcoming Tasks */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Upcoming Tasks</h3>
              <button 
                onClick={() => navigate("/tasks/new")}
                className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded-lg text-sm shadow transition-colors"
              >
                Add Task
              </button>
            </div>
            
            {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map(task => (
                  <div 
                    key={task.id}
                    className={`flex items-center p-3 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg cursor-pointer transition-colors`}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <input 
                      type="checkbox" 
                      className="form-checkbox h-5 w-5 text-teal-500 rounded border-gray-300 focus:ring-teal-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        
                      }}
                    />
                    <div className="ml-3 flex-1">
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{task.title}</p>
                      <div className="flex items-center text-xs mt-1">
                        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-3`}>
                          Due: {formatDate(task.dueDate.toDate())}
                        </span>
                        {task.priority && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            task.priority === 'high' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 
                            task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 
                            'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          }`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`ml-2 p-1 rounded-full ${darkMode ? 'hover:bg-gray-500' : 'hover:bg-gray-300'}`}>
                      <FaCheckCircle 
                        size={18} 
                        className="text-gray-400 hover:text-green-500 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <FaTasks size={32} className="mx-auto mb-2 opacity-50" />
                <p>No upcoming tasks</p>
                <p className="text-sm mt-1">Add some tasks to stay organized</p>
              </div>
            )}
            
            <button 
              onClick={() => navigate("/tasks")}
              className="mt-4 text-teal-600 dark:text-teal-400 text-sm hover:underline"
            >
              View all tasks →
            </button>
          </div>
          
        
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6`}>
            <h3 className="text-xl font-semibold mb-4">Your Progress</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-4 text-center`}>
                <div className="flex justify-center mb-2 text-teal-500">
                  <FaCheckCircle size={24} />
                </div>
                <p className="text-2xl font-bold">{stats.tasksCompleted}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tasks Completed</p>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-4 text-center`}>
                <div className="flex justify-center mb-2 text-blue-500">
                  <FaCalendarAlt size={24} />
                </div>
                <p className="text-2xl font-bold">{stats.daysActive}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Days Active</p>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-4 text-center`}>
                <div className="flex justify-center mb-2 text-purple-500">
                  <FaBook size={24} />
                </div>
                <p className="text-2xl font-bold">{stats.journalEntries}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Journal Entries</p>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-4 text-center`}>
                <div className="flex justify-center mb-2 text-green-500">
                  <FaLightbulb size={24} />
                </div>
                <p className="text-2xl font-bold">{stats.tipsRead}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tips Read</p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate("/progress")}
              className="mt-4 text-teal-600 dark:text-teal-400 text-sm hover:underline block text-center w-full"
            >
              View detailed progress report →
            </button>
          </div>
        </motion.div>
        
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-8`}
        >
          <h3 className="text-xl font-semibold mb-4">Tips and Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div 
              className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-4 rounded-lg cursor-pointer transition-colors`}
              onClick={() => navigate("/tips/meditation")}
            >
              <h4 className="font-medium mb-2">Meditation Basics</h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Learn simple meditation techniques for beginners.
              </p>
            </div>
            <div 
              className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-4 rounded-lg cursor-pointer transition-colors`}
              onClick={() => navigate("/tips/anxiety")}
            >
              <h4 className="font-medium mb-2">Managing Anxiety</h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Practical strategies to cope with anxious thoughts.
              </p>
            </div>
            <div 
              className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-4 rounded-lg cursor-pointer transition-colors`}
              onClick={() => navigate("/tips/sleep")}
            >
              <h4 className="font-medium mb-2">Better Sleep Habits</h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Tips for improving your sleep quality.
              </p>
            </div>
          </div>
        </motion.div>
        
      
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Join Our Community</h3>
            <button 
              onClick={() => navigate("/community")}
              className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded-lg text-sm shadow transition-colors"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="flex-1 mb-4 md:mb-0 md:mr-6">
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                Connect with others on similar wellness journeys. Share experiences and find support in our community groups.
              </p>
              <div className="flex items-center">
                <div className="flex -space-x-2 mr-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">JD</div>
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">MK</div>
                  <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs">TS</div>
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">RB</div>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  1,240+ members
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => navigate("/community/anxiety")}
                className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} px-3 py-1 rounded-lg text-sm transition-colors`}
              >
                Anxiety Support
              </button>
              <button 
                onClick={() => navigate("/community/mindfulness")}
                className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} px-3 py-1 rounded-lg text-sm transition-colors`}
              >
                Mindfulness
              </button>
              <button 
                onClick={() => navigate("/community/motivation")}
                className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} px-3 py-1 rounded-lg text-sm transition-colors`}
              >
                Motivation
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      <ChatbotFloat />
    </div>
  );
};

export default HomePage;