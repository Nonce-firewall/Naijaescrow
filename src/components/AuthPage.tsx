import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getOrCreateUserProfile } from '../lib/dbHelpers';
import { motion } from 'motion/react';
import { Lock, Mail, UserPlus, KeyRound, ArrowLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface AuthPageProps {
  onBack: () => void;
  onAuthSuccess: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthPage({ onBack, onAuthSuccess, addToast, initialMode = 'signin' }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authErrorAlert, setAuthErrorAlert] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorAlert(null);
    if (!email || !password) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          const isSandbox = email.toLowerCase() === 'cryptogangstar247@gmail.com' || email.toLowerCase() === 'local_trader@9ija.com';
          if (
            isSandbox &&
            (signInErr.code === 'auth/user-not-found' || 
             signInErr.code === 'auth/invalid-credential')
          ) {
            try {
              // Sandbox account doesn't exist yet, automatically provision it
              addToast('Provisioning sandbox account profile on your database...', 'info');
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } catch (signUpErr: any) {
              if (signUpErr.code === 'auth/email-already-in-use') {
                // Account does exist, meaning the user typed the incorrect password
                throw signInErr;
              } else {
                throw signUpErr;
              }
            }
          } else {
            throw signInErr;
          }
        }
        await getOrCreateUserProfile(userCredential.user.uid, userCredential.user.email || '');
        addToast('Sign in successful!', 'success');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await getOrCreateUserProfile(userCredential.user.uid, userCredential.user.email || '');
        addToast('Account created successfully!', 'success');
      }
      onAuthSuccess();
    } catch (err: any) {
      const isExpectedAuthError = [
        'auth/email-already-in-use',
        'auth/invalid-credential',
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/invalid-email'
      ].includes(err?.code);
      if (!isExpectedAuthError) {
        console.error(err);
      } else {
        console.warn('Handled expected Auth error:', err?.code || err);
      }
      let errMsg = 'Authentication failed. Please check your details.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Please provide a valid email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Email/Password Authentication is not enabled in Firebase.';
        setAuthErrorAlert(
          'Email/Password sign-in provider is currently disabled in your Firebase console. To enable it:\n\n' +
          '1. Go to your Firebase Console (Authentication > Sign-in method)\n' +
          '2. Click "Add new provider" and select "Email/Password"\n' +
          '3. Toggle "Enable" and click Save.\n\n' +
          'For a quick test, you can sign in instantly using the Google Sign-In option below!'
        );
      }
      addToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthErrorAlert(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await getOrCreateUserProfile(userCredential.user.uid, userCredential.user.email || '');
      addToast('Sign in with Google successful!', 'success');
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      addToast('Google Sign-In failed or was cancelled.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAccount = async (role: 'admin' | 'user') => {
    const testEmail = role === 'admin' ? 'cryptogangstar247@gmail.com' : 'local_trader@9ija.com';
    const testPassword = role === 'admin' ? 'admin123' : 'trader123';
    
    setEmail(testEmail);
    setPassword(testPassword);
    setIsLogin(true);
    setIsLoading(true);
    setAuthErrorAlert(null);

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        addToast(`Signed in as sandbox ${role}!`, 'success');
      } catch (signInErr: any) {
        if (
          signInErr.code === 'auth/user-not-found' || 
          signInErr.code === 'auth/invalid-credential' ||
          signInErr.code === 'auth/user-disabled'
        ) {
          addToast(`Provisioning sandbox ${role} account...`, 'info');
          try {
            userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
            addToast(`Sandbox ${role} account registered and logged in!`, 'success');
          } catch (signUpErr: any) {
            if (signUpErr.code === 'auth/email-already-in-use') {
              // User already exists, meaning the password was changed or there was a credential discrepancy
              // Try to sign in one more time or bubble up the error safely
              throw signInErr;
            } else {
              throw signUpErr;
            }
          }
        } else {
          throw signInErr;
        }
      }

      await getOrCreateUserProfile(userCredential.user.uid, userCredential.user.email || '');
      onAuthSuccess();
    } catch (err: any) {
      const isExpectedAuthError = [
        'auth/email-already-in-use',
        'auth/invalid-credential',
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/invalid-email'
      ].includes(err?.code);
      if (!isExpectedAuthError) {
        console.error(err);
      } else {
        console.warn('Handled expected test account Auth error:', err?.code || err);
      }
      let errMsg = `Failed to initialize sandbox ${role}.`;
      if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Email/Password Authentication is not enabled in Firebase.';
        setAuthErrorAlert(
          'Email/Password sign-in provider is currently disabled in your Firebase console. To enable it:\n\n' +
          '1. Go to your Firebase Console (Authentication > Sign-in method)\n' +
          '2. Click "Add new provider" and select "Email/Password"\n' +
          '3. Toggle "Enable" and click Save.\n\n' +
          'For a quick test, you can sign in instantly using the Google Sign-In option below!'
        );
      }
      addToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F7] flex flex-col justify-center py-12 px-6 lg:px-8 font-sans text-[#1A1A1A]">
      <div className="absolute top-6 left-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-[#008751] font-semibold cursor-pointer transition duration-150 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Landing
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-[#008751] rounded-2xl flex items-center justify-center text-white shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-[#1A1A1A] tracking-tight">
          {isLogin ? 'Sign in to 9ija Escrow' : 'Create an escrow account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Or{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setPassword('');
              setConfirmPassword('');
            }}
            className="font-bold text-[#008751] hover:text-[#007043] cursor-pointer"
          >
            {isLogin ? 'create a new account for free' : 'sign in to your existing portal'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          layout
          className="bg-white py-8 px-6 shadow-sm rounded-3xl border border-[#E0E7E0]"
        >
          {authErrorAlert && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-xs leading-relaxed text-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Developer Configuration Tip:</span>
                <span className="block whitespace-pre-line">{authErrorAlert}</span>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                Email Address
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                  placeholder="Min. 6 characters"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Confirm Password
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                    placeholder="Repeat password"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#008751] hover:bg-[#007043] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008751] disabled:opacity-50 cursor-pointer transition duration-150"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </span>
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          {/* Social Sign-in Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E0E7E0]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500 font-mono text-[10px] uppercase">Or operate instantly with</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-[#E0E7E0] rounded-xl shadow-sm bg-[#F7F9F7] hover:bg-[#E6F4EA] hover:border-[#008751] text-xs font-bold text-gray-700 hover:text-[#008751] transition duration-150 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign In with Google
              </button>
            </div>
          </div>

          {/* Quick Sandbox Login Buttons */}
          <div className="mt-8 pt-6 border-t border-[#E0E7E0]">
            <div className="text-center">
              <span className="bg-[#E6F4EA] border border-[#D1E6D8] text-[#008751] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Sandbox Mode
              </span>
              <p className="text-xs text-gray-500 mt-2">
                Click a role below to auto-fill mock credentials for quick testing:
              </p>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTestAccount('admin')}
                className="p-3 bg-[#F7F9F7] hover:bg-[#E6F4EA] border border-[#E0E7E0] hover:border-[#008751] text-gray-700 hover:text-[#008751] rounded-2xl text-xs font-bold cursor-pointer transition text-center"
              >
                Admin (Owner)
                <span className="block text-[10px] text-gray-400 font-mono mt-1 font-normal">cryptogangstar247@gmail.com</span>
              </button>
              <button
                onClick={() => handleTestAccount('user')}
                className="p-3 bg-[#F7F9F7] hover:bg-[#E6F4EA] border border-[#E0E7E0] hover:border-[#008751] text-gray-700 hover:text-[#008751] rounded-2xl text-xs font-bold cursor-pointer transition text-center"
              >
                User (Local Trader)
                <span className="block text-[10px] text-gray-400 font-mono mt-1 font-normal">local_trader@9ija.com</span>
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
