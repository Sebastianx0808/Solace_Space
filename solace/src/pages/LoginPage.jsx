import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      setTimeout(() => {
        navigate("/"); 
      }, 500);
    } catch (error) {
      console.error(error);
      setError(
        error.code === "auth/invalid-credential" 
          ? "Invalid email or password" 
          : "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-soft-white to-blue-50 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-md">
        <div className={`text-center mb-8 transform transition-transform duration-700 ${mounted ? 'translate-y-0' : 'translate-y-10'}`}>
          <div className="w-20 h-20 bg-teal-blue rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden relative">
            <div className="absolute inset-0 bg-teal-600 opacity-30 animate-pulse"></div>
            <span className="text-white text-2xl font-bold relative z-10">S</span>
          </div>
          <h1 className="text-4xl font-bold text-teal-blue mb-2 drop-shadow-sm">Solace</h1>
          <p className="text-medium-gray text-lg">Your companion for mental wellbeing</p>
        </div>
        
        <div className={`bg-white rounded-2xl shadow-xl p-6 md:p-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl font-semibold text-dark-navy mb-6">Welcome Back</h2>
          
          {error && (
            <div className="bg-error bg-opacity-10 border border-error border-opacity-20 text-error rounded-lg p-4 mb-4 animate-fadeIn flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="transition-all duration-300 transform hover:translate-y-[-2px]">
              <label htmlFor="email" className="block text-medium-gray mb-2 text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="input-field pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-blue focus:border-transparent transition-all duration-300 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="transition-all duration-300 transform hover:translate-y-[-2px]">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="text-medium-gray text-sm font-medium">
                  Password
                </label>
                <a href="#" className="text-teal-blue text-sm hover:underline transition-colors duration-300">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="input-field pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-blue focus:border-transparent transition-all duration-300 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full p-3 bg-teal-blue text-white font-medium rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-300 transform hover:translate-y-[-2px] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
            
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-sm text-gray-400">or</span>
              </div>
            </div>
            
            <p className="text-center text-medium-gray text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-teal-blue font-medium hover:underline transition-colors duration-300">
                Create an account
              </Link>
            </p>
          </form>
        </div>
        
        <div className={`text-center mt-6 text-sm text-gray-400 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          © {new Date().getFullYear()} Solace. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;