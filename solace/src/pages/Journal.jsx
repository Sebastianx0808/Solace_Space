import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  FaBook,
  FaPlus,
  FaPencilAlt,
  FaTrash,
  FaSearch,
  FaSave,
  FaTimes,
  FaTag,
  FaStar,
  FaChartLine,
  FaCalendarAlt,
  FaFilter,
  FaAngleDown,
  FaAngleUp,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Journal = () => {
  const navigate = useNavigate();
  const [journalEntries, setJournalEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    mood: "neutral",
    tags: [],
    isPrivate: false,
    isFavorite: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [moodStats, setMoodStats] = useState({
    positive: 0,
    neutral: 0,
    negative: 0,
  });
  const [theme, setTheme] = useState("light");
  const [showFilters, setShowFilters] = useState(false);

  const contentRef = useRef(null);

  const moods = [
    { id: "excited", label: "Excited", emoji: "🤩", color: "bg-yellow-400" },
    { id: "happy", label: "Happy", emoji: "😊", color: "bg-green-400" },
    { id: "grateful", label: "Grateful", emoji: "🙏", color: "bg-blue-400" },
    { id: "calm", label: "Calm", emoji: "😌", color: "bg-indigo-400" },
    { id: "neutral", label: "Neutral", emoji: "😐", color: "bg-gray-400" },
    { id: "tired", label: "Tired", emoji: "😴", color: "bg-orange-400" },
    { id: "anxious", label: "Anxious", emoji: "😰", color: "bg-purple-400" },
    { id: "sad", label: "Sad", emoji: "😢", color: "bg-blue-600" },
    { id: "frustrated", label: "Frustrated", emoji: "😤", color: "bg-red-400" },
  ];

  const moodValues = {
    sad: 1,
    frustrated: 2,
    anxious: 2,
    tired: 3,
    neutral: 3,
    calm: 4,
    grateful: 4,
    happy: 5,
    excited: 5,
  };

  useEffect(() => {
    const fetchJournalEntries = async () => {
      if (!auth.currentUser) {
        navigate("/login");
        return;
      }
      try {
        setIsLoading(true);
        const userId = auth.currentUser.uid;
        const journalRef = collection(db, "users", userId, "journalEntries");
        const q = query(journalRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const entries = [];
        let positiveCount = 0;
        let neutralCount = 0;
        let negativeCount = 0;
        querySnapshot.forEach((doc) => {
          const entry = {
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          };
          entries.push(entry);
          const category = getMoodCategory(entry.mood);
          if (category === "positive") positiveCount++;
          else if (category === "neutral") neutralCount++;
          else negativeCount++;
        });
        setJournalEntries(entries);
        setMoodStats({
          positive: positiveCount,
          neutral: neutralCount,
          negative: negativeCount,
        });
      } catch (error) {
        console.error("Error fetching journal entries:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJournalEntries();
  }, [navigate]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.height = "auto";
      contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
    }
  }, [newEntry.content]);

  const getMoodCategory = (mood) => {
    const positiveList = ["excited", "happy", "grateful", "calm"];
    const neutralList = ["neutral"];
    return positiveList.includes(mood)
      ? "positive"
      : neutralList.includes(mood)
      ? "neutral"
      : "negative";
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (newEntry.title.trim() === "" || newEntry.content.trim() === "") {
      alert("Please enter both title and content for your journal entry.");
      return;
    }
    try {
      setIsLoading(true);
      const userId = auth.currentUser.uid;
      const journalRef = collection(db, "users", userId, "journalEntries");
      await addDoc(journalRef, {
        ...newEntry,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        journalEntriesCount: increment(1),
      });
      setNewEntry({
        title: "",
        content: "",
        mood: "neutral",
        tags: [],
        isPrivate: false,
        isFavorite: false,
      });
      const updatedJournalRef = collection(db, "users", userId, "journalEntries");
      const q = query(updatedJournalRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const entries = [];
      querySnapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        });
      });
      setJournalEntries(entries);
      const category = getMoodCategory(newEntry.mood);
      setMoodStats((prev) => ({
        ...prev,
        [category]: prev[category] + 1,
      }));
    } catch (error) {
      console.error("Error adding journal entry:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEntry = (entry) => {
    setNewEntry({
      title: entry.title,
      content: entry.content,
      mood: entry.mood || "neutral",
      tags: entry.tags || [],
      isPrivate: entry.isPrivate || false,
      isFavorite: entry.isFavorite || false,
    });
    setIsEditing(true);
    setCurrentEditId(entry.id);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleUpdateEntry = async (e) => {
    e.preventDefault();
    if (newEntry.title.trim() === "" || newEntry.content.trim() === "") {
      alert("Please enter both title and content for your journal entry.");
      return;
    }
    try {
      setIsLoading(true);
      const userId = auth.currentUser.uid;
      const entryRef = doc(db, "users", userId, "journalEntries", currentEditId);
      const previousEntry = journalEntries.find((entry) => entry.id === currentEditId);
      const previousCategory = getMoodCategory(previousEntry.mood);
      const newCategory = getMoodCategory(newEntry.mood);
      await updateDoc(entryRef, {
        ...newEntry,
        updatedAt: new Date().toISOString(),
      });
      setNewEntry({
        title: "",
        content: "",
        mood: "neutral",
        tags: [],
        isPrivate: false,
        isFavorite: false,
      });
      setIsEditing(false);
      setCurrentEditId(null);
      const journalRef = collection(db, "users", userId, "journalEntries");
      const q = query(journalRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const entries = [];
      querySnapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        });
      });
      setJournalEntries(entries);
      if (previousCategory !== newCategory) {
        setMoodStats((prev) => ({
          ...prev,
          [previousCategory]: prev[previousCategory] - 1,
          [newCategory]: prev[newCategory] + 1,
        }));
      }
    } catch (error) {
      console.error("Error updating journal entry:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this journal entry?")) {
      return;
    }
    try {
      setIsLoading(true);
      const userId = auth.currentUser.uid;
      const entryToDelete = journalEntries.find((entry) => entry.id === id);
      const category = getMoodCategory(entryToDelete.mood);
      const entryRef = doc(db, "users", userId, "journalEntries", id);
      await deleteDoc(entryRef);
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        journalEntriesCount: increment(-1),
      });
      setJournalEntries(journalEntries.filter((entry) => entry.id !== id));
      setMoodStats((prev) => ({
        ...prev,
        [category]: prev[category] - 1,
      }));
    } catch (error) {
      console.error("Error deleting journal entry:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setNewEntry({
      title: "",
      content: "",
      mood: "neutral",
      tags: [],
      isPrivate: false,
      isFavorite: false,
    });
    setIsEditing(false);
    setCurrentEditId(null);
  };

  const handleToggleFavorite = async (id, isFavorite) => {
    try {
      const userId = auth.currentUser.uid;
      const entryRef = doc(db, "users", userId, "journalEntries", id);
      await updateDoc(entryRef, {
        isFavorite: !isFavorite,
      });
      setJournalEntries(
        journalEntries.map((entry) =>
          entry.id === id ? { ...entry, isFavorite: !isFavorite } : entry
        )
      );
    } catch (error) {
      console.error("Error updating favorite status:", error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleTagInput = (e) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!newEntry.tags.includes(tagInput.trim())) {
        setNewEntry({
          ...newEntry,
          tags: [...newEntry.tags, tagInput.trim()],
        });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNewEntry({
      ...newEntry,
      tags: newEntry.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const filteredEntries = journalEntries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.tags && entry.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    let matchesFilter = true;
    if (filter === "favorites") {
      matchesFilter = entry.isFavorite;
    } else if (filter === "private") {
      matchesFilter = entry.isPrivate;
    } else if (filter === "positive") {
      matchesFilter = ["excited", "happy", "grateful", "calm"].includes(entry.mood);
    } else if (filter === "neutral") {
      matchesFilter = entry.mood === "neutral";
    } else if (filter === "negative") {
      matchesFilter = ["tired", "anxious", "sad", "frustrated"].includes(entry.mood);
    }
    return matchesSearch && matchesFilter;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortOrder === "newest") {
      return new Date(b.timestamp) - new Date(a.timestamp);
    } else if (sortOrder === "oldest") {
      return new Date(a.timestamp) - new Date(b.timestamp);
    } else if (sortOrder === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMoodEmoji = (moodId) => {
    const mood = moods.find((m) => m.id === moodId);
    return mood ? mood.emoji : "😐";
  };

  const calculateStreak = (entries) => {
    if (entries.length === 0) return 0;
    const sortedEntries = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    let streak = 1;
    let currentDate = new Date(sortedEntries[0].timestamp);
    for (let i = 1; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].timestamp);
      const diffDays = Math.round((currentDate - entryDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
        currentDate = entryDate;
      } else if (diffDays > 1) {
        break;
      }
    }
    return streak;
  };

  const getMoodTrendData = (entries) => {
    const moodData = {};
    entries.forEach((entry) => {
      const date = new Date(entry.timestamp).toDateString();
      if (!moodData[date]) {
        moodData[date] = [];
      }
      moodData[date].push(moodValues[entry.mood] || 3);
    });
    const labels = Object.keys(moodData).sort();
    const data = labels.map((date) => {
      const moods = moodData[date];
      const average = moods.reduce((sum, val) => sum + val, 0) / moods.length;
      return average;
    });
    return { labels, data };
  };

  const { labels, data } = getMoodTrendData(journalEntries);
  const chartData = {
    labels,
    datasets: [
      {
        label: "Average Mood",
        data,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
    ],
  };

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gradient-to-b from-gray-900 to-purple-900 text-gray-100" : "bg-gradient-to-b from-blue-50 to-green-50 text-gray-800"}`}>
      
      <nav className="bg-teal-600 p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-2xl font-bold text-white">Solace Journal</h1>
            <span className="text-white text-sm">Streak: {calculateStreak(journalEntries)} days</span>
          </div>
          <div className="flex items-center">
            <button onClick={toggleTheme} className="text-white mr-4 hover:text-teal-200 transition-colors">
              {theme === "dark" ? <FaSun size={20} /> : <FaMoon size={20} />}
            </button>
            <button onClick={() => navigate("/home")} className="text-white hover:text-teal-200 transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </nav>

    
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`rounded-xl p-6 mb-8 shadow-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}
        >
          <h2 className="text-2xl font-bold mb-4">
            {isEditing ? "Edit Journal Entry" : "Create New Journal Entry"}
          </h2>
          <form onSubmit={isEditing ? handleUpdateEntry : handleAddEntry}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium mb-1 flex items-center">
                <FaBook className="text-gray-500 mr-2" /> Title
              </label>
              <input
                type="text"
                id="title"
                value={newEntry.title}
                onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}
                placeholder="Enter a title for your journal entry"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium mb-1 flex items-center">
                <FaPencilAlt className="text-gray-500 mr-2" /> Content
              </label>
              <textarea
                id="content"
                ref={contentRef}
                value={newEntry.content}
                onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[150px] ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}
                placeholder="Write your thoughts, feelings, experiences..."
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">How are you feeling?</label>
              <div className="grid grid-cols-3 gap-2">
                {moods.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => setNewEntry({ ...newEntry, mood: mood.id })}
                    className={`p-2 rounded-lg flex flex-col items-center transition-all ${newEntry.mood === mood.id ? "bg-blue-100 border-2 border-blue-500 scale-105" : "bg-gray-100 hover:bg-gray-200"}`}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className="text-sm">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tags</label>
              <div className={`flex flex-wrap gap-2 p-2 border rounded-md mb-2 ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}>
                {newEntry.tags.map((tag) => (
                  <span key={tag} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-blue-600 hover:text-blue-800">
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInput}
                  className={`outline-none flex-grow min-w-[100px] ${theme === "dark" ? "bg-gray-700 text-white" : "bg-white"}`}
                  placeholder={newEntry.tags.length === 0 ? "Type tags and press Enter" : ""}
                />
              </div>
              <p className="text-xs text-gray-500">Press Enter to add a tag</p>
            </div>
            <div className="flex flex-wrap gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newEntry.isPrivate}
                  onChange={() => setNewEntry({ ...newEntry, isPrivate: !newEntry.isPrivate })}
                  className="mr-2"
                />
                Mark as private
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newEntry.isFavorite}
                  onChange={() => setNewEntry({ ...newEntry, isFavorite: !newEntry.isFavorite })}
                  className="mr-2"
                />
                Add to favorites
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className={`px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : isEditing ? "Update Entry" : "Save Entry"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`rounded-xl p-6 mb-8 shadow-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Mood Tracker</h3>
            <button onClick={() => setShowMoodTracker(!showMoodTracker)} className="text-teal-600 hover:text-teal-800">
              {showMoodTracker ? <FaAngleUp /> : <FaAngleDown />}
            </button>
          </div>
          {showMoodTracker && (
            <div className="mt-2">
              <div className="flex flex-wrap justify-around mb-4">
                <div className="text-center p-3">
                  <div className="text-3xl font-bold text-green-500">{moodStats.positive}</div>
                  <div className="text-sm">Positive</div>
                </div>
                <div className="text-center p-3">
                  <div className="text-3xl font-bold text-gray-500">{moodStats.neutral}</div>
                  <div className="text-sm">Neutral</div>
                </div>
                <div className="text-center p-3">
                  <div className="text-3xl font-bold text-red-500">{moodStats.negative}</div>
                  <div className="text-sm">Negative</div>
                </div>
              </div>
              <Line data={chartData} />
              <p className="text-sm mt-4">
                Tracking your mood can help identify patterns and triggers that affect your emotional well-being.
              </p>
            </div>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`rounded-xl p-6 shadow-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}
        >
          <div className="flex flex-wrap justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              Your Journal Entries
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({journalEntries.length} {journalEntries.length === 1 ? "entry" : "entries"})
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
              <div className={`relative flex items-center ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"} rounded-md px-3 py-1`}>
                <FaSearch className="text-gray-500 mr-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search entries..."
                  className={`outline-none ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}
                />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1 px-3 py-1 rounded-md ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"}`}>
                <FaFilter size={14} />
                <span>Filters</span>
              </button>
            </div>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                <div className="flex flex-wrap gap-2 mb-2">
                  <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`px-3 py-1 rounded-md ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} border`}>
                    <option value="all">All Entries</option>
                    <option value="favorites">Favorites</option>
                    <option value="private">Private</option>
                    <option value="positive">Positive Mood</option>
                    <option value="neutral">Neutral Mood</option>
                    <option value="negative">Negative Mood</option>
                  </select>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={`px-3 py-1 rounded-md ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} border`}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title">By Title</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {!isLoading && sortedEntries.length === 0 && (
            <div className="text-center py-8">
              <FaBook size={40} className="mx-auto text-gray-400 mb-2" />
              <p>No journal entries found</p>
              {searchTerm || filter !== "all" ? (
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">Start writing your first entry!</p>
              )}
            </div>
          )}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p>Loading entries...</p>
              </div>
            ) : (
              sortedEntries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg border ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"} shadow-sm hover:shadow-md hover:scale-105 transition-all`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-medium">{entry.title}</h4>
                        {entry.isPrivate && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Private</span>}
                        {entry.isFavorite && <FaStar className="text-yellow-400" size={16} />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <FaCalendarAlt size={12} />
                        <span>{formatDate(entry.timestamp)}</span>
                        <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleToggleFavorite(entry.id, entry.isFavorite)} className={`p-1.5 rounded-full ${entry.isFavorite ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-gray-500"}`} title={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}>
                        <FaStar size={16} />
                      </button>
                      <button onClick={() => handleEditEntry(entry)} className="p-1.5 rounded-full text-blue-500 hover:text-blue-600" title="Edit entry">
                        <FaPencilAlt size={16} />
                      </button>
                      <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 rounded-full text-red-500 hover:text-red-600" title="Delete entry">
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </div>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {entry.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{entry.content.length > 200 ? `${entry.content.substring(0, 200)}...` : entry.content}</div>
                  {entry.content.length > 200 && (
                    <button onClick={() => handleEditEntry(entry)} className="text-teal-600 hover:text-teal-800 text-sm mt-2">
                      Read more
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => document.getElementById("title").focus(), 500);
          }}
          className="bg-teal-600 text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-teal-700 transition-colors flex items-center"
        >
          <FaPlus size={20} className="sm:size-24" />
          <span className="ml-2 text-sm sm:text-base">New Entry</span>
        </button>
      </div>
    </div>
  );
};

export default Journal;