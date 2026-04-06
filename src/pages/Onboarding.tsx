import { useState, useEffect } from "react";
import { ArrowRight, Disc3 } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      
      const data = userSnap.data();
      const hasCompletedOnboarding = data?.onboardingComplete || (data?.genres && data.genres.length > 0);

      if (userSnap.exists() && hasCompletedOnboarding) {
        onComplete();
      } else {
        setName(userCredential.user.displayName || "");
        setEmail(userCredential.user.email || "");
        setView('complete_profile');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to log in.");
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

      if (userSnap.exists() && hasCompletedOnboarding) {
        onComplete();
      } else {
        setName(result.user.displayName || "");
        setEmail(result.user.email || "");
        setView('complete_profile');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to log in with Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupContinue = () => {
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setView('genres');
  };

  const handleCompleteSignup = async () => {
    setError("");
    setIsLoading(true);
    try {
      let user = auth.currentUser;
      
      if (!user) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }
      
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        await setDoc(userRef, {
          name: name || user.displayName || "New User",
          genres: selectedGenres,
          onboardingComplete: true
        }, { merge: true });
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          name: name || user.displayName || "New User",
          email: email || user.email,
          createdAt: new Date(),
          bio: "",
          followers: [],
          following: [],
          likedRooms: [],
          genres: selectedGenres,
          onboardingComplete: true
        });
      }
      
      onComplete();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account.");
      if (!auth.currentUser) setView('signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0] flex flex-col p-6 font-sans">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full animate-in fade-in duration-300">
        <div className="flex justify-center mb-8">
          <Disc3 size={48} className="text-[#9146FF] animate-[spin_4s_linear_infinite]" />
        </div>

        {view === 'login' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">Welcome back</h1>
            <p className="text-[#666666] text-sm text-center mb-8">Log in to your Jam Rooms account</p>
            
            {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

            <div className="space-y-4 mb-4">
              <input 
                type="email" 
                placeholder="Email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                disabled={isLoading}
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex justify-end mb-6">
              <button className="text-[#666666] text-sm hover:text-[#E4E3E0] transition-colors font-medium">Forgot password?</button>
            </div>

            <button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#9146FF] text-white font-bold py-4 rounded-xl hover:bg-[#772ce8] transition-colors mb-6 disabled:opacity-50">
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
              Don't have an account? <button onClick={() => { setView('signup'); setError(""); }} className="text-[#9146FF] font-medium hover:underline ml-1">Sign up</button>
            </p>
          </div>
        )}

        {view === 'signup' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">Create an account</h1>
            <p className="text-[#666666] text-sm text-center mb-8">Join the underground.</p>
            
            {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

            <div className="space-y-4 mb-8">
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                disabled={isLoading}
              />
              <input 
                type="email" 
                placeholder="Email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                disabled={isLoading}
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                disabled={isLoading}
              />
            </div>

            <button onClick={handleSignupContinue} className="w-full bg-[#9146FF] text-white font-bold py-4 rounded-xl hover:bg-[#772ce8] transition-colors mb-6">
              Continue
            </button>

            <p className="text-center text-sm text-[#666666]">
              Already have an account? <button onClick={() => { setView('login'); setError(""); }} className="text-[#9146FF] font-medium hover:underline ml-1">Log in</button>
            </p>
          </div>
        )}

        {view === 'complete_profile' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">Complete your profile</h1>
            <p className="text-[#666666] text-sm text-center mb-8">Just a few more details.</p>
            
            {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

            <div className="space-y-4 mb-8">
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                disabled={isLoading}
              />
            </div>

            <button onClick={() => {
              if (!name) {
                setError("Please enter your name.");
                return;
              }
              setError("");
              setView('genres');
            }} className="w-full bg-[#9146FF] text-white font-bold py-4 rounded-xl hover:bg-[#772ce8] transition-colors mb-6">
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
              className="w-full bg-[#9146FF] text-white font-bold py-4 rounded-xl disabled:opacity-50 flex justify-center items-center gap-2 transition-all hover:bg-[#772ce8]"
            >
              {isLoading ? "Creating Account..." : <><>Enter Jam Rooms</> <ArrowRight size={20} /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
