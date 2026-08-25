import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { deriveAuthState, pendingProfilePayload } from '../auth/authModel';
import { AuthContext } from './AuthContextObject';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [claims, setClaims] = useState({});
  const [state, setState] = useState('anonymous');
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async (currentUser, forceRefresh = false) => {
    if (!currentUser) {
      setUser(null);
      setProfile(null);
      setClaims({});
      setState('anonymous');
      setLoading(false);
      return;
    }
    const [profileSnapshot, token] = await Promise.all([
      getDoc(doc(db, 'users', currentUser.uid)),
      currentUser.getIdTokenResult(forceRefresh),
    ]);
    const nextProfile = profileSnapshot.exists() ? { uid: currentUser.uid, ...profileSnapshot.data() } : null;
    setUser(currentUser);
    setProfile(nextProfile);
    setClaims(token.claims ?? {});
    setState(deriveAuthState(currentUser, nextProfile, token.claims));
    setLoading(false);
  }, []);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setLoading(true);
    loadIdentity(currentUser).catch((error) => {
      console.error('Unable to load account access state', error);
      setUser(currentUser);
      setProfile(null);
      setClaims({});
      setState(currentUser ? 'pending' : 'anonymous');
      setLoading(false);
    });
  }), [loadIdentity]);

  const ensurePendingProfile = useCallback(async (currentUser, values = {}) => {
    const userRef = doc(db, 'users', currentUser.uid);
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(userRef, pendingProfilePayload(currentUser, values, serverTimestamp()));
    }
    await loadIdentity(currentUser, true);
  }, [loadIdentity]);

  const register = useCallback(async (email, password, values = {}) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await ensurePendingProfile(credential.user, values);
    return credential.user;
  }, [ensurePendingProfile]);

  const login = useCallback((email, password) => signInWithEmailAndPassword(auth, email, password), []);
  const loginWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    await ensurePendingProfile(credential.user, { name: credential.user.displayName, photoURL: credential.user.photoURL });
    return credential.user;
  }, [ensurePendingProfile]);
  const logout = useCallback(() => signOut(auth), []);
  const refreshProfile = useCallback(() => loadIdentity(auth.currentUser, true), [loadIdentity]);

  const value = useMemo(() => ({
    user, profile, claims, state, loading, login, register, loginWithGoogle, logout, refreshProfile,
  }), [user, profile, claims, state, loading, login, register, loginWithGoogle, logout, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
