/**
 * StageFront Events — User & Authentication Service
 * 
 * Implements real Firebase Authentication (email/password) and Cloud Firestore
 * user profile persistence with role-based access control (RBAC).
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types/api';
import { auth, db, isFirebaseConfigured } from './firebase';
import { apiClient } from './apiClient';

export interface IUserService {
  getCurrentUser(): UserProfile | null;
  getFirebaseUser(): FirebaseUser | null;
  getIdToken(): Promise<string | null>;
  login(email: string, password: string): Promise<UserProfile>;
  register(fullName: string, email: string, password: string): Promise<UserProfile>;
  logout(): Promise<void>;
  subscribe(listener: (user: UserProfile | null) => void): () => void;
}

class UserService implements IUserService {
  private currentUser: UserProfile | null = null;
  private firebaseUser: FirebaseUser | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];
  private isInitialized = false;

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    if (!auth) {
      this.isInitialized = true;
      return;
    }

    onAuthStateChanged(auth, async (user) => {
      this.firebaseUser = user;
      if (user) {
        try {
          const token = await user.getIdToken();
          apiClient.setAuthToken(token);

          // Resolve role securely via Custom Claims or Firestore
          const profile = await this.fetchUserProfile(user);
          this.currentUser = profile;
        } catch (err) {
          console.error('Error synchronizing user profile:', err);
          // Fallback minimal safe profile
          this.currentUser = {
            id: user.uid,
            email: user.email || '',
            fullName: user.displayName || user.email?.split('@')[0] || 'User',
            role: 'customer',
            createdAt: user.metadata.creationTime || new Date().toISOString(),
          };
        }
      } else {
        this.currentUser = null;
        apiClient.setAuthToken(null);
      }
      this.isInitialized = true;
      this.notify();
    });
  }

  private async fetchUserProfile(user: FirebaseUser): Promise<UserProfile> {
    let role: UserRole = 'customer';

    // 1. Check custom claims on token first (trusted server-side)
    try {
      const tokenResult = await user.getIdTokenResult();
      if (tokenResult.claims.admin === true || tokenResult.claims.role === 'admin') {
        role = 'admin';
      }
    } catch {
      // ignore
    }

    // 2. Query Firestore user profile document (/users/{uid})
    if (db) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (role !== 'admin' && data.role === 'admin') {
            // Also verify admin document /admins/{uid} for dual protection
            const adminDocRef = doc(db, 'admins', user.uid);
            const adminSnap = await getDoc(adminDocRef);
            if (adminSnap.exists()) {
              role = 'admin';
            }
          }

          return {
            id: user.uid,
            email: user.email || data.email || '',
            fullName: data.fullName || user.displayName || 'User',
            phoneNumber: data.phoneNumber || user.phoneNumber || undefined,
            role,
            avatarUrl: data.avatarUrl || user.photoURL || undefined,
            createdAt: data.createdAt ? new Date(data.createdAt.toMillis?.() || data.createdAt).toISOString() : new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('Could not read user profile from Firestore:', err);
      }
    }

    return {
      id: user.uid,
      email: user.email || '',
      fullName: user.displayName || user.email?.split('@')[0] || 'User',
      role,
      createdAt: user.metadata.creationTime || new Date().toISOString(),
    };
  }

  public subscribe(listener: (user: UserProfile | null) => void): () => void {
    this.listeners.push(listener);
    if (this.isInitialized) {
      listener(this.currentUser);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getFirebaseUser(): FirebaseUser | null {
    return this.firebaseUser;
  }

  public async getIdToken(): Promise<string | null> {
    if (!this.firebaseUser) return null;
    return await this.firebaseUser.getIdToken();
  }

  /**
   * Real Firebase Authentication Sign-In
   */
  public async login(email: string, password: string): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(
        'Firebase Authentication is not configured. Please supply your VITE_FIREBASE_* configuration keys in .env.'
      );
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
      apiClient.setAuthToken(token);

      const profile = await this.fetchUserProfile(user);
      this.currentUser = profile;
      this.notify();
      return profile;
    } catch (error: any) {
      throw this.translateAuthError(error);
    }
  }

  /**
   * Real Firebase Authentication Sign-Up with Firestore User Document
   */
  public async register(fullName: string, email: string, password: string): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(
        'Firebase Authentication is not configured. Please supply your VITE_FIREBASE_* configuration keys in .env.'
      );
    }

    if (!fullName || fullName.trim().length < 2) {
      throw new Error('Please provide your full legal name (minimum 2 characters).');
    }

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Set Firebase Auth Display Name
      await updateProfile(user, {
        displayName: fullName.trim(),
      });

      // 3. Create document in Firestore (/users/{uid})
      // CRITICAL: Customers are assigned 'customer' by default. Users cannot self-assign 'admin'.
      if (db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            fullName: fullName.trim(),
            role: 'customer',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (dbErr) {
          console.warn('Could not write user profile to Firestore (proceeding with Auth profile):', dbErr);
        }
      }

      const token = await user.getIdToken();
      apiClient.setAuthToken(token);

      const profile: UserProfile = {
        id: user.uid,
        email: user.email || email,
        fullName: fullName.trim(),
        role: 'customer',
        createdAt: new Date().toISOString(),
      };

      this.currentUser = profile;
      this.notify();
      return profile;
    } catch (error: any) {
      throw this.translateAuthError(error);
    }
  }

  /**
   * Real Firebase Sign-Out
   */
  public async logout(): Promise<void> {
    if (auth) {
      await signOut(auth);
    }
    this.currentUser = null;
    this.firebaseUser = null;
    apiClient.setAuthToken(null);
    this.notify();
  }

  /**
   * Human-friendly error translation for Firebase Auth error codes
   */
  private translateAuthError(error: any): Error {
    const code = error?.code || '';
    switch (code) {
      case 'auth/email-already-in-use':
        return new Error('An account already exists with this email address. Please sign in instead.');
      case 'auth/invalid-email':
        return new Error('The email address format is invalid.');
      case 'auth/weak-password':
        return new Error('Password is too weak. Please use at least 6 characters including letters and numbers.');
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return new Error('Incorrect email or password. Please verify your credentials.');
      case 'auth/user-disabled':
        return new Error('This user account has been disabled by an administrator.');
      case 'auth/too-many-requests':
        return new Error('Too many failed sign-in attempts. Please wait a moment or reset your password.');
      case 'auth/network-request-failed':
        return new Error('Network error connecting to Firebase Authentication. Check your internet connection.');
      default:
        return new Error(error?.message || 'Authentication failed. Please try again.');
    }
  }
}

export const userService = new UserService();
