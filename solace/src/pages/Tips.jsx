import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc, query, collection, where, orderBy, getDocs, getDoc, updateDoc, increment } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { 
  FaTasks, 
  FaCheckCircle, 
  FaLightbulb, 
  FaRobot, 
  FaSpinner, 
  FaSun, 
  FaMoon, 
  FaYoutube, 
  FaBookmark, 
  FaShare, 
  FaThumbsUp, 
  FaEllipsisH 
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const Tips = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [tipsData, setTipsData] = useState(null);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("tips");
  const [savedTips, setSavedTips] = useState([]);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);
  const [selectedTip, setSelectedTip] = useState(null);
  const [showTipActions, setShowTipActions] = useState(null);
  const [tipsRead, setTipsRead] = useState(0);
  const tipActionsRef = useRef(null);

  useEffect(() => {
    
    const savedTheme = localStorage.getItem("solace-theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    const fetchUserDataAndTips = async () => {
      if (!auth.currentUser) {
        navigate("/login");
        return;
      }

      try {
        setIsLoading(true);

        
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserName(userSnap.data().name);
          setTipsRead(userSnap.data().tipsRead || 0);
        }

        
        const savedTipsRef = doc(db, "userSavedTips", auth.currentUser.uid);
        const savedTipsSnap = await getDoc(savedTipsRef);
        if (savedTipsSnap.exists()) {
          setSavedTips(savedTipsSnap.data().tips || []);
        }

        
        const q = query(
          collection(db, "userAssessments"),
          where("userId", "==", auth.currentUser.uid),
          orderBy("timestamp", "desc")
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setError("No assessments found. Please complete an assessment first.");
          return;
        }

        const latestAssessment = querySnapshot.docs[0].data();
        const assessmentOutput = latestAssessment["output.json"];

        
        const prompt = `
Based on this mental health assessment data: ${JSON.stringify(assessmentOutput)}, provide personalized tips, tricks, and suggestions for improving mental health and well-being.
Also, recommend relevant YouTube videos.

### Output Format:
Return **only** two valid JSON objects, separated by exactly two newlines ("\\n\\n"). Do not include any additional text.

1️⃣ **First JSON Object (Tips)**
{"tip": "string", "tricks": "string", "suggestions": "string"}

2️⃣ **Second JSON Object (YouTube Videos)**
[{"video_title": "string", "description_video": "string", "link": "string"}]

### **STRICT RULES:**
✅ **Do NOT** return markdown ("json", or similar).  
✅ **Do NOT** include any text, explanations, or headers before or after the JSON.  
✅ The response must be **only** the two JSON objects, separated by exactly two newlines ("\\n\\n").  
✅ Ensure all strings are practical, compassionate, and tailored to the assessment data.  
✅ Provide at least one YouTube video recommendation.  

### **Example Correct Response:**
{"tip": "Practice mindfulness daily.", "tricks": "Use deep breathing techniques.", "suggestions": "Journaling before bed improves sleep."}

[{"video_title": "Guided Meditation for Anxiety", "description_video": "A short guided meditation to ease anxiety.", "link": "https://youtube.com/example"}]

(Ensure the response follows this format exactly, with no markdown, explanations, or extra characters.)
`;

        const response = await fetch("http://localhost:5000/api/tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, assessment: assessmentOutput }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch tips from server");
        }

        const data = await response.json();
        setTipsData(data.tips);
        setYoutubeVideos(data.youtube);

        
        const improveRef = doc(db, "userImprove", auth.currentUser.uid);
        await setDoc(
          improveRef,
          {
            tip: data.tips.tip,
            tricks: data.tips.tricks,
            suggestions: data.tips.suggestions,
            timestamp: new Date().toISOString(),
          },
          { merge: true }
        );

        
        await updateDoc(userRef, {
          tipsRead: increment(1)
        });
        setTipsRead(prev => prev + 1);

      } catch (err) {
        setError(err.message);
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDataAndTips();

    
    const handleClickOutside = (event) => {
      if (tipActionsRef.current && !tipActionsRef.current.contains(event.target)) {
        setShowTipActions(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [navigate]);

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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSaveTip = async (tip) => {
    try {
      const newSavedTips = [...savedTips];
      const tipIndex = newSavedTips.findIndex(t => t.content === tip.content);
      
      if (tipIndex === -1) {
        
        newSavedTips.push({
          content: tip.content,
          type: tip.type,
          savedAt: new Date().toISOString()
        });
      } else {
        
        newSavedTips.splice(tipIndex, 1);
      }
      
      setSavedTips(newSavedTips);
      
      
      const userSavedTipsRef = doc(db, "userSavedTips", auth.currentUser.uid);
      await setDoc(userSavedTipsRef, { tips: newSavedTips }, { merge: true });
      
      
      setSelectedTip({...tip, saved: tipIndex === -1});
      setTimeout(() => setSelectedTip(null), 2000);
    } catch (err) {
      console.error("Error saving tip:", err);
    }
  };

  const handleCopyTip = (tip) => {
    navigator.clipboard.writeText(tip.content);
    setShowCopiedNotification(true);
    setTimeout(() => setShowCopiedNotification(false), 2000);
  };

  const isTipSaved = (content) => {
    return savedTips.some(tip => tip.content === content);
  };

  const formatTipContent = (content) => {
    
    return content.split('. ').filter(sentence => sentence.trim()).map(sentence => 
      sentence.endsWith('.') ? sentence : `${sentence}.`
    );
  };

  
  const tipsList = tipsData ? [
    { type: 'tip', content: tipsData.tip },
    { type: 'trick', content: tipsData.tricks },
    { type: 'suggestion', content: tipsData.suggestions }
  ] : [];
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      
      <nav className={`${darkMode ? 'bg-teal-700' : 'bg-teal-600'} p-4 sticky top-0 z-10 shadow-md transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
              <span className="text-teal-600 text-xl font-bold">S</span>
            </div>
            <h1 className="text-xl font-bold text-white">Solace</h1>
          </div>
          <div className="flex gap-6 text-white">
            <button onClick={() => navigate("/tasks")} className="flex flex-col items-center hover:text-teal-200 transition-colors">
              <FaTasks size={20} />
              <span className="text-xs mt-1">Tasks</span>
            </button>
            <button onClick={() => navigate("/completion")} className="flex flex-col items-center hover:text-teal-200 transition-colors">
              <FaCheckCircle size={20} />
              <span className="text-xs mt-1">Completion</span>
            </button>
            <button onClick={() => navigate("/tips")} className="flex flex-col items-center text-teal-200">
              <FaLightbulb size={20} />
              <span className="text-xs mt-1">Tips</span>
            </button>
            <button onClick={() => navigate("/chatbot")} className="flex flex-col items-center hover:text-teal-200 transition-colors">
              <FaRobot size={20} />
              <span className="text-xs mt-1">Chatbot</span>
            </button>
            <button onClick={toggleTheme} className="flex flex-col items-center hover:text-teal-200 transition-colors">
              {darkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
              <span className="text-xs mt-1">Theme</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-6 mb-8 text-white shadow-lg`}
        >
          <h2 className="text-3xl font-bold mb-2">
            Wellness Tips & Resources
          </h2>
          <p className="text-teal-100">
            Personalized recommendations to support your wellbeing journey, {userName}
          </p>
        </motion.div>

      
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 mb-6 transition-colors duration-300`}
        >
          <div className="flex items-center justify-center">
            <div className="flex items-center px-4 py-2">
              <div className={`w-10 h-10 ${darkMode ? 'bg-teal-800' : 'bg-teal-100'} rounded-full flex items-center justify-center mr-3 transition-colors duration-300`}>
                <FaLightbulb className="text-teal-600" size={18} />
              </div>
              <div>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{tipsRead}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tips Read</p>
              </div>
            </div>
          </div>
        </motion.div>

        
        <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`py-3 px-6 font-medium transition-colors duration-200 ${
              activeTab === "tips"
                ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400"
                : "text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300"
            }`}
            onClick={() => handleTabChange("tips")}
          >
            Daily Tips
          </button>
          <button
            className={`py-3 px-6 font-medium transition-colors duration-200 ${
              activeTab === "videos"
                ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400"
                : "text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300"
            }`}
            onClick={() => handleTabChange("videos")}
          >
            Video Resources
          </button>
          <button
            className={`py-3 px-6 font-medium transition-colors duration-200 ${
              activeTab === "saved"
                ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400"
                : "text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300"
            }`}
            onClick={() => handleTabChange("saved")}
          >
            Saved Tips
          </button>
        </div>

        
        {isLoading && (
          <div className="flex flex-col justify-center items-center h-64">
            <FaSpinner className="animate-spin text-teal-600 mb-4" size={40} />
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading your personalized content...</p>
          </div>
        )}

        
        {!isLoading && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`bg-red-100 dark:bg-red-900 dark:text-red-200 p-6 rounded-xl text-red-700 mb-6`}
          >
            <p className="text-lg font-medium mb-2">Something went wrong</p>
            <p>{error}</p>
            <button
              onClick={() => navigate("/assessment")}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Take Assessment
            </button>
          </motion.div>
        )}

        
        <AnimatePresence mode="wait">
          {!isLoading && !error && (
            <>
              
              {activeTab === "tips" && tipsData && (
                <motion.div
                  key="tips-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {tipsList.map((tip, index) => (
                    <motion.div
                      key={`${tip.type}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-6 relative overflow-hidden transition-colors duration-300`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          <div className={`w-12 h-12 ${
                            tip.type === 'tip' ? 'bg-teal-100 dark:bg-teal-800' :
                            tip.type === 'trick' ? 'bg-cyan-100 dark:bg-cyan-800' :
                            'bg-yellow-100 dark:bg-yellow-800'
                          } rounded-full flex items-center justify-center mr-3 transition-colors duration-300`}>
                            <FaLightbulb className={`${
                              tip.type === 'tip' ? 'text-teal-600 dark:text-teal-400' :
                              tip.type === 'trick' ? 'text-cyan-600 dark:text-cyan-400' :
                              'text-yellow-600 dark:text-yellow-400'
                            }`} size={24} />
                          </div>
                          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} capitalize`}>
                            {tip.type === 'trick' ? 'Helpful Trick' : tip.type === 'suggestion' ? 'Action Suggestion' : 'Daily Tip'}
                          </h3>
                        </div>
                        <div className="relative">
                          <button 
                            onClick={() => setShowTipActions(showTipActions === index ? null : index)}
                            className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                          >
                            <FaEllipsisH className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          </button>
                          
                          {showTipActions === index && (
                            <div 
                              ref={tipActionsRef}
                              className={`absolute right-0 top-10 w-48 ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg rounded-lg z-10 py-2 transition-colors duration-300`}
                            >
                              <button 
                                onClick={() => handleSaveTip(tip)}
                                className="w-full text-left px-4 py-2 flex items-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              >
                                <FaBookmark className="mr-2 text-teal-500" size={14} />
                                {isTipSaved(tip.content) ? 'Unsave Tip' : 'Save Tip'}
                              </button>
                              <button 
                                onClick={() => handleCopyTip(tip)}
                                className="w-full text-left px-4 py-2 flex items-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              >
                                <FaShare className="mr-2 text-teal-500" size={14} />
                                Copy to Clipboard
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="pl-4 border-l-4 border-teal-500 dark:border-teal-400">
                        {formatTipContent(tip.content).map((sentence, i) => (
                          <motion.p
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.4 + (i * 0.1) }}
                            className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                          >
                            {sentence}
                          </motion.p>
                        ))}
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex items-center ${
                            tip.type === 'tip' ? 'bg-teal-100 text-teal-700 dark:bg-teal-800 dark:text-teal-200' :
                            tip.type === 'trick' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-200' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200'
                          } px-4 py-2 rounded-lg transition-colors duration-300`}
                        >
                          <FaThumbsUp className="mr-2" size={14} />
                          Helpful
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              
              {activeTab === "videos" && (
                <motion.div
                  key="videos-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {youtubeVideos.length > 0 ? (
                    youtubeVideos.map((video, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden transition-colors duration-300`}
                      >
                        <div className="relative">
                          <div className="bg-gray-200 dark:bg-gray-700 h-48 flex items-center justify-center">
                            <FaYoutube className="text-red-500" size={64} />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                            <a
                              href={video.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-full flex items-center transition-colors"
                            >
                              <FaYoutube className="mr-2" size={20} />
                              Watch Video
                            </a>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {video.video_title}
                          </h3>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {video.description_video}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className={`text-center p-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <FaYoutube size={48} className="mx-auto mb-4 text-red-500 opacity-50" />
                      <p className="text-lg">No video recommendations available.</p>
                      <p className="mt-2">Complete a new assessment to get personalized recommendations.</p>
                    </div>
                  )}
                </motion.div>
              )}

              
              {activeTab === "saved" && (
                <motion.div
                  key="saved-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  {savedTips.length > 0 ? (
                    savedTips.map((tip, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-6 relative transition-colors duration-300`}
                      >
                        <div className="absolute top-4 right-4">
                          <button 
                            onClick={() => handleSaveTip({content: tip.content, type: tip.type})}
                            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-yellow-100 text-yellow-600'} transition-colors`}
                          >
                            <FaBookmark size={16} />
                          </button>
                        </div>
                        
                        <div className="flex items-center mb-4">
                          <div className={`w-12 h-12 ${
                            tip.type === 'tip' ? 'bg-teal-100 dark:bg-teal-800' :
                            tip.type === 'trick' ? 'bg-cyan-100 dark:bg-cyan-800' :
                            'bg-yellow-100 dark:bg-yellow-800'
                          } rounded-full flex items-center justify-center mr-3 transition-colors duration-300`}>
                            <FaLightbulb className={`${
                              tip.type === 'tip' ? 'text-teal-600 dark:text-teal-400' :
                              tip.type === 'trick' ? 'text-cyan-600 dark:text-cyan-400' :
                              'text-yellow-600 dark:text-yellow-400'
                            }`} size={24} />
                          </div>
                          <div>
                            <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} capitalize`}>
                              {tip.type === 'trick' ? 'Helpful Trick' : tip.type === 'suggestion' ? 'Action Suggestion' : 'Daily Tip'}
                            </h3>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Saved on {new Date(tip.savedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="pl-4 border-l-4 border-teal-500 dark:border-teal-400">
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{tip.content}</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className={`text-center p-12 border-2 border-dashed ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'} rounded-xl`}>
                      <FaBookmark size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No saved tips yet</p>
                      <p className="mt-2">Save tips that you find helpful to access them later</p>
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

    
      <AnimatePresence>
        {showCopiedNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            Tip copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {selectedTip && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${
              selectedTip.saved ? "bg-teal-600" : "bg-red-500"
            } text-white px-6 py-3 rounded-lg shadow-lg`}
          >
            {selectedTip.saved ? "Tip saved successfully!" : "Tip removed from saved items"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tips;