import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  FaTrophy,
  FaCalendarAlt,
  FaChartLine,
  FaFilter,
  FaMedal,
  FaArrowLeft,
  FaArrowRight,
  FaGift,
  FaMoon,
  FaSun,
  FaFire,
  FaStar,
  FaCrown,
} from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const ProgressPage = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("week");
  const [darkMode, setDarkMode] = useState(false);
  const [showBadge, setShowBadge] = useState(null);
  const [streak, setStreak] = useState(0);
  const roadmapRef = useRef(null);
  const [selectedChart, setSelectedChart] = useState(null); 

  const COLORS = ["#2A9D8F", "#F4A261", "#E76F51", "#43AA8B", "#F9C74F", "#9381FF"];

  
  const badges = [
    {
      id: 1,
      name: "Mindfulness Master",
      description: "Completed 10 mindfulness exercises",
      icon: "🧘",
      appreciationIcon: <FaStar className="text-yellow-400" />,
      count: 10,
      earned: true,
      color: "#2A9D8F",
    },
    {
      id: 2,
      name: "Nature Explorer",
      description: "Completed 5 nature walks",
      icon: "🌳",
      appreciationIcon: <FaTrophy className="text-gold" />,
      count: 5,
      earned: true,
      color: "#43AA8B",
    },
    {
      id: 3,
      name: "Consistency Champion",
      description: "Used the app for 7 consecutive days",
      icon: "🔄",
      appreciationIcon: <FaCrown className="text-purple-500" />,
      count: 7,
      earned: true,
      color: "#F4A261",
    },
    {
      id: 4,
      name: "Reflection Guru",
      description: "Completed 15 journaling exercises",
      icon: "📓",
      appreciationIcon: <FaStar className="text-yellow-400" />,
      count: 15,
      earned: false,
      color: "#9381FF",
    },
    {
      id: 5,
      name: "Sleep Specialist",
      description: "Improved sleep routine for 5 days",
      icon: "😴",
      appreciationIcon: <FaTrophy className="text-gold" />,
      count: 5,
      earned: false,
      color: "#F9C74F",
    },
  ];

  
  const quotes = [
    { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
    { text: "You are stronger than you think.", author: "Unknown" },
    { text: "Progress, not perfection.", author: "Unknown" },
  ];
  const [currentQuote, setCurrentQuote] = useState(quotes[0]);

  useEffect(() => {
    fetchUserAssessments();
    const darkModePref = localStorage.getItem("darkMode") === "true";
    setDarkMode(darkModePref);
    document.documentElement.classList.toggle("dark-mode", darkModePref);
    calculateStreak(); 
    const quoteInterval = setInterval(() => {
      setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, 10000)
    return () => clearInterval(quoteInterval);
  }, [dateRange]);

  const fetchUserAssessments = async () => {
    if (!auth.currentUser) {
      console.error("No authenticated user found.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let dateFilter = new Date();
      if (dateRange === "week") dateFilter.setDate(dateFilter.getDate() - 7);
      else if (dateRange === "month") dateFilter.setMonth(dateFilter.getMonth() - 1);
      else if (dateRange === "all") dateFilter = new Date(2000, 0, 1);

      const q = query(
        collection(db, "userAssessments"),
        where("userId", "==", auth.currentUser.uid),
        where("timestamp", ">=", dateFilter.toISOString()),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(q);
      const assessmentData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: new Date(doc.data().timestamp),
      }));
      setAssessments(assessmentData);
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  
  const calculateStreak = () => {
    const sortedDates = assessments
      .map((a) => a.timestamp.toISOString().split("T")[0])
      .sort((a, b) => new Date(b) - new Date(a));
    let currentStreak = 0;
    let today = new Date();
    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
      if (diff === i) currentStreak++;
      else break;
    }
    setStreak(currentStreak);
  };

  const scrollRoadmap = (direction) => {
    if (roadmapRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      roadmapRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const getCompletionStats = () => {
    if (!assessments.length) return [];
    const allTasks = assessments.flatMap((a) => a.tasks || []);
    const taskTypes = [...new Set(allTasks.map((t) => t.name))];
    return taskTypes.map((type) => {
      const tasksOfType = allTasks.filter((t) => t.name === type);
      const completedCount = tasksOfType.filter((t) => t.completionStatus).length;
      return { name: type, value: completedCount, total: tasksOfType.length };
    }).sort((a, b) => b.value - a.value);
  };

  const getTrendData = () => {
    if (!assessments.length) return [];
    const dateMap = new Map();
    assessments.forEach((assessment) => {
      const date = assessment.timestamp.toISOString().split("T")[0];
      const tasks = assessment.tasks || [];
      if (!dateMap.has(date)) dateMap.set(date, { total: 0, completed: 0 });
      const dateStats = dateMap.get(date);
      dateStats.total += tasks.length;
      dateStats.completed += tasks.filter((t) => t.completionStatus).length;
    });
    return Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        percentage: stats.total ? (stats.completed / stats.total) * 100 : 0,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getDifficultyStats = () => {
    if (!assessments.length) return [];
    const allTasks = assessments.flatMap((a) => a.tasks || []);
    const difficultyCount = {
      easy: allTasks.filter((t) => t.difficulty === "easy").length,
      medium: allTasks.filter((t) => t.difficulty === "medium").length,
      hard: allTasks.filter((t) => t.difficulty === "hard").length,
    };
    return [
      { name: "Easy", value: difficultyCount.easy },
      { name: "Medium", value: difficultyCount.medium },
      { name: "Hard", value: difficultyCount.hard },
    ].filter((item) => item.value > 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("darkMode", newMode);
      document.documentElement.classList.toggle("dark-mode", newMode);
      return newMode;
    });
  };

  const handleBadgeClick = (badge) => {
    if (badge.earned) {
      setShowBadge(badge);
      setTimeout(() => setShowBadge(null), 4000); // Extended duration for more appreciation
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"} transition-colors duration-300 overflow-x-hidden`}>
      <nav className={`${darkMode ? "bg-teal-700" : "bg-teal-600"} p-4 sticky top-0 z-20 shadow-lg`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
              <span className="text-teal-600 text-xl font-bold">S</span>
            </div>
            <h1 className="text-xl font-bold text-white">Solace</h1>
          </motion.div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/home")} className="text-white hover:text-teal-200 transition-colors">Back to Home</button>
            <button onClick={toggleTheme} className="p-2 rounded-full bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition">
              {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className={`${darkMode ? "bg-gradient-to-r from-teal-700 to-green-600" : "bg-gradient-to-r from-teal-600 to-green-500"} rounded-xl p-6 mb-8 text-white shadow-xl`}>
          <h2 className="text-3xl font-bold mb-2">Your Progress Journey</h2>
          <p className="text-white text-opacity-90">Celebrate your growth and achievements!</p>
          <div className="mt-4 flex items-center gap-3">
            <FaFilter className="text-white" />
            <span className="text-sm">Filter by:</span>
            <div className="flex rounded-lg overflow-hidden">
              {["week", "month", "all"].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 text-sm ${dateRange === range ? "bg-white text-teal-600" : "bg-white bg-opacity-20 text-white hover:bg-opacity-30"} transition-colors`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-20 flex items-center justify-center`}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="h-12 w-12 border-t-2 border-b-2 border-teal-600 rounded-full"></motion.div>
          </div>
        ) : assessments.length === 0 ? (
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6 text-center`}>
            <p>No assessments found for the selected time range.</p>
          </div>
        ) : (
          <>
            
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6 mb-8 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <FaFire className="text-orange-500 text-3xl" />
                <div>
                  <h3 className="text-lg font-semibold">Current Streak</h3>
                  <p className="text-sm text-gray-500">Keep the fire burning!</p>
                </div>
              </div>
              <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-3xl font-bold text-orange-500">{streak} days</motion.span>
            </motion.div>

            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[
                { title: "Task Completion", icon: FaChartLine, data: getCompletionStats(), type: "pie" },
                { title: "Completion Trend", icon: FaChartLine, data: getTrendData(), type: "line" },
                { title: "Task Difficulty", icon: FaTrophy, data: getDifficultyStats(), type: "pie" },
              ].map((chart, index) => (
                <motion.div
                  key={chart.title}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6 relative`}
                  onMouseEnter={() => setSelectedChart(chart.title)}
                  onMouseLeave={() => setSelectedChart(null)}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <chart.icon className={`mr-2 ${darkMode ? "text-teal-400" : "text-teal-600"}`} />
                    {chart.title}
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    {chart.type === "pie" ? (
                      <PieChart>
                        <Pie
                          data={chart.data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chart.data.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : (
                      <LineChart data={chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#eee"} />
                        <XAxis dataKey="date" tick={{ fill: darkMode ? "#fff" : "#333" }} tickFormatter={formatDate} />
                        <YAxis tick={{ fill: darkMode ? "#fff" : "#333" }} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip formatter={(value) => [`${value.toFixed(0)}%`, "Completion"]} labelFormatter={formatDate} />
                        <Line type="monotone" dataKey="percentage" stroke="#2A9D8F" activeDot={{ r: 8 }} strokeWidth={2} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                  <AnimatePresence>
                    {selectedChart === chart.title && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                        onClick={() => setSelectedChart(null)}
                      >
                        <motion.div
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-6 w-3/4 h-3/4`}
                        >
                          <h3 className="text-xl font-semibold mb-4">{chart.title}</h3>
                          <ResponsiveContainer width="100%" height="90%">
                            {chart.type === "pie" ? (
                              <PieChart>
                                <Pie
                                  data={chart.data}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={150}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {chart.data.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            ) : (
                              <LineChart data={chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#eee"} />
                                <XAxis dataKey="date" tick={{ fill: darkMode ? "#fff" : "#333" }} tickFormatter={formatDate} />
                                <YAxis tick={{ fill: darkMode ? "#fff" : "#333" }} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                <Tooltip formatter={(value) => [`${value.toFixed(0)}%`, "Completion"]} labelFormatter={formatDate} />
                                <Line type="monotone" dataKey="percentage" stroke="#2A9D8F" activeDot={{ r: 8 }} strokeWidth={2} />
                              </LineChart>
                            )}
                          </ResponsiveContainer>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6 mb-8`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold flex items-center">
                  <FaCalendarAlt className={`mr-2 ${darkMode ? "text-green-400" : "text-green-500"}`} />
                  Your Wellbeing Roadmap
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => scrollRoadmap("left")} className={`p-2 rounded-full ${darkMode ? "bg-teal-700 text-white" : "bg-teal-100 text-teal-600"} hover:bg-opacity-80 transition`}>
                    <FaArrowLeft />
                  </button>
                  <button onClick={() => scrollRoadmap("right")} className={`p-2 rounded-full ${darkMode ? "bg-teal-700 text-white" : "bg-teal-100 text-teal-600"} hover:bg-opacity-80 transition`}>
                    <FaArrowRight />
                  </button>
                </div>
              </div>
              <div ref={roadmapRef} className="overflow-x-auto flex gap-4 pb-4 hide-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {assessments.flatMap((assessment) =>
                  (assessment.tasks || []).map((task, taskIndex) => (
                    <motion.div
                      key={`${assessment.id}-${taskIndex}`}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: taskIndex * 0.1 }}
                      className={`flex-shrink-0 w-64 ${darkMode ? "bg-gray-700" : "bg-gray-100"} border ${task.completionStatus ? "border-green-500" : "border-gray-300"} rounded-lg p-4 relative`}
                    >
                      <div className={`absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-full -mt-3 -mr-3 ${task.completionStatus ? "bg-green-500" : "bg-gray-300"} text-white`}>
                        {task.completionStatus ? "✓" : "○"}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{formatDate(assessment.timestamp)}</p>
                      <h4 className={`font-medium mb-1 ${task.completionStatus ? "text-green-500" : ""}`}>{task.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs ${getDifficultyColor(task.difficulty, darkMode)}`}>{task.difficulty}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6 mb-8`}>
              <h3 className="text-xl font-semibold mb-6 flex items-center">
                <FaMedal className={`mr-2 ${darkMode ? "text-yellow-400" : "text-yellow-500"}`} />
                Your Achievement Badges
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: badge.earned ? 1.05 : 1 }}
                    className={`relative ${darkMode ? "bg-gray-700" : "bg-gray-100"} border ${badge.earned ? "border-2" : "border-dashed border-gray-400"} rounded-lg p-4 text-center cursor-pointer`}
                    style={{ borderColor: badge.earned ? badge.color : undefined }}
                    onClick={() => handleBadgeClick(badge)}
                  >
                    {badge.earned ? (
                      <motion.div initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute -top-3 -right-3">
                        <FaGift size={24} className="text-yellow-500" />
                      </motion.div>
                    ) : (
                      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                        <div className="bg-white bg-opacity-90 px-3 py-1 rounded text-xs font-medium transform -rotate-12">Locked</div>
                      </div>
                    )}
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl mb-2">{badge.icon}</motion.div>
                    <h4 className="font-medium text-sm mb-1" style={{ color: badge.earned ? badge.color : undefined }}>{badge.name}</h4>
                    <p className="text-xs text-gray-500">{badge.description}</p>
                    {badge.earned && <div className="mt-2">{badge.appreciationIcon}</div>}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1 }} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6 text-center`}>
              <h3 className="text-lg font-semibold mb-2">Daily Inspiration</h3>
              <motion.p
                key={currentQuote.text}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-xl italic text-gray-600"
              >
                "{currentQuote.text}"
              </motion.p>
              <p className="text-sm text-gray-500 mt-2">— {currentQuote.author}</p>
            </motion.div>
          </>
        )}

        
        <AnimatePresence>
          {showBadge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.5, rotate: 10 }}
                className="w-80 bg-white rounded-xl p-6 text-center shadow-2xl relative overflow-hidden"
              >
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1, repeat: Infinity }} className="text-6xl mb-4">{showBadge.icon}</motion.div>
                <h3 className="text-xl font-bold mb-2" style={{ color: showBadge.color }}>{showBadge.name}</h3>
                <p className="text-gray-600 mb-4">{showBadge.description}</p>
                <div className="flex justify-center gap-2 mb-4">
                  {showBadge.appreciationIcon}
                  <FaStar className="text-yellow-400" />
                  <FaTrophy className="text-gold" />
                </div>
                <p className="text-sm text-gray-500">Congratulations! You're amazing!</p>
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4 }}
                  className="absolute bottom-0 left-0 h-1 bg-teal-600"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const getDifficultyColor = (difficulty, darkMode) => {
  switch (difficulty?.toLowerCase()) {
    case "easy": return darkMode ? "bg-green-500 bg-opacity-30 text-green-400" : "bg-green-100 text-green-600";
    case "medium": return darkMode ? "bg-yellow-500 bg-opacity-30 text-yellow-400" : "bg-yellow-100 text-yellow-600";
    case "hard": return darkMode ? "bg-red-500 bg-opacity-30 text-red-400" : "bg-red-100 text-red-600";
    default: return darkMode ? "bg-gray-500 bg-opacity-30 text-gray-400" : "bg-gray-100 text-gray-600";
  }
};

export default ProgressPage;