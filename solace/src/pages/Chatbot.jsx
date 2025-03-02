import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { FaTasks, FaCheckCircle, FaLightbulb, FaRobot, FaMicrophone, FaPaperPlane, FaSpinner, FaStop, FaVolumeMute, FaVolumeUp, FaTrash, FaHistory, FaMoon, FaSun, FaGlobe } from "react-icons/fa";
import Lottie from "react-lottie";
import animationData from "../animations/listening.json";
import thinkingAnimationData from "../animations/thinking.json";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Chatbot = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previousChats, setPreviousChats] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [typingEffect, setTypingEffect] = useState("");
  const [fullResponse, setFullResponse] = useState("");
  const [chatId, setChatId] = useState(null);
  const [emotion, setEmotion] = useState("neutral");
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem("selectedLanguage") || "en");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const chatContainerRef = useRef(null);
  const timerRef = useRef(null);
  const chatContextRef = useRef({ previousMessages: [], userAssessment: null });

  const defaultOptions = { loop: true, autoplay: true, animationData, rendererSettings: { preserveAspectRatio: "xMidYMid slice" } };
  const thinkingOptions = { loop: true, autoplay: true, animationData: thinkingAnimationData, rendererSettings: { preserveAspectRatio: "xMidYMid slice" } };

  const SERVER_URL = "http://localhost:5000"; 

  const languageNames = {
    en: "English",
    de: "German",
    hi: "Hindi",
    fr: "French",
    ta: "Tamil",
    kn: "Kannada",
    es: "Spanish",
  };

  const initialMessages = {
    en: "I'm here to listen and support you. How are you feeling today?",
    de: "Ich bin hier, um zuzuhören und zu unterstützen. Wie fühlen Sie sich heute?",
    hi: "मैं यहाँ सुनने और समर्थन करने के लिए हूँ। आज आप कैसा महसूस कर रहे हैं?",
    fr: "Je suis là pour écouter et vous soutenir. Comment vous sentez-vous aujourd'hui?",
    ta: "நான் இங்கே கேட்கவும் ஆதரவளிக்கவும் இருக்கிறேன். இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?",
    kn: "ನಾನು ಕೇಳಲು ಮತ್ತು ಬೆಂಬಲಿಸಲು ಇಲ್ಲಿದ್ದೇನೆ. ಇಂದು ನೀವು ಹೇಗಿದ್ದೀರಿ?",
    es: "Estoy aquí para escuchar y apoyarte. ¿Cómo te sientes hoy?",
  };

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        if (auth.currentUser) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserName(userSnap.data().name);
          } else {
            console.warn("User document does not exist in Firestore.");
          }
        } else {
          console.warn("No authenticated user found.");
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    fetchUserName();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userRef = collection(db, "users");
        const q = query(userRef, where("uid", "==", auth.currentUser.uid), limit(1));
        const userSnap = await getDocs(q);
        if (!userSnap.empty) setUserName(userSnap.docs[0].data().name);

        const storedChatId = localStorage.getItem("currentChatId");
        if (storedChatId) {
          setChatId(storedChatId);
          const storedChat = localStorage.getItem(`chat_${storedChatId}`);
          if (storedChat) setChatHistory(JSON.parse(storedChat));
          else initializeChat();
        } else {
          const newChatId = `chat_${Date.now()}`;
          setChatId(newChatId);
          localStorage.setItem("currentChatId", newChatId);
          initializeChat();
        }
        loadPreviousSessions();
      }
    };

    fetchUserData();
    const darkModePref = localStorage.getItem("darkMode") === "true";
    setDarkMode(darkModePref);
    if (darkModePref) document.documentElement.classList.add("dark");

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudio();
    };
  }, []);

  const loadPreviousSessions = () => {
    const chatKeys = Object.keys(localStorage).filter((key) => key.startsWith("chat_"));
    const chatSessions = chatKeys.map((key) => {
      const chatData = JSON.parse(localStorage.getItem(key));
      return {
        id: key,
        lastMessage: chatData[chatData.length - 1]?.text || "New conversation",
        timestamp: chatData[chatData.length - 1]?.timestamp || Date.now(),
        preview: chatData.slice(0, 2).map((msg) => msg.text).join(" | "),
      };
    });
    chatSessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setPreviousChats(chatSessions);
  };

  const initializeChat = () => {
    const initialMessageText = initialMessages[selectedLanguage] || initialMessages["en"];
    const initialMessage = {
      sender: "bot",
      text: initialMessageText,
      timestamp: new Date().toISOString(),
      emotion: "caring",
    };
    setChatHistory([initialMessage]);
    if (chatId) localStorage.setItem(`chat_${chatId}`, JSON.stringify([initialMessage]));
  };

  useEffect(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    if (chatHistory.length > 0 && chatId) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatHistory));
      chatContextRef.current.previousMessages = chatHistory.slice(-10);
    }
  }, [chatHistory, chatId]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (fullResponse) {
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i < fullResponse.length) {
          setTypingEffect(fullResponse.substring(0, i + 1));
          i++;
        } else {
          clearInterval(typingInterval);
          setTypingEffect("");
          setFullResponse("");
          setChatHistory((prev) => {
            const newHistory = [...prev];
            const lastMsg = newHistory[newHistory.length - 1];
            if (lastMsg && lastMsg.isTyping) newHistory[newHistory.length - 1] = { ...lastMsg, text: fullResponse, isTyping: false };
            return newHistory;
          });
        }
      }, 20);
      return () => clearInterval(typingInterval);
    }
  }, [fullResponse]);

  const fetchUserAssessment = async () => {
    if (auth.currentUser) {
      const userId = auth.currentUser.uid;
      console.log("Fetching assessment for user:", userId);

      try {
        const q = query(
          collection(db, "userAssessments"),
          where("userId", "==", userId),
          orderBy("timestamp", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        console.log("Assessment query results:", querySnapshot.size);

        if (!querySnapshot.empty) {
          const assessmentData = querySnapshot.docs[0].data();
          console.log("Raw assessment data:", assessmentData);

          if (assessmentData["output.json"]) {
            console.log("Found output.json:", assessmentData["output.json"]);
            chatContextRef.current.userAssessment = assessmentData;
            return assessmentData;
          } else {
            console.warn("Assessment found but output.json is missing or null");
          }
        } else {
          console.warn("No assessment found for user");
        }
      } catch (error) {
        console.error("Error fetching assessment:", error);
      }
    } else {
      console.warn("No authenticated user for assessment fetch");
    }
    return null;
  };

  const handleTextSubmit = async () => {
    if (!message.trim() || isLoading) return;
    stopAudio();
    setIsLoading(true);

    const userMessage = { sender: "user", text: message, timestamp: new Date().toISOString() };
    setChatHistory((prev) => [...prev, userMessage]);
    const currentMessage = message;
    setMessage("");

    setChatHistory((prev) => [...prev, { sender: "bot", text: "", timestamp: new Date().toISOString(), isTyping: true }]);

    try {
      if (!chatContextRef.current.userAssessment) await fetchUserAssessment();
      const prompt = createEnhancedPrompt(currentMessage);
      const response = await fetch(`${SERVER_URL}/api/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Audio: null, prompt }),
      });
      if (!response.ok) throw new Error("Failed to process text");
      const { text: responseText } = await response.json();
      const detectedEmotion = analyzeEmotionalTone(responseText);
      setEmotion(detectedEmotion);

      setChatHistory((prev) => prev.filter((msg) => !msg.isTyping));
      setFullResponse(responseText);
      setChatHistory((prev) => [...prev, { sender: "bot", text: "", timestamp: new Date().toISOString(), emotion: detectedEmotion, isTyping: true }]);

      speakText(responseText);
    } catch (error) {
      console.error("Error in text response:", error);
      setChatHistory((prev) => [
        ...prev.filter((msg) => !msg.isTyping),
        { sender: "bot", text: "Something went wrong, but I'm here for you!", timestamp: new Date().toISOString(), emotion: "concerned" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const createEnhancedPrompt = (userMessage) => {
    const languageInstruction = `Please provide your response in ${languageNames[selectedLanguage]}.`;
    const recentMessages = chatContextRef.current.previousMessages
      .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
      .join("\n");
    const assessment = chatContextRef.current.userAssessment;

    return `
${languageInstruction}

**Goal:**  
Provide heartfelt, empathetic support to users facing emotional challenges. Your aim is to comfort, validate, and gently uplift them without overwhelming or diagnosing—think of yourself as a caring friend 🌟.

**Output:**  
A warm, conversational response that acknowledges the user’s feelings, offers subtle encouragement, and provides coping strategies if appropriate. If the user asks for steps or tasks, present them in clear, organized bullet points.

**Instructions:**  
- Start by validating the user’s emotions with kindness (e.g., "I hear you, and it’s okay to feel this way 💖").  
- Reflect their message subtly to show you’re listening (e.g., "It sounds like things have been tough lately").  
- Offer gentle, non-pushy suggestions for coping (e.g., "Maybe a little break could help?").  
- Invite them to share more with open-ended questions (e.g., "What’s been weighing on your mind?").  
- If they ask for steps/tasks, structure your reply with bullet points for clarity.  
- Reassure them their feelings are valid and this space is safe 🌈.  
- If they seem deeply distressed, softly suggest professional support (e.g., "Talking to someone might lighten the load—want help finding resources?").  

**Context:**  
You have:  
- Recent conversation: ${recentMessages || "No previous messages."}  
- Assessment data: ${assessment ? JSON.stringify(assessment["output.json"] || {}, null, 2) : "No recent assessment available."}  
Use this subtly to understand their emotional state, but keep it abstracted—focus on their current message over past data.

**Behaviour:**  
- Be patient, non-judgmental, and uplifting—like a supportive companion 🤗.  
- Avoid clinical vibes or over-relying on assessment details; prioritize their words.  
- Don’t assume—let their message guide you, and check in if unsure (e.g., "Did I catch that right?").  

**Style of Reply:**  
- Warm, casual, and human (use contractions like "I’m" or "you’re").  
- Sprinkle in emojis to boost friendliness (e.g., 😊, 🌟, 💪).  
- Keep it flowing naturally, not robotic.  
- Use bullet points (e.g., "- Step 1") for any steps/tasks they request.

**Example:**  
*User Message:* "I’m so stressed about work."  
*Response:* "Oh, I hear you—work stress can feel so heavy, right? 😓 It’s totally okay to feel that way. Maybe taking a quick moment to breathe could ease things a bit? What’s been the toughest part for you lately? I’m here for you 💖."  
*If Asked for Steps:* "Here’s a little plan:  
- Take 5 deep breaths to reset 🌬️.  
- Jot down one thing you can tackle today ✍️.  
- Give yourself a small break—you deserve it! 😊"  

Now, respond to this message: "${userMessage}" with all the warmth and support you’ve got! 🌼
    `;
  };

  const analyzeEmotionalTone = (text) => {
    const lowercaseText = text.toLowerCase();
    if (lowercaseText.includes("sorry") || lowercaseText.includes("difficult")) return "empathetic";
    if (lowercaseText.includes("great") || lowercaseText.includes("wonderful")) return "encouraging";
    if (lowercaseText.includes("understand") || lowercaseText.includes("feel")) return "understanding";
    if (lowercaseText.includes("suggest") || lowercaseText.includes("try")) return "helpful";
    return "caring";
  };

  const handleAudioRecording = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        const audioChunks = [];

        recorder.ondataavailable = (event) => audioChunks.push(event.data);
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/mp3" });
          await processAudio(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        setIsRecording(true);
        toast.info("Listening to you...", { autoClose: false, toastId: "recording" });
      } catch (error) {
        console.error("Error accessing microphone:", error);
        toast.error("Unable to access microphone. Check permissions.");
      }
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
        toast.dismiss("recording");
        toast.info("Processing your audio...");
      }
    }
  };

  const processAudio = async (audioBlob) => {
    setIsLoading(true);
    stopAudio();
    const userMessage = { sender: "user", text: "(Audio message)", timestamp: new Date().toISOString(), isAudio: true };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatHistory((prev) => [...prev, { sender: "bot", text: "", timestamp: new Date().toISOString(), isTyping: true }]);

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      if (!chatContextRef.current.userAssessment) await fetchUserAssessment();
      console.debug("Raw User Assessment (output.json):", chatContextRef.current.userAssessment?.["output.json"]);

      const languageInstruction = `Please provide your response in ${languageNames[selectedLanguage]}.`;
      const audioPrompt = `
${languageInstruction}

**Goal:**  
Deliver deeply empathetic, comforting support by analyzing the user’s spoken words *and* emotional tone. Your primary aim is to understand their current mood accurately, validate it, and uplift them gently—like a friend who truly gets it 🌟.

**Output:**  
A kind, supportive response that reflects their mood (based on audio analysis), offers comfort, and suggests coping strategies if fitting. Use bullet points for steps/tasks if requested.

**Instructions:**  
- Begin with an accurate description of their current mood based on the tone (e.g., "Your voice sounds a little anxious—does that feel right?").  
- Validate their emotions warmly (e.g., "It’s okay to feel this way, and I’m here with you 💕").  
- Offer subtle, uplifting suggestions tailored to their mood (e.g., "Maybe a calming breath could help?").  
- Encourage them to share more (e.g., "Want to tell me what’s going on?").  
- If they request steps/tasks, list them in clear bullet points.  
- If the tone suggests distress, gently mention support options (e.g., "There’s help out there if you need it—want to explore that?").  
- Keep it light and human—focus on comfort, not analysis overload.

**Context:**
${chatContextRef.current.userAssessment?.["output.json"]}
weave in assessment data lightly for extra insight if relevant.

**Behaviour:**  
- Be attentive and caring—tune into their voice like a compassionate listener 🎧.  
- Don’t over-analyze or assume; let their tone and words lead, and check your mood interpretation (e.g., "Am I hearing you right?").  
- Stay patient and supportive, creating a safe vibe 🌈.

**Style of Reply:**  
- Warm, natural, and conversational (e.g., "I’m so glad you reached out").  
- Add emojis for a friendly touch (e.g., 😊, 💖, 🌼).  
- Use bullet points for steps/tasks when asked.  
- Avoid stiff, robotic phrasing—keep it flowing and heartfelt.

**Example:**  
*Transcription:* "Hi, I’m just so tired today."  
*Tone:* Fatigue  
*Response:* "Hey, your voice sounds really tired—I can feel that weariness coming through 😔. It’s okay to feel wiped out sometimes. Maybe a little rest could lift you up? Want to chat about what’s been draining you? I’m here 🤗."  
*If Asked for Steps:* "Here’s a gentle way to recharge:  
- Sit back for 5 minutes with your eyes closed 🌙.  
- Sip some water to refresh 💧.  
- Tell me one thing you’d like to let go of today—I’ll listen 💕."

Now, generate your response.
      `;
      console.debug("Generated Audio Prompt:", audioPrompt);

      const response = await fetch(`${SERVER_URL}/api/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Audio, prompt: audioPrompt }),
      });
      if (!response.ok) throw new Error("Failed to process audio");
      const { text: responseText } = await response.json();
      const detectedEmotion = analyzeEmotionalTone(responseText);
      setEmotion(detectedEmotion);

      setChatHistory((prev) => prev.filter((msg) => !msg.isTyping));
      setFullResponse(responseText);
      setChatHistory((prev) => [...prev, { sender: "bot", text: "", timestamp: new Date().toISOString(), emotion: detectedEmotion, isTyping: true }]);

      speakText(responseText);
    } catch (error) {
      console.error("Error in audio processing:", error);
      setChatHistory((prev) => [
        ...prev.filter((msg) => !msg.isTyping),
        { sender: "bot", text: "I couldn’t process your audio fully, but I’m here to support you!", timestamp: new Date().toISOString(), emotion: "concerned" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = async (text) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: selectedLanguage }),
      });
      if (!response.ok) throw new Error("TTS request failed");
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onpause = () => setIsPlaying(false);
      setCurrentAudio(audio);
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      toast.error("Couldn't play the voice response.");
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const startNewChat = () => {
    const newChatId = `chat_${Date.now()}`;
    setChatId(newChatId);
    localStorage.setItem("currentChatId", newChatId);
    setChatHistory([]);
    initializeChat();
    setShowHistory(false);
    loadPreviousSessions();
  };

  const loadChat = (id) => {
    const chatData = localStorage.getItem(id);
    if (chatData) {
      setChatHistory(JSON.parse(chatData));
      setChatId(id);
      localStorage.setItem("currentChatId", id);
      setShowHistory(false);
    }
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    localStorage.removeItem(id);
    if (id === chatId) startNewChat();
    loadPreviousSessions();
  };

  const getEmotionStyle = (emotion) => {
    switch (emotion) {
      case "caring": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100";
      case "empathetic": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100";
      case "encouraging": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "understanding": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case "helpful": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "concerned": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
      default: return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100";
    }
  };

  const handleLanguageSelect = (lang) => {
    setSelectedLanguage(lang);
    localStorage.setItem("selectedLanguage", lang);
    setShowLanguageMenu(false);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <ToastContainer theme={darkMode ? "dark" : "light"} position="top-right" />

      <nav className={`bg-gradient-to-r ${darkMode ? "from-teal-800 to-cyan-900" : "from-teal-600 to-cyan-600"} p-4 sticky top-0 z-10 shadow-md`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm">
              <span className="text-teal-600 text-xl font-bold">S</span>
            </motion.div>
            <h1 className="text-xl font-bold text-white">Solace</h1>
          </div>
          <div className="flex gap-4 text-white">
            <button onClick={() => navigate("/tasks")} className="flex flex-col items-center hover:text-teal-200 transition-colors duration-300">
              <FaTasks size={20} />
              <span className="text-xs mt-1">Tasks</span>
            </button>
            <button onClick={() => navigate("/completion")} className="flex flex-col items-center hover:text-teal-200 transition-colors duration-300">
              <FaCheckCircle size={20} />
              <span className="text-xs mt-1">Completion</span>
            </button>
            <button onClick={() => navigate("/tips")} className="flex flex-col items-center hover:text-teal-200 transition-colors duration-300">
              <FaLightbulb size={20} />
              <span className="text-xs mt-1">Tips</span>
            </button>
            <button className="flex flex-col items-center text-teal-200">
              <FaRobot size={20} />
              <span className="text-xs mt-1">Chatbot</span>
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="flex flex-col items-center hover:text-teal-200 transition-colors duration-300 ml-2">
              {darkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
              <span className="text-xs mt-1">{darkMode ? "Light" : "Dark"}</span>
            </button>
            <div className="relative">
              <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className="flex flex-col items-center hover:text-teal-200 transition-colors duration-300 ml-2">
                <FaGlobe size={20} />
                <span className="text-xs mt-1">Language</span>
              </button>
              {showLanguageMenu && (
                <div className="absolute top-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-2 z-20 w-40">
                  {Object.entries(languageNames).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageSelect(code)}
                      className={`block w-full text-left px-4 py-2 hover:bg-teal-100 dark:hover:bg-teal-900 ${selectedLanguage === code ? "bg-teal-100 dark:bg-teal-900" : ""}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`fixed left-0 top-0 h-full w-64 z-20 shadow-xl overflow-y-auto p-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Chat History</h3>
                <button onClick={() => setShowHistory(false)} className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>✕</button>
              </div>
              <button
                onClick={startNewChat}
                className={`w-full p-3 mb-4 rounded-lg ${darkMode ? "bg-teal-700 text-white hover:bg-teal-600" : "bg-teal-500 text-white hover:bg-teal-400"} transition-colors duration-200 flex items-center justify-center`}
              >
                <span className="mr-2">+</span> New Chat
              </button>
              <div className="space-y-2">
                {previousChats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => loadChat(chat.id)}
                    className={`p-3 rounded-lg cursor-pointer relative ${chat.id === chatId ? (darkMode ? "bg-teal-800 text-white" : "bg-teal-100 text-teal-800") : (darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200")} transition-colors duration-200`}
                  >
                    <div className="pr-8 truncate text-sm">{chat.preview}</div>
                    <div className="text-xs mt-1 opacity-70">{new Date(chat.timestamp).toLocaleString()}</div>
                    <button onClick={(e) => deleteChat(chat.id, e)} className="absolute right-2 top-2 p-1 rounded-full hover:bg-red-500 hover:text-white transition-colors duration-200">
                      <FaTrash size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`bg-gradient-to-r ${darkMode ? "from-teal-700 to-cyan-800" : "from-teal-500 to-cyan-500"} rounded-xl p-6 mb-8 text-white shadow-lg`}>
          <h2 className="text-3xl font-bold mb-2 animate-fade-in">Hello, {userName}! I'm here for you.</h2>
          <p className="text-teal-100">Speak or type to me, and I'll listen with all my heart.</p>
        </div>

        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 h-96 overflow-y-auto`} ref={chatContainerRef}>
          {chatHistory.map((msg, index) => (
            <div key={index} className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`p-4 rounded-lg max-w-xs ${msg.sender === "user" ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100" : getEmotionStyle(msg.emotion)}`}>
                {msg.isTyping && !typingEffect ? (
                  <Lottie options={thinkingOptions} height={40} width={40} />
                ) : msg.isTyping && typingEffect ? (
                  typingEffect
                ) : (
                  msg.text
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          {isLoading && !fullResponse && (
            <div className="text-gray-500 dark:text-gray-400 text-center">
              <Lottie options={thinkingOptions} height={50} width={50} />
            </div>
          )}
        </div>

        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex items-center gap-4`}>
          <button onClick={() => setShowHistory(true)} className="p-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors">
            <FaHistory size={20} />
          </button>
          <button
            onClick={handleAudioRecording}
            className={`p-3 rounded-full ${isRecording ? "bg-red-500" : "bg-teal-500"} text-white hover:opacity-80 transition-opacity flex items-center`}
            disabled={isLoading}
          >
            {isRecording ? (
              <>
                <FaStop size={20} />
                <span className="ml-2 text-sm">{formatTime(recordingTime)}</span>
              </>
            ) : (
              <FaMicrophone size={20} />
            )}
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder="Type your message..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isLoading}
          />
          <button
            onClick={handleTextSubmit}
            className="p-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-teal-300 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? <FaSpinner size={20} className="animate-spin" /> : <FaPaperPlane size={20} />}
          </button>
          <button
            onClick={stopAudio}
            className={`p-3 rounded-full ${isPlaying ? "bg-red-500" : "bg-gray-500"} text-white hover:opacity-80 transition-opacity`}
            disabled={!isPlaying}
          >
            {isPlaying ? <FaVolumeUp size={20} /> : <FaVolumeMute size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;