import { useState, useEffect } from "react";
import { ArrowRight, Disc3, Cat, Dog, Bird, Fish, Snail, Bug, Bot, Skull, Smile, Zap, Star, Ghost, Check } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { getChipColor } from "../utils/colors";

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [view, setView] = useState<'login' | 'signup' | 'complete_profile' | 'genres'>(() => {
    return auth.currentUser ? 'complete_profile' : 'login';
  });
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [profileIcon, setProfileIcon] = useState("Smile");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const profileIcons = [
    { name: "Smile", icon: Smile },
    { name: "Ghost", icon: Ghost },
    { name: "Cat", icon: Cat },
    { name: "Dog", icon: Dog },
    { name: "Bird", icon: Bird },
    { name: "Fish", icon: Fish },
    { name: "Snail", icon: Snail },
    { name: "Bug", icon: Bug },
    { name: "Bot", icon: Bot },
    { name: "Skull", icon: Skull },
    { name: "Zap", icon: Zap },
    { name: "Star", icon: Star },
  ];

  const genres = ["House", "Trance", "Techno", "R&B", "EDM", "Pop", "Hip Hop", "Ambient", "Dubstep", "Drum & Bass"];

  useEffect(() => {
    if (auth.currentUser && view === 'complete_profile') {
      if (!name) setName(auth.currentUser.displayName || "");
      if (!email) setEmail(auth.currentUser.email || "");
    }
  }, [auth.currentUser, view]);

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleLogin = async () => {
    setError("");
    setFieldErrors({});
    const errors: { [key: string]: string } = {};
    if (!email) errors.email = "Email is required.";
    if (!password) errors.password = "Password is required.";
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      
      const data = userSnap.data();
      const hasCompletedOnboarding = data?.onboardingComplete || (data?.genres && data.genres.length > 0);
      const isFounder = userCredential.user.email === 'madhavjolly.paypal@gmail.com';

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: userCredential.user.uid,
          name: userCredential.user.displayName || "New User",
          email: userCredential.user.email || "no-email@example.com",
          createdAt: serverTimestamp(),
          bio: "",
          followers: [],
          following: [],
          likedRooms: [],
          likedTracks: [],
          genres: [],
          onboardingComplete: false,
          isFounder: isFounder
        });
      } else if (isFounder && !data?.isFounder) {
        await setDoc(userRef, { isFounder: true }, { merge: true });
      }

      if (hasCompletedOnboarding) {
        onComplete();
      } else {
        setName(data?.name || userCredential.user.displayName || "");
        setEmail(data?.email || userCredential.user.email || "");
        setView('complete_profile');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password sign-in is not enabled. Please enable it in the Firebase Console -> Authentication -> Sign-in method.");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password. If you don't have an account, please sign up.");
      } else {
        setError(err.message || "Failed to log in.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user exists in Firestore
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      
      const data = userSnap.data();
      const hasCompletedOnboarding = data?.onboardingComplete || (data?.genres && data.genres.length > 0);

      const isFounder = result.user.email === 'madhavjolly.paypal@gmail.com';

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          name: result.user.displayName || "New User",
          email: result.user.email || "no-email@example.com",
          createdAt: serverTimestamp(),
          bio: "",
          followers: [],
          following: [],
          likedRooms: [],
          likedTracks: [],
          genres: [],
          onboardingComplete: false,
          isFounder: isFounder
        });
      } else if (isFounder && !data?.isFounder) {
        await setDoc(userRef, { isFounder: true }, { merge: true });
      }

      if (hasCompletedOnboarding) {
        onComplete();
      } else {
        setName(data?.name || result.user.displayName || "");
        setEmail(data?.email || result.user.email || "");
        setView('complete_profile');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in popup was closed. Please allow popups or try opening the app in a new tab.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for Google Sign-In. Please add your Vercel domain to the Firebase Console -> Authentication -> Settings -> Authorized domains.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Google sign-in is not enabled. Please enable it in the Firebase Console -> Authentication -> Sign-in method.");
      } else {
        setError(err.message || "Failed to log in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupContinue = () => {
    setError("");
    setFieldErrors({});
    const errors: { [key: string]: string } = {};
    if (!name) errors.name = "Full name is required.";
    if (!email) errors.email = "Email is required.";
    if (!password) errors.password = "Password is required.";
    if (password && password.length < 6) errors.password = "Password must be at least 6 characters.";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setView('genres');
  };

  const handleCompleteSignup = async () => {
    setError("");
    setFieldErrors({});
    setIsLoading(true);
    try {
      let user = auth.currentUser;
      
      if (!user) {
        if (!email || !password) {
          setError("Email and password are required.");
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }
      
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const isFounder = user.email === 'madhavjolly.paypal@gmail.com';
      
      if (userSnap.exists()) {
        await setDoc(userRef, {
          name: name || user.displayName || "New User",
          profileIcon: profileIcon,
          genres: selectedGenres,
          onboardingComplete: true,
          ...(isFounder ? { isFounder: true } : {})
        }, { merge: true });
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          name: name || user.displayName || "New User",
          email: email || user.email || "no-email@example.com",
          profileIcon: profileIcon,
          createdAt: serverTimestamp(),
          bio: "",
          followers: [],
          following: [],
          likedRooms: [],
          likedTracks: [],
          genres: selectedGenres,
          onboardingComplete: true,
          isFounder: isFounder
        });
      }
      
      onComplete();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password sign-in is not enabled. Please enable it in the Firebase Console -> Authentication -> Sign-in method.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Please log in.");
      } else {
        setError(err.message || "Failed to create account.");
      }
      if (!auth.currentUser) setView('signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0] flex flex-col p-6 font-sans">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full animate-in fade-in duration-300">
        <div className="flex justify-center mb-8">
          <Disc3 size={48} className="text-[#5D00FF] animate-[spin_4s_linear_infinite]" />
        </div>

        {view !== 'login' && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#222222] -z-10" />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#5D00FF] -z-10 transition-all duration-500"
                style={{ width: view === 'signup' ? '0%' : view === 'complete_profile' ? '50%' : '100%' }}
              />
              
              {[
                { id: 'signup', label: 'Account', step: 1 },
                { id: 'complete_profile', label: 'Profile', step: 2 },
                { id: 'genres', label: 'Genres', step: 3 }
              ].map((s) => {
                const currentStep = view === 'signup' ? 1 : view === 'complete_profile' ? 2 : 3;
                const isCompleted = s.step < currentStep;
                const isCurrent = s.step === currentStep;
                
                return (
                  <div key={s.id} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCompleted ? 'bg-[#5D00FF] text-white' : 
                      isCurrent ? 'bg-[#111111] border-2 border-[#5D00FF] text-[#5D00FF]' : 
                      'bg-[#111111] border-2 border-[#222222] text-[#666666]'
                    }`}>
                      {isCompleted ? <Check size={16} /> : s.step}
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${
                      isCurrent ? 'text-[#E4E3E0]' : 'text-[#666666]'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">Welcome back</h1>
            <p className="text-[#666666] text-sm text-center mb-8">Log in to your Jam Rooms account</p>
            
            {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

            <div className="space-y-4 mb-4">
              <div className="space-y-1">
                <input 
                  type="email" 
                  placeholder="Email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-[#111111] border ${fieldErrors.email ? 'border-red-500' : 'border-[#222222]'} text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#5D00FF] transition-colors`}
                  disabled={isLoading}
                />
                {fieldErrors.email && <p className="text-red-500 text-[10px] ml-1 font-medium">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1">
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-[#111111] border ${fieldErrors.password ? 'border-red-500' : 'border-[#222222]'} text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#5D00FF] transition-colors`}
                  disabled={isLoading}
                />
                {fieldErrors.password && <p className="text-red-500 text-[10px] ml-1 font-medium">{fieldErrors.password}</p>}
              </div>
            </div>
            
            <div className="flex justify-end mb-6">
              <button className="text-[#666666] text-sm hover:text-[#E4E3E0] transition-colors font-medium">Forgot password?</button>
            </div>

            <button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#5D00FF] text-white font-bold py-4 rounded-xl hover:bg-[#4A00CC] transition-colors mb-6 disabled:opacity-50">
              {isLoading ? "Logging in..." : "Log In"}
            </button>

            <div className="relative flex items-center py-2 mb-6">
              <div className="flex-grow border-t border-[#222222]"></div>
              <span className="flex-shrink-0 mx-4 text-[#666666] text-sm">OR</span>
              <div className="flex-grow border-t border-[#222222]"></div>
            </div>

            <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full border border-[#222222] text-[#E4E3E0] font-bold py-4 rounded-xl hover:bg-[#111111] transition-colors mb-8 disabled:opacity-50">
              Continue with Google
            </button>

            <p className="text-center text-sm text-[#666666]">
              Don't have an account? <button onClick={() => { setView('signup'); setError(""); }} className="text-[#5D00FF] font-medium hover:underline ml-1">Sign up</button>
            </p>
          </div>
        )}

        {view === 'signup' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">Create an account</h1>
            <p className="text-[#666666] text-sm text-center mb-8">Join the underground.</p>
            
            {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

            <div className="space-y-4 mb-8">
              <div className="space-y-1">
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-[#111111] border ${fieldErrors.name ? 'border-red-500' : 'border-[#222222]'} text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#5D00FF] transition-colors`}
                  disabled={isLoading}
                />
                {fieldErrors.name && <p className="text-red-500 text-[10px] ml-1 font-medium">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <input 
                  type="email" 
                  placeholder="Email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-[#111111] border ${fieldErrors.email ? 'border-red-500' : 'border-[#222222]'} text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#5D00FF] transition-colors`}
                  disabled={isLoading}
                />
                {fieldErrors.email && <p className="text-red-500 text-[10px] ml-1 font-medium">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1">
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-[#111111] border ${fieldErrors.password ? 'border-red-500' : 'border-[#222222]'} text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#5D00FF] transition-colors`}
                  disabled={isLoading}
                />
                {fieldErrors.password && <p className="text-red-500 text-[10px] ml-1 font-medium">{fieldErrors.password}</p>}
              </div>
              <div className="space-y-1">
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-[#111111] border ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-[#222222]'} text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#5D00FF] transition-colors`}
                  disabled={isLoading}
                />
                {fieldErrors.confirmPassword && <p className="text-red-500 text-[10px] ml-1 font-medium">{fieldErrors.confirmPassword}</p>}
              </div>
            </div>

            <button onClick={handleSignupContinue} className="w-full bg-[#5D00FF] text-white font-bold py-4 rounded-xl hover:bg-[#4A00CC] transition-colors mb-6">
              Continue
            </button>

            <p className="text-center text-sm text-[#666666]">
              Already have an account? <button onClick={() => { setView('login'); setError(""); }} className="text-[#5D00FF] font-medium hover:underline ml-1">Log in</button>
            </p>
          </div>
        )}

        {view === 'complete_profile' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">Complete your profile</h1>
            <p className="text-[#666666] text-sm text-center mb-8">Just a few more details.</p>
            
            {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

            <div className="space-y-4 mb-8">
              <div className="space-y-1">
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-[#111111] border ${fieldErrors.name ? 'border-red-500' : 'border-[#222222]'} text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#5D00FF] transition-colors`}
                  disabled={isLoading}
                />
                {fieldErrors.name && <p className="text-red-500 text-[10px] ml-1 font-medium">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm text-[#666666] block">Choose an Icon</label>
                <div className="grid grid-cols-4 gap-3">
                  {profileIcons.map((iconData) => {
                    const IconComponent = iconData.icon;
                    return (
                      <button
                        key={iconData.name}
                        onClick={() => setProfileIcon(iconData.name)}
                        className={`p-3 rounded-xl flex justify-center items-center transition-all ${
                          profileIcon === iconData.name
                            ? 'bg-[#5D00FF] text-white border border-[#5D00FF]'
                            : 'bg-[#111111] text-[#666666] border border-[#222222] hover:border-[#666666] hover:text-[#E4E3E0]'
                        }`}
                      >
                        <IconComponent size={24} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button onClick={() => {
              if (!name) {
                setFieldErrors({ name: "Please enter your name." });
                return;
              }
              setFieldErrors({});
              setError("");
              setView('genres');
            }} className="w-full bg-[#5D00FF] text-white font-bold py-4 rounded-xl hover:bg-[#4A00CC] transition-colors mb-6">
              Continue
            </button>
          </div>
        )}

        {view === 'genres' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">What are you into?</h1>
            <p className="text-[#666666] text-sm text-center mb-8">Pick 3+ genres to tune your feed.</p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {genres.map(genre => {
                const color = getChipColor(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-5 py-2.5 border rounded-full text-sm font-medium transition-all ${
                      selectedGenres.includes(genre) 
                        ? `${color.border} ${color.solidBg} ${color.solidText}` 
                        : `border-[#222222] text-[#E4E3E0] ${color.hoverBorder} bg-[#111111]`
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={handleCompleteSignup} 
              disabled={selectedGenres.length < 3 || isLoading}
              className="w-full bg-[#5D00FF] text-white font-bold py-4 rounded-xl disabled:opacity-50 flex justify-center items-center gap-2 transition-all hover:bg-[#4A00CC]"
            >
              {isLoading ? "Saving..." : <><>Enter Jam Rooms</> <ArrowRight size={20} /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
