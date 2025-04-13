import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../config/firebase';

const handleGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    // Store user info in localStorage
    localStorage.setItem('user', JSON.stringify({
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      isGoogle: true
    }));
    return result;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

export { handleGoogleLogin };
