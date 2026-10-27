"use client";
import { useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
export function AccountGate() {
  const [signup,setSignup]=useState(false);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{
      if(signup){const result=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(result.user);}
      else await signInWithEmailAndPassword(auth,email,password);
    }catch{setError('Could not sign in. Check your email and password, or try again. New passwords need at least 8 characters.');}
    finally{setBusy(false);}
  }
  async function signInWithGoogle(){
    setBusy(true);setError('');
    try{await signInWithPopup(auth,new GoogleAuthProvider());}
    catch(error){setError(error instanceof Error && error.message.includes('popup-closed-by-user')?'Google sign-in was cancelled.':'Could not sign in with Google. Please try again.');}
    finally{setBusy(false);}
  }
  async function reset(){setBusy(true);try{await sendPasswordResetEmail(auth,email);setError('If this account exists, a password reset email has been sent.');}catch{setError('Enter a valid email address and try again.');}finally{setBusy(false);}}
  return <main className="account-screen"><form className="account-card" onSubmit={submit}><span className="brand-ai">studybuddy ai</span><h1>{signup?'Create your study account':'Welcome back'}</h1><p>Your notes and study materials, saved to your account.</p><Button variant="outline" disabled={busy} type="button" onClick={signInWithGoogle}>Continue with Google</Button><div className="account-divider" aria-hidden="true"><span>or</span></div><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required minLength={8} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="status">{error}</p>}<Button disabled={busy} type="submit">{busy?'Please wait…':signup?'Create account':'Sign in'}</Button><button type="button" disabled={busy} onClick={()=>setSignup(!signup)}>{signup?'Already have an account? Sign in':'Create an account'}</button>{!signup&&<button type="button" disabled={busy||!email} onClick={reset}>Forgot password?</button>}<small>Study text is sent to Google Gemini to generate materials. Original files are not stored.</small></form></main>;
}
