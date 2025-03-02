import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { 
  User, 
  Mail, 
  Lock, 
  Briefcase, 
  Calendar, 
  ArrowRight, 
  CheckCircle,
  AlertCircle 
} from "lucide-react";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    profession: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [formStep, setFormStep] = useState(1);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
  
    if (e.target.name === "password") {
      const password = e.target.value;
      let strength = 0;
      
      if (password.length >= 6) strength += 1;
      if (password.match(/[A-Z]/)) strength += 1;
      if (password.match(/[0-9]/)) strength += 1;
      if (password.match(/[^A-Za-z0-9]/)) strength += 1;
      
      setPasswordStrength(strength);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        age: formData.age,
        profession: formData.profession,
        email: formData.email,
        createdAt: new Date(),
      });
      navigate("/questionnaire");
    } catch (error) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        setError("Email already in use. Please use a different email or login.");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else {
        setError("An error occurred during registration. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (formStep === 1 && (!formData.name || !formData.age || !formData.profession)) {
      setError("Please fill out all personal details");
      return;
    }
    setError("");
    setFormStep(2);
  };

  const prevStep = () => {
    setError("");
    setFormStep(1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-teal-50 to-gray-50">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg animate-pulse">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold text-teal-600 mb-1">MindfulChat</h1>
          <p className="text-gray-600">Your companion for mental wellbeing</p>
        </div>

        
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              formStep >= 1 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              <User size={16} />
            </div>
            <div className={`h-1 w-12 ${
              formStep >= 2 ? "bg-teal-600" : "bg-gray-200"
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              formStep >= 2 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              <Lock size={16} />
            </div>
          </div>
        </div>

        
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 transition-all duration-300">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {formStep === 1 ? "Tell us about yourself" : "Secure your account"}
          </h2>

          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 mb-6 text-sm flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          
          <form onSubmit={handleRegister} className="space-y-4">
            {formStep === 1 ? (
              <>
                <div className="relative">
                  <label htmlFor="name" className="block text-gray-600 text-sm mb-1 font-medium">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="age" className="block text-gray-600 text-sm mb-1 font-medium">
                    Age
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      id="age"
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="25"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="profession" className="block text-gray-600 text-sm mb-1 font-medium">
                    Profession
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase size={16} className="text-gray-400" />
                    </div>
                    <input
                      id="profession"
                      type="text"
                      name="profession"
                      value={formData.profession}
                      onChange={handleInputChange}
                      placeholder="Software Engineer"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-teal-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  disabled={loading}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <label htmlFor="email" className="block text-gray-600 text-sm mb-1 font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="password" className="block text-gray-600 text-sm mb-1 font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={16} className="text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      required
                      disabled={loading}
                    />
                  </div>
                  
                
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Password strength:</span>
                        <span className="text-xs font-medium">
                          {passwordStrength === 0 && "Very weak"}
                          {passwordStrength === 1 && "Weak"}
                          {passwordStrength === 2 && "Medium"}
                          {passwordStrength === 3 && "Strong"}
                          {passwordStrength === 4 && "Very strong"}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            passwordStrength === 0 ? "bg-red-500 w-1/4" :
                            passwordStrength === 1 ? "bg-orange-500 w-2/4" :
                            passwordStrength === 2 ? "bg-yellow-500 w-3/4" :
                            passwordStrength === 3 ? "bg-green-500 w-full" :
                            "bg-green-600 w-full"
                          }`}
                        ></div>
                      </div>
                      
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li className="flex items-center">
                          <CheckCircle size={12} className={formData.password.length >= 6 ? "text-green-500 mr-1" : "text-gray-300 mr-1"} />
                          <span>At least 6 characters</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={12} className={formData.password.match(/[A-Z]/) ? "text-green-500 mr-1" : "text-gray-300 mr-1"} />
                          <span>At least one uppercase letter</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={12} className={formData.password.match(/[0-9]/) ? "text-green-500 mr-1" : "text-gray-300 mr-1"} />
                          <span>At least one number</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label htmlFor="confirmPassword" className="block text-gray-600 text-sm mb-1 font-medium">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={16} className="text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      required
                      disabled={loading}
                    />
                  </div>
                  {formData.password && formData.confirmPassword && (
                    <div className="flex items-center mt-1">
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <CheckCircle size={12} className="text-green-500 mr-1" />
                          <span className="text-xs text-green-500">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} className="text-red-500 mr-1" />
                          <span className="text-xs text-red-500">Passwords don't match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="w-1/3 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-teal-400 disabled:cursor-not-allowed transition-colors"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Account...
                      </div>
                    ) : "Create Account"}
                  </button>
                </div>
              </>
            )}

            <div className="pt-4 border-t border-gray-200 mt-6">
              <p className="text-center text-gray-600 text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-teal-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>

        
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-800">Secure & Private</h3>
            <p className="text-xs text-gray-500 mt-1">Your data is encrypted and never shared</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-800">Daily Check-ins</h3>
            <p className="text-xs text-gray-500 mt-1">Track your mood and progress daily</p>
          </div>
        </div>

        
        <p className="text-center text-xs text-gray-500 mt-6">
          By creating an account, you agree to our{" "}
          <a href="#" className="text-teal-600 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-teal-600 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;