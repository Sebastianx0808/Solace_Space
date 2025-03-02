import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  Loader, 
  User, 
  HelpCircle, 
  Brain, 
  Activity, 
  HeartPulse, 
  Sparkles, 
  BarChart3
} from "lucide-react";
import confetti from "canvas-confetti";
import { GoogleGenerativeAI } from "@google/generative-ai";


const genAI = new GoogleGenerativeAI("AIzaSyAuPNe21f37ElukmyaveAVuyyGN5ONa-1E");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const Questionnaire = () => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState("next");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [processingState, setProcessingState] = useState("initial");
  const [analysisResult, setAnalysisResult] = useState(null);

  const processingMessages = [
    { text: "Analyzing your mental wellbeing...", icon: Brain },
    { text: "Evaluating response patterns...", icon: Activity },
    { text: "Identifying key strengths...", icon: Sparkles },
    { text: "Crafting personalized insights...", icon: HeartPulse },
    { text: "Preparing your wellness profile...", icon: BarChart3 }
  ];

  useEffect(() => {
    fetch('/questionnaire.json')
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch questions');
        return response.json();
      })
      .then(data => {
        setQuestions(data.questions);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading questions:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setUserName(userSnap.data().name);
      }
    };
    fetchUserData();
  }, []);

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (questionId, label, value) => {
    setResponses({ 
      ...responses, 
      [questionId]: { 
        question: currentQuestion.statement,
        label: label,
        value: value 
      } 
    });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setDirection("next");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setIsAnimating(false);
      }, 500);
    } else {
      handleSubmit();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setDirection("prev");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        setIsAnimating(false);
      }, 500);
    }
  };

  const callGeminiAPI = async (formattedResponses) => {
    setProcessingState("processing");
    
    try {
      const prompt = `
You are a mental health analytics engine. Process the user's JSON input (${JSON.stringify(formattedResponses)}) containing responses to 5 mental health questions (1=Never, 5=Always). Perform these operations step-by-step:

1. **Data Validation**:
- Verify all 5 questions have integer responses between 1-5
- Check WEMWBS questions are present (14 items)
- Confirm additional questions are present (15 items)

2. **Score Calculation**:
- Compute WEMWBS_score by summing 14 WEMWBS items
- Calculate overall_positive_affect: average of (14 WEMWBS + 6 positive additional questions)
- Calculate overall_negative_affect: average of 9 negative additional questions

3. **Specific Metrics**:
- Anxiety: Direct score from 'anxious or worried'
- Depression: Average of 'sad/down', 'sleep problems', 'concentration difficulties'
- Stress: Average of 'stressed', 'overwhelmed'
- Loneliness: Direct score
- Sleep problems: Direct score
- Physical symptoms: Direct score
- Concentration: Direct score
- Irritability: Direct score
- Strengths: Direct scores for motivation, happiness, social support, engagement, hope, emotion regulation

4. **Insight Generation**:
- Compare WEMWBS_score (14-70) against population norms
- Identify top 3 areas of concern (highest negative scores)
- Identify top 3 strengths (highest positive scores)
- Create a 1-sentence clinical summary using this template:
'A user with a [high/low] WEMWBS_score ([score]/70) [additional pattern] might [implication], suggesting [recommendation].'

Return results in this JSON structure:
{
  "WEMWBS_score": integer,
  "overall_positive_affect": float,
  "overall_negative_affect": float,
  "specific_concerns": {
    "anxiety": float,
    "depression": float,
    "stress": float,
    "loneliness": float,
    "sleep_problems": float,
    "physical_symptoms": float,
    "concentration_difficulties": float,
    "irritability": float
  },
  "specific_strengths": {
    "motivation": float,
    "happiness": float,
    "social_support": float,
    "engagement_in_activities": float,
    "hopefulness": float,
    "emotional_regulation": float
  },
  "clinical_summary": "string"
}
`;

      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % processingMessages.length;
        setProcessingState(`processing_${messageIndex}`);
      }, 3000);

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      
      const analysisResult = responseText;
      
      clearInterval(messageInterval);
      setAnalysisResult(analysisResult);
      localStorage.setItem('questionnaireCompleted', 'true');

      
      await storeResultsInFirebase(formattedResponses, analysisResult);

      setProcessingState("complete");
      
      setTimeout(() => {
        
        navigate("/home", { state: { analysisResult } });
      }, 1500);

    } catch (error) {
      console.error("Error processing questionnaire data with Gemini API:", error);
      setProcessingState("error");
      
      setTimeout(() => {
        navigate("/home", { state: { error: true } });
      }, 1500);
    }
  };

  const storeResultsInFirebase = async (answers, analysis) => {
    if (auth.currentUser) {
      const userId = auth.currentUser.uid;
      const timestamp = new Date().toISOString();
      
      try {
        const resultsRef = doc(db, "userAssessments", `${userId}_${timestamp}`);
        await setDoc(resultsRef, {
          userId: userId,
          timestamp: timestamp,
          "answer.json": answers,
          "output.json": analysis
        });
        console.log("Results stored successfully in Firebase");
      } catch (error) {
        console.error("Error storing results in Firebase:", error);
      }
    }
  };

  const handleSubmit = () => {
    const formattedResponses = {
      questions: Object.keys(responses).map(id => ({
        id,
        question: responses[id].question,
        label: responses[id].label,
        value: responses[id].value
      }))
    };
    
    localStorage.setItem('answers', JSON.stringify(formattedResponses));
    setSubmitted(true);
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    callGeminiAPI(formattedResponses);
    
  };

  const isOptionSelected = (questionId) => responses[questionId] !== undefined;

  const slideVariants = {
    enterFromRight: { x: 300, opacity: 0 },
    enterFromLeft: { x: -300, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exitToLeft: { x: -300, opacity: 0 },
    exitToRight: { x: 300, opacity: 0 }
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen bg-gradient-to-b from-sky-50 to-white">
        <div className="text-center p-8 rounded-lg shadow-lg bg-white">
          <Loader className="h-16 w-16 text-teal-blue animate-spin" />
          <p className="text-dark-navy font-medium text-xl">Loading your questionnaire...</p>
          <p className="text-medium-gray text-sm mt-2">This will just take a moment</p>
        </div>
      </div>
    );
  }

  if (submitted && processingState !== "complete" && processingState !== "error") {
    const currentMessageIndex = processingState.startsWith("processing_") 
      ? parseInt(processingState.split("_")[1]) 
      : 0;
    const CurrentIcon = processingMessages[currentMessageIndex].icon;
    
    return (
      <div className="container flex items-center justify-center min-h-screen bg-gradient-to-b from-sky-50 to-white">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center p-10 rounded-xl shadow-lg bg-white max-w-md w-full"
        >
          <motion.div 
            className="flex justify-center mb-6"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            <div className="relative">
              <motion.div 
                className="absolute inset-0"
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="h-24 w-24 rounded-full bg-teal-blue/10"></div>
              </motion.div>
              <CurrentIcon className="h-16 w-16 text-teal-blue relative z-10 m-4" />
            </div>
          </motion.div>
          
          <h2 className="text-dark-navy font-bold text-2xl mb-3">
            {processingMessages[currentMessageIndex].text}
          </h2>
          
          <p className="text-medium-gray mt-2">
            Our AI is carefully processing your responses
          </p>
          
          <div className="mt-8">
            <div className="h-2 bg-light-gray rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-teal-blue"
                animate={{ width: ['0%', '100%'], transition: { duration: 15, ease: "linear" } }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-medium-gray">
              <span>Processing</span>
              <span>Generating insights</span>
            </div>
          </div>
          
          <motion.div 
            className="mt-6 flex flex-wrap justify-center gap-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {['wellbeing', 'mindfulness', 'resilience', 'growth', 'balance'].map(tag => (
              <div key={tag} className="px-3 py-1 rounded-full bg-teal-blue/10 text-teal-blue text-xs">
                {tag}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (processingState === "error") {
    return (
      <div className="container flex items-center justify-center min-h-screen bg-gradient-to-b from-sky-50 to-white">
        <div className="text-center p-8 rounded-lg shadow-lg bg-white max-w-md w-full">
          <div className="flex justify-center mb-4 text-red-500">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-dark-navy">Oops!</h2>
          <p className="text-medium-gray mt-2">We encountered an issue processing your responses.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-4 py-2 bg-teal-blue text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-50 to-white px-4">
      <header className="w-full flex justify-between items-center px-6 py-6 mb-8">
        <div className="flex items-center">
          <User className="h-6 w-6 text-teal-blue mr-3" />
          <h2 className="text-dark-navy font-bold text-2xl">Welcome, {userName}</h2>
        </div>
        <div className="text-sm bg-teal-blue text-white px-4 py-2 rounded-full font-medium">
          {Math.round((Object.keys(responses).length / questions.length) * 100)}% Complete
        </div>
      </header>
      
      {submitted && processingState === "complete" ? (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="auth-form text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full"
        >
          <CheckCircle className="h-16 w-16 text-teal-blue mx-auto mb-4" />
          <h2 className="auth-title text-2xl font-bold text-dark-navy">Thank You!</h2>
          <p className="text-medium-gray mt-2">Your responses have been analyzed and recorded.</p>
          <div className="mt-4">
            <div className="h-2 bg-light-gray rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5 }}
                className="h-full bg-teal-blue"
              />
            </div>
            <p className="text-xs text-medium-gray mt-1">Redirecting you to your dashboard...</p>
          </div>
        </motion.div>
      ) : (
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-center text-medium-gray font-medium">
              Question <span className="font-bold text-teal-blue text-lg">{currentQuestionIndex + 1}</span> of {questions.length}
            </div>
            <div className="text-sm text-center font-medium px-4 py-1.5 bg-teal-blue/10 text-teal-blue rounded-full">
              {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
            </div>
          </div>
          
          <div className="h-3 bg-light-gray rounded-full overflow-hidden mb-8">
            <motion.div 
              animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-teal-blue"
            />
          </div>
          
          <div className="auth-form bg-white p-8 rounded-xl shadow-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={direction === "next" ? slideVariants.enterFromRight : slideVariants.enterFromLeft}
                animate={slideVariants.center}
                exit={direction === "next" ? slideVariants.exitToLeft : slideVariants.exitToRight}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <div className="flex items-start mb-6">
                  <HelpCircle className="h-7 w-7 text-teal-blue mr-3 mt-1 flex-shrink-0" />
                  <h3 className="text-2xl font-semibold text-dark-navy">
                    {currentQuestion?.statement}
                  </h3>
                </div>
                
                <div className="space-y-4 mt-8">
                  {currentQuestion?.options?.map((option) => {
                    const isSelected = responses[currentQuestion.id]?.label === option.label;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => handleOptionSelect(currentQuestion.id, option.label, option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full text-left p-5 rounded-lg border transition-all duration-200 input-field cursor-pointer flex items-center
                          ${isSelected 
                            ? "border-teal-blue bg-teal-blue text-white shadow-md" 
                            : "bg-white border-light-gray hover:bg-teal-blue/10 hover:border-teal-blue hover:text-dark-navy"}`}
                      >
                        <div className={`w-6 h-6 rounded-full mr-4 flex items-center justify-center border ${isSelected ? "bg-white border-white" : "border-light-gray"}`}>
                          {isSelected && <div className="w-3 h-3 rounded-full bg-teal-blue"></div>}
                        </div>
                        <span className="text-lg">{option.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="flex justify-between items-center mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className={`btn btn-secondary flex items-center disabled:opacity-50 px-6 py-3 rounded-lg font-medium text-base
                ${currentQuestionIndex === 0 ? "bg-gray-100 text-medium-gray" : "bg-white text-dark-navy border border-light-gray hover:bg-gray-50"}`}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Previous
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={nextQuestion}
              disabled={!isOptionSelected(currentQuestion?.id)}
              className={`btn flex items-center px-6 py-3 rounded-lg font-medium text-base
                ${!isOptionSelected(currentQuestion?.id) 
                  ? "bg-gray-100 text-medium-gray cursor-not-allowed"
                  : currentQuestionIndex === questions.length - 1
                    ? "bg-teal-blue text-white hover:bg-teal-600"
                    : "bg-teal-blue text-white hover:bg-teal-600"}`}
            >
              {currentQuestionIndex === questions.length - 1 ? (
                <>
                  Submit
                  <CheckCircle className="h-5 w-5 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </motion.button>
          </div>
          
          <div className="flex justify-center mt-8 space-x-1.5 py-4">
            {questions.map((_, idx) => (
              <motion.div
                key={idx}
                className={`h-2.5 w-2.5 rounded-full ${idx === currentQuestionIndex ? "bg-teal-blue" : idx < currentQuestionIndex ? "bg-teal-blue/50" : "bg-light-gray"}`}
                initial={{ scale: idx === currentQuestionIndex ? 1.5 : 1 }}
                animate={{ scale: idx === currentQuestionIndex ? 1.5 : 1 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Questionnaire;