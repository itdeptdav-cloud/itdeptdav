// --- Section Card Component ---
function SectionCard({ sectionInfo, sectionLetter, onSelectSection, showAlert, onModifyClick, pendingCount, statusCounts }) {
  const [editing, setEditing] = React.useState(false);
  const [startRoll, setStartRoll] = React.useState(sectionInfo?.startRoll ?? '');
  const [endRoll, setEndRoll] = React.useState(sectionInfo?.endRoll ?? '');
  const [saving, setSaving] = React.useState(false);

  const saveRange = async () => {
    if (!sectionInfo?.id) return;
    const sRoll = parseInt(startRoll, 10);
    const eRoll = parseInt(endRoll, 10);
    if (isNaN(sRoll) || isNaN(eRoll) || sRoll > eRoll) {
      showAlert && showAlert('Invalid roll range.');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'classes', sectionInfo.id), { startRoll: sRoll, endRoll: eRoll });
      setEditing(false);
      showAlert && showAlert('Range updated!', false);
    } catch (err) {
      showAlert && showAlert('Error updating range: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="relative bg-white p-4 rounded-lg shadow border flex flex-col justify-between">
      {pendingCount > 0 && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">{pendingCount}</div>
        </div>
      )}
      <div>
        <h3 className="font-bold text-lg">Section {sectionLetter}</h3>
        <div className="mt-2 text-sm text-gray-600">
          <span className="mr-3">Verified: <span className="font-semibold text-green-600">{statusCounts?.verified ?? 0}</span></span>
          <span className="mr-3">Unverified: <span className="font-semibold text-yellow-600">{statusCounts?.unverified ?? 0}</span></span>
          <span className="mr-3">Rejected: <span className="font-semibold text-red-600">{statusCounts?.rejected ?? 0}</span></span>
          <span>Blocked: <span className="font-semibold text-gray-800">{statusCounts?.blocked ?? 0}</span></span>
        </div>
        {!editing ? (
          <p className="mt-2 text-sm text-gray-600">Range: {sectionInfo?.startRoll ?? '—'} to {sectionInfo?.endRoll ?? '—'}</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input value={startRoll} onChange={e => setStartRoll(e.target.value)} placeholder="Start Roll" className="px-2 py-1 border rounded" type="number" />
            <input value={endRoll} onChange={e => setEndRoll(e.target.value)} placeholder="End Roll" className="px-2 py-1 border rounded" type="number" />
            <div className="col-span-2 flex justify-end mt-2 gap-2">
              <button onClick={() => setEditing(false)} className="bg-gray-300 px-3 py-1 rounded">Cancel</button>
              <button onClick={saveRange} disabled={saving} className="bg-green-600 text-white px-3 py-1 rounded">{saving ? 'Saving...' : 'Save Range'}</button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => onSelectSection(sectionInfo ?? { className: sectionInfo?.className ?? '', section: sectionLetter })} className="flex-1 bg-indigo-600 text-white py-2 rounded">Manage</button>
        <button onClick={() => setEditing(!editing)} className="px-3 py-2 rounded border">{editing ? 'Cancel' : 'Edit'}</button>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import './App.css';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, query, where, updateDoc, addDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBYvgxs984lC-Zg1wxeBKHuGDW04IzfdfU",
  authDomain: "test-project-error-fix.firebaseapp.com",
  projectId: "test-project-error-fix",
  storageBucket: "test-project-error-fix.firebasestorage.app",
  messagingSenderId: "1034119237308",
  appId: "1:1034119237308:web:2bbe637edf026e54ed4ab9",
  measurementId: "G-FFZZLCLC33"
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Icon Components ---
const UserIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> );
const TeacherIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg> );
const ArrowLeftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> );

// --- Main App Component ---
export default function App() {
  const [page, setPage] = useState('loading');
  const [userRole, setUserRole] = useState(null); 
  const [user, setUser] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', isError: true });

  const showAlert = (message, isError = true) => {
    setAlert({ show: true, message, isError });
    setTimeout(() => setAlert({ show: false, message: '', isError: true }), 4000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && !currentUser.isAnonymous && currentUser.email) {
        if (currentUser.email.endsWith('@student.portal')) {
          setPage('studentDashboard');
        } else {
          setPage('teacherDashboard');
        }
      } else {
        setPage('roleSelection');
      }
    });
    return () => unsubscribe();
  }, []);

  const navigateToAuth = (role) => { setUserRole(role); setPage('auth'); };
  const navigateBackToRoleSelection = () => { setUserRole(null); setPage('roleSelection'); };
    
  if (page === 'loading' && !user) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  let currentPage;
  switch (page) {
    case 'auth': currentPage = <AuthPage role={userRole} onBack={navigateBackToRoleSelection} showAlert={showAlert} />; break;
    case 'teacherDashboard': currentPage = <TeacherDashboard user={user} showAlert={showAlert} />; break;
    case 'studentDashboard': currentPage = <StudentDashboard user={user} />; break;
    case 'roleSelection':
    default:
      currentPage = <RoleSelection onSelectRole={navigateToAuth} />;
  }

  return (
    <>
      {currentPage}
      {alert.show && <Alert message={alert.message} isError={alert.isError} />}
    </>
  );
}

// --- Alert Component ---
function Alert({ message, isError }) {
  return (
    <div className={`fixed top-5 right-5 z-50 py-3 px-5 rounded-lg shadow-xl text-sm text-white ${isError ? 'bg-red-500' : 'bg-green-500'}`}>
      <p>{message}</p>
    </div>
  );
}



// --- Role Selection Component ---
function RoleSelection({ onSelectRole }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome to the Portal</h1>
        <p className="text-gray-400 mb-8">Please select your role to continue.</p>
        <div className="space-y-4">
          <button onClick={() => onSelectRole('teacher')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-transform transform hover:scale-105"> <TeacherIcon /> I am a Teacher </button>
          <button onClick={() => onSelectRole('student')} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-transform transform hover:scale-105"> <UserIcon /> I am a Student </button>
        </div>
      </div>
    </div>
  );
}

// --- Authentication Page Component ---
function TeacherLogin({ showAlert }) {
  const [password, setPassword] = useState('');
  const teacherEmail = 'itdeptdav@gmail.com';

  const handleLogin = async (e) => {
    e && e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, teacherEmail, password);
    } catch (err) {
      showAlert(err.message || 'Unable to login as teacher.');
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Email</label>
        <input type="email" value={teacherEmail} disabled className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md cursor-not-allowed"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      </div>
      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition">Login</button>
    </form>
  );
}

function AuthPage({ role, onBack, showAlert }) {
  const [authMode, setAuthMode] = useState('login');
  const title = role === 'teacher' ? 'Teacher Portal' : 'Student Portal';

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-3xl relative">
         <button onClick={onBack} className="absolute -top-16 left-0 text-gray-300 hover:text-white p-2 rounded-full bg-gray-800 transition md:left-4 md:top-4"> <ArrowLeftIcon /> </button>
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-2">{title}</h2>
          <p className="text-center text-gray-400 mb-6"> {authMode === 'login' ? 'Sign in to your account' : 'Create a new account'} </p>

          <div className="flex justify-center gap-3 mb-6">
            <button onClick={() => setAuthMode('login')} className={`px-4 py-2 rounded ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Login</button>
            <button onClick={() => setAuthMode('register')} className={`px-4 py-2 rounded ${authMode === 'register' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Register</button>
          </div>

          <div>
            {role === 'teacher' ? (
              authMode === 'login' ? <TeacherLogin showAlert={showAlert} /> : <TeacherRegister showAlert={showAlert} />
            ) : (
              authMode === 'login' ? <StudentLogin showAlert={showAlert} onSwitchToRegister={() => setAuthMode('register')} /> : <StudentRegister showAlert={showAlert} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherRegister({ showAlert }) {
  const [password, setPassword] = useState('');
  const teacherEmail = "itdeptdav@gmail.com";

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, teacherEmail, password);
      await setDoc(doc(db, "teachers", userCredential.user.uid), {
        email: userCredential.user.email,
        role: 'teacher'
      });
      showAlert("Registration successful! Please login now.", false);
      await signOut(auth);
    } catch (err) {
       showAlert(err.code === 'auth/email-already-in-use' ? "This teacher account already exists. Please login." : err.message);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Email</label>
        <input type="email" value={teacherEmail} disabled className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md cursor-not-allowed"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      </div>
      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition">Register</button>
    </form>
  );
}


// --- Student Auth Components ---
function StudentLogin({ showAlert, onSwitchToRegister }) {
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [inlineError, setInlineError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const digits = String(rollNo).replace(/\D/g, '').slice(0,4);
    if (!digits || digits.length !== 4) { showAlert("Roll No. must be exactly 4 digits."); return; }
    setRollNo(digits);
    const email = `${rollNo.trim()}@student.portal`;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // After sign-in, verify student's class/section vs class ranges
      try {
        const studentDoc = await getDoc(doc(db, 'students', cred.user.uid));
        if (!studentDoc.exists()) {
          await signOut(auth);
          showAlert('Student record not found. Contact your teacher at itdeptdav@gmail.com');
          return;
        }
        const student = studentDoc.data();
        // Enforce teacher verification and blocked accounts
        const stuStatus = student.status || 'unverified';
        if (stuStatus === 'blocked') {
          await signOut(auth);
          showAlert('Your account has been blocked. Contact your teacher at itdeptdav@gmail.com');
          return;
        }
        if (stuStatus !== 'verified') {
          await signOut(auth);
          showAlert('Your account is not verified yet. Contact your teacher at itdeptdav@gmail.com');
          return;
        }
        const sClass = student.className || student.class;
        const sSection = student.section;
        if (!sClass || !sSection) {
          await signOut(auth);
          showAlert('Your account lacks class/section data. Contact your teacher at itdeptdav@gmail.com');
          return;
        }
        // Find corresponding class document
        const q = query(collection(db, 'classes'), where('className', '==', String(sClass)), where('section', '==', String(sSection)));
        const snap = await getDocs(q);
        if (snap.empty) {
          await signOut(auth);
          showAlert('This class/section is not configured yet. Please provide correct data or contact your teacher at itdeptdav@gmail.com');
          return;
        }
        const classData = snap.docs[0].data();
        if (classData.startRoll == null || classData.endRoll == null) {
          await signOut(auth);
          showAlert('Roll range for your section is not set. Please contact your teacher at itdeptdav@gmail.com');
          return;
        }
        const numericRoll = parseInt(rollNo.trim(), 10);
        if (isNaN(numericRoll) || numericRoll < classData.startRoll || numericRoll > classData.endRoll) {
          await signOut(auth);
          showAlert(`Roll number does not match the configured range for Class ${sClass} Section ${sSection}. Please provide correct info or contact itdeptdav@gmail.com`);
          return;
        }
        // All good. onAuthStateChanged in App will show student dashboard.
      } catch (verErr) {
        await signOut(auth);
        setInlineError('Error verifying account: ' + verErr.message);
        return;
      }
    } catch (err) {
      // Firebase auth error codes: https://firebase.google.com/docs/auth/admin/errors
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-password') {
        setInlineError('Wrong password.');
      } else if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setInlineError('No account found for this Roll No. Create an account first.');
      } else {
        setInlineError('Invalid credentials or account not verified.');
      }
    }
  };
    
  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Student ID (Roll No.)</label>
  <input inputMode="numeric" maxLength={4} pattern="\d{4}" type="text" value={rollNo} onChange={(e) => setRollNo(String(e.target.value).replace(/\D/g, '').slice(0,4))} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      </div>
      {inlineError && <p className="text-sm text-yellow-300">{inlineError} {inlineError.includes('Create') && onSwitchToRegister && <button onClick={onSwitchToRegister} className="underline ml-2">Create account</button>}</p>}
      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition">Login</button>
    </form>
  );
}

function StudentRegister({ showAlert }) {
  const [formData, setFormData] = useState({ rollNo: '', name: '', className: '', section: '', password: '' });
  const [phone, setPhone] = useState('');
  
  const [rollError, setRollError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const classOptions = ['11', '12'];
  const sectionOptions = ['A', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  const commonPasswords = ['password','12345678','qwerty','abc123','letmein','password1','123456','111111','123123','iloveyou'];

  const validatePassword = (password, name, rollNo) => {
    if (!password) return 'Password is required.';
    const p = String(password).trim();
    if (p.length < 8) return 'Password should be at least 8 characters.';
    const normalizedName = String(name || '').toLowerCase().replace(/\s+/g, '');
    const lower = p.toLowerCase();
    if (normalizedName && normalizedName.length >= 3 && lower.includes(normalizedName)) return 'Password should not contain your name.';
    if (commonPasswords.includes(lower)) return 'Choose a less common password.';
    if (rollNo && lower === String(rollNo).toLowerCase()) return 'Password should not be your Roll No.';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'rollNo') {
      // keep digits only and limit to 4 characters
      const digits = String(value).replace(/\D/g, '').slice(0, 4);
      setFormData({ ...formData, rollNo: digits });
      if (digits.length !== 4) setRollError('Roll No must be exactly 4 digits.');
      else setRollError('');
      // re-evaluate password rules (in case password equals roll)
      if (formData.password) setPasswordError(validatePassword(formData.password, formData.name, digits));
      return;
    }
    if (name === 'password') {
      setFormData({ ...formData, password: value });
      setPasswordError(validatePassword(value, formData.name, formData.rollNo));
      return;
    }
    // for name changes: allow only letters and spaces, normalize to Title Case
    if (name === 'name') {
      // remove non-letters/spaces and collapse multiple spaces
      const cleaned = String(value).replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const title = cleaned.split(' ').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
      setFormData({ ...formData, name: title });
      if (formData.password) setPasswordError(validatePassword(formData.password, title, formData.rollNo));
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handlePhoneChange = (e) => {
    const digits = String(e.target.value).replace(/[^\d+]/g, '');
    setPhone(digits);
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
  const { rollNo, name, className, section, password } = formData;
  if (!phone) { showAlert('Phone number is required.'); return; }
  // phone must include +91 or be 10 digits (then we will prefix +91)
  const normalizedPhone = phone.startsWith('+') ? phone : (phone.length === 10 ? '+91' + phone : phone);
  if (!normalizedPhone.startsWith('+91') || normalizedPhone.replace(/\D/g, '').length !== 12) { showAlert('Provide a correct Indian phone number with country code +91 or a 10-digit local number.'); return; }
    if (!rollNo || !name || !className || !section || !password) { showAlert("All fields are required."); return; }
    if (rollError) { showAlert(rollError); return; }
    const pwdErr = validatePassword(password, name, rollNo);
    if (pwdErr) { setPasswordError(pwdErr); showAlert(pwdErr); return; }

  const studentAuthEmail = `${rollNo.trim()}@student.portal`;

    try {
      const q = query(collection(db, "classes"), where("className", "==", className), where("section", "==", section));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showAlert("This class/section is not configured yet. Please provide correct data or contact your teacher.");
        return;
      }
            
      const classData = querySnapshot.docs[0].data();
      const studentRollNo = parseInt(rollNo.trim(), 10);
      if (studentRollNo < classData.startRoll || studentRollNo > classData.endRoll) {
        showAlert("Your Roll Number is not in the defined range for this class. Please provide correct data.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, studentAuthEmail, password);
      const studentUser = userCredential.user;
      await setDoc(doc(db, "students", studentUser.uid), {
          uid: studentUser.uid, rollNo, name, className, section, phone: normalizedPhone,
          status: 'unverified', createdAt: serverTimestamp(),
      });
    await signOut(auth);
    showAlert("Registration successful! Your account is pending verification.", false);
    setFormData({ rollNo: '', name: '', className: '', section: '', password: ''});
    } catch (err) {
      showAlert(err.code === 'auth/email-already-in-use' ? "This Roll Number is already registered." : err.message);
    }
  };

  const isSubmitDisabled = () => {
    return !formData.rollNo || formData.rollNo.length !== 4 || !formData.name || !formData.className || !formData.section || !formData.password || !!rollError || !!passwordError;
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Roll No</label>
          <input inputMode="numeric" pattern="\d{4}" type="text" name="rollNo" value={formData.rollNo} onChange={handleChange} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
          {rollError && <p className="text-sm text-yellow-300">{rollError}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Full Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Class</label>
          <select name="className" value={formData.className} onChange={handleChange} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md">
            <option value="" disabled>Select</option>
            {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Section</label>
          <select name="section" value={formData.section} onChange={handleChange} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md">
            <option value="" disabled>Select</option>
            {sectionOptions.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Password</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
        {passwordError ? <p className="text-sm text-yellow-300">{passwordError}</p> : <p className="text-sm text-gray-400">Use 8+ characters; avoid using your name or common passwords.</p>}
      </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Phone (India)</label>
            <input type="text" name="phone" value={phone} onChange={handlePhoneChange} placeholder="+911234567890 or 1234567890" required className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
          </div>
        </div>
        <div>
          <button type="submit" disabled={isSubmitDisabled()} className={`w-full ${isSubmitDisabled() ? 'bg-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold py-2 px-4 rounded-md transition`}>
            Register
          </button>
        </div>
    </form>
  );
}

// --- Teacher Dashboard Component ---
function TeacherDashboard({ user, showAlert }) {
  const [activeTab, setActiveTab] = useState('home');
  const [classNav, setClassNav] = useState({ view: 'main', classNumber: null, sectionInfo: null });
  const [viewingStatisticsFor, setViewingStatisticsFor] = useState(null);

  const handleSelectClass = (classNum) => setClassNav({ view: 'sections', classNumber: classNum, sectionInfo: null });
  const handleSelectSection = (sectionInfo) => setClassNav({ view: 'detail', classNumber: sectionInfo.className, sectionInfo: sectionInfo });
  const handleBack = () => {
    if (classNav.view === 'detail') setClassNav({ view: 'sections', classNumber: classNav.classNumber, sectionInfo: null });
    else if (classNav.view === 'sections') setClassNav({ view: 'main', classNumber: null, sectionInfo: null });
  };

  const [discussionTab, setDiscussionTab] = useState(false);
  const [discussionClass, setDiscussionClass] = useState('11');
  const [discussionMessages, setDiscussionMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'discussions'), where('className', '==', discussionClass)),
      snap => {
        setDiscussionMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      }
    );
    return () => unsub();
  }, [discussionClass]);
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await addDoc(collection(db, 'discussions'), {
      message: newMessage.trim(),
      name: 'Teacher',
      className: discussionClass,
      section: '',
      role: 'teacher',
      createdAt: serverTimestamp()
    });
    setNewMessage('');
  };
  const navLinks = [
    { key: 'home', label: 'Home' },
    { key: 'classes', label: 'Classes' },
    { key: 'quizzes', label: 'Quizzes' },
    { key: 'topStudents', label: 'Top Students' },
    { key: 'discussion', label: 'Discussion' }
  ];
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
             <h1 className="text-2xl font-bold text-indigo-600">Teacher Panel</h1>
            <nav className="hidden md:flex items-center space-x-4">
               {navLinks.map(link => (
                <a href="#" key={link.key} onClick={(e) => { e.preventDefault(); setActiveTab(link.key); setClassNav({ view: 'main', classNumber: null, sectionInfo: null }); setDiscussionTab(link.key === 'discussion'); }} 
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${activeTab === link.key ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-200'}`}>
                  {link.label}
                </a>
               ))}
            </nav>
            <button onClick={() => signOut(auth)} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'classes' && (
          <>
            {classNav.view === 'main' && <ClassesDashboard onSelectClass={handleSelectClass} showAlert={showAlert} />}
            {classNav.view === 'sections' && <SectionsView classNumber={classNav.classNumber} onSelectSection={handleSelectSection} onBack={handleBack} showAlert={showAlert} />}
            {classNav.view === 'detail' && <SectionDetailView sectionInfo={classNav.sectionInfo} onBack={handleBack} showAlert={showAlert} onViewStatistics={setViewingStatisticsFor} />}
          </>
        )}
        {activeTab === 'quizzes' && <QuizzesDashboard teacherId={user.uid} showAlert={showAlert} />}
        {activeTab === 'topStudents' && <TopStudentsView />}
        {activeTab === 'discussion' && (
          <div className="min-h-screen bg-white flex flex-col relative">
            <button
              onClick={() => { setDiscussionTab(false); setActiveTab('home'); }}
              className="absolute top-4 left-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded shadow"
            >
              Back to Home
            </button>
            <header className="border-b px-6 py-4 flex items-center justify-center">
              <h2 className="text-2xl font-bold">Class Discussion</h2>
              <div className="flex gap-4 absolute right-6 top-4">
                <button onClick={() => setDiscussionClass('11')} className={`px-4 py-2 rounded ${discussionClass==='11' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>11th</button>
                <button onClick={() => setDiscussionClass('12')} className={`px-4 py-2 rounded ${discussionClass==='12' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>12th</button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{background:'#f9fafb'}}>
              {discussionMessages.length === 0 ? (
                <p className="text-gray-500">No messages yet.</p>
              ) : (
                <ul className="space-y-3">
                  {[...discussionMessages].sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds).map(msg => (
                    <li key={msg.id} className={`flex flex-col ${msg.role === 'teacher' ? 'items-end' : 'items-start'}`}> 
                      <div className={`inline-block px-4 py-2 rounded-lg shadow ${msg.role === 'teacher' ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-gray-100 border border-gray-300 text-gray-800'}`}> 
                        <span className="font-semibold">{msg.name} {msg.className} {msg.section}:</span> {msg.message}
                      </div>
                      <span className="text-xs text-gray-400 mt-1">{msg.createdAt?.toDate?.().toLocaleString?.() ?? ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-6 py-4 border-t flex gap-2">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 border rounded px-2 py-2" placeholder="Type your message..." />
              <button onClick={handleSendMessage} className="bg-indigo-600 text-white px-4 py-2 rounded">Send</button>
            </div>
          </div>
        )}
      </main>
      {viewingStatisticsFor && <StudentStatisticsModal student={viewingStatisticsFor} onClose={() => setViewingStatisticsFor(null)} />}
    </div>
  );
}
// --- Quizzes Dashboard for Teacher ---
function QuizzesDashboard({ teacherId, showAlert }) {
  const [classNum, setClassNum] = useState('11');
  const [quizzes, setQuizzes] = useState([]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [quizDetails, setQuizDetails] = useState(null);

  // Fetch quizzes
  useEffect(() => {
    const q = query(collection(db, 'quizzes'), where('className', '==', classNum));
    const unsubscribe = onSnapshot(q, snap => {
      setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [classNum]);

  const handleCreateQuiz = (details) => {
    setQuizDetails(details);
    setCreatingQuiz(true);
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm("Are you sure you want to delete this quiz? This action is irreversible.")) {
      try {
        // Delete all questions associated with the quiz
        const q = query(collection(db, 'quiz_questions'), where('quizId', '==', quizId));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // Delete the quiz itself
        await deleteDoc(doc(db, 'quizzes', quizId));
        showAlert("Quiz deleted successfully.", false);
      } catch (error) {
        showAlert("Error deleting quiz: " + error.message);
      }
    }
  };


  const handleFinishCreation = () => {
    setCreatingQuiz(false);
    setQuizDetails(null);
    showAlert('Quiz successfully created!', false);
  };

  if (creatingQuiz) {
    return <QuizCreationPage quizDetails={quizDetails} onFinish={handleFinishCreation} showAlert={showAlert} teacherId={teacherId} />;
  }

  return (
    <div className="px-4 sm:px-0">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Manage Quizzes</h2>
      <div className="flex gap-4 mb-6">
        <button onClick={() => setClassNum('11')} className={`px-4 py-2 rounded ${classNum==='11' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Class 11</button>
        <button onClick={() => setClassNum('12')} className={`px-4 py-2 rounded ${classNum==='12' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Class 12</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-xl font-semibold mb-4">Quizzes for Class {classNum}</h3>
        <button onClick={() => handleCreateQuiz({ className: classNum, title: '', marksCorrect: 1, negativeMarksWrong: 1, negativeMarksSkipped: 2 })} className="bg-green-600 text-white px-4 py-2 rounded mb-4">Create New Test</button>
        <div className="space-y-4">
          {quizzes.length > 0 ? (
            quizzes.map(quiz => (
              <div key={quiz.id} className="p-4 border rounded flex justify-between items-center">
                <div>
                  <p className="font-semibold">{quiz.title}</p>
                  <p className="text-sm text-gray-500">Created: {quiz.createdAt?.toDate?.().toLocaleString()}</p>
                </div>
                <button onClick={() => handleDeleteQuiz(quiz.id)} className="bg-red-500 text-white px-4 py-2 rounded">Delete Test</button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No quizzes found for this class.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Quiz Details Modal Component ---
function QuizDetailsModal({ details, onConfirm, onClose }) {
  const [title, setTitle] = useState('');

  const handleSave = () => {
    if (!title) { alert('Please enter a quiz title.'); return; }
    onConfirm({ ...details, title });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Test Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Test Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Maths Unit 1 Test" className="w-full mt-1 border px-3 py-2 rounded" />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Marks per Correct Answer: <span className="font-bold">+1</span></p>
            <p>Negative Marking (Wrong): <span className="font-bold">-1</span></p>
            <p>Negative Marking (Skipped): <span className="font-bold">-2</span></p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Start Creating</button>
        </div>
      </div>
    </div>
  );
}


// --- Quiz Creation Page Component ---
function QuizCreationPage({ quizDetails, onFinish, showAlert, teacherId }) {
  const [questions, setQuestions] = useState([{ questionText: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', timeLimit: 60 }]);
  const [saving, setSaving] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([...questions, { questionText: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', timeLimit: 60 }]);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    if (field === 'options') {
      newQuestions[index].options = { ...newQuestions[index].options, ...value };
    } else {
      newQuestions[index][field] = value;
    }
    setQuestions(newQuestions);
  };

  const handleSaveQuiz = async () => {
    if (questions.some(q => !q.questionText || !Object.values(q.options).every(opt => opt) || !q.correctAnswer)) {
      showAlert('All question fields must be filled out.');
      return;
    }
    setSaving(true);
    try {
      // 1. Create a new quiz document
      const quizRef = await addDoc(collection(db, 'quizzes'), {
        ...quizDetails,
        createdAt: serverTimestamp(),
        createdBy: teacherId,
        questions: [], // We'll update this later
      });
      const quizId = quizRef.id;

      // 2. Add each question to the quiz_questions collection and store their IDs
      const questionIds = [];
      for (const [index, q] of questions.entries()) {
        const questionRef = await addDoc(collection(db, 'quiz_questions'), {
          ...q,
          quizId,
          questionNumber: index + 1,
        });
        questionIds.push(questionRef.id);
      }

      // 3. Update the quiz document with the question IDs
      await updateDoc(quizRef, { questions: questionIds });
      
      setSaving(false);
      onFinish();
    } catch (error) {
      setSaving(false);
      showAlert('Error creating quiz: ' + error.message);
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Create New Test: {quizDetails.title}</h2>
      {questions.map((q, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow border mb-6">
          <h3 className="text-xl font-semibold mb-4">Question {index + 1}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Question</label>
              <textarea value={q.questionText} onChange={e => handleQuestionChange(index, 'questionText', e.target.value)} rows={3} className="w-full mt-1 border px-3 py-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D'].map(option => (
                <div key={option}>
                  <label className="block text-sm font-medium">Option {option}</label>
                  <input type="text" value={q.options[option]} onChange={e => handleQuestionChange(index, 'options', { [option]: e.target.value })} className="w-full mt-1 border px-3 py-2 rounded" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium">Correct Answer</label>
              <select value={q.correctAnswer} onChange={e => handleQuestionChange(index, 'correctAnswer', e.target.value)} className="w-full mt-1 border px-3 py-2 rounded">
                {['A', 'B', 'C', 'D'].map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Time Limit (seconds)</label>
              <input type="number" min={10} value={q.timeLimit} onChange={e => handleQuestionChange(index, 'timeLimit', Number(e.target.value))} className="w-full mt-1 border px-3 py-2 rounded" />
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between gap-4">
        <button onClick={handleAddQuestion} className="bg-gray-500 text-white px-4 py-2 rounded">Add Question</button>
        <button onClick={handleSaveQuiz} disabled={saving} className={`bg-indigo-600 text-white px-4 py-2 rounded ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {saving ? 'Finishing...' : 'Finish Creating'}
        </button>
      </div>
    </div>
  );
}
// --- Home Dashboard View ---
function HomeView() {
  const [noticeText, setNoticeText] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSendNotice = async () => {
    if (!noticeText.trim()) return;
    setSending(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
      await addDoc(collection(db, 'notices'), {
        message: noticeText.trim(),
        createdAt: serverTimestamp(),
        expiresAt
      });
      setNoticeText('');
      setSuccessMsg('Notice sent to all students!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setSuccessMsg('Error sending notice: ' + err.message);
    }
    setSending(false);
  };

  return (
    <div className="px-4 sm:px-0">
      <h2 className="text-3xl font-bold text-gray-900">Welcome!</h2>
      <p className="mt-1 text-lg text-gray-600">Have a nice work session.</p>
      <div className="mt-8 bg-white p-6 rounded-lg shadow border">
        <h3 className="text-xl font-semibold text-gray-800">Quick Actions</h3>
        <p className="mt-2 text-gray-600">Select 'Classes' from the navigation bar to start managing your students and sections.</p>
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow border">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Notice Board (Push to All Students)</h3>
        <textarea value={noticeText} onChange={e => setNoticeText(e.target.value)} rows={3} className="w-full border rounded p-2 mb-2" placeholder="Type your notice here..." />
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm text-gray-700">Expires in</label>
          <input type="number" min={1} max={168} value={expiryHours} onChange={e => setExpiryHours(Number(e.target.value))} className="w-16 border rounded px-2 py-1" />
          <span className="text-sm text-gray-500">hours</span>
        </div>
        <button onClick={handleSendNotice} disabled={sending || !noticeText.trim()} className={`bg-indigo-600 text-white px-4 py-2 rounded ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}>Send Notice</button>
        {successMsg && <p className="mt-2 text-green-600 font-semibold">{successMsg}</p>}
      </div>
    </div>
  );
}

// --- Classes Dashboard View ---
function ClassesDashboard({ onSelectClass, showAlert }) {
  const [pendingCounts, setPendingCounts] = useState({ '11': 0, '12': 0 });
  useEffect(() => {
    const q = query(collection(db, "students"), where("status", "==", "unverified"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const counts = { '11': 0, '12': 0 };
      snap.forEach(doc => {
        const student = doc.data();
        if (student.className === '11' || student.className === '12') {
          counts[student.className]++;
        }
      });
      setPendingCounts(counts);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
        <h2 className="text-3xl font-bold text-gray-900">Select a Class</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-0">
        <ClassSelectionCard classNumber="11" count={pendingCounts['11']} onClick={() => onSelectClass('11')} />
        <ClassSelectionCard classNumber="12" count={pendingCounts['12']} onClick={() => onSelectClass('12')} />
      </div>
      
    </>
  );
}

// --- Sections View ---
function SectionsView({ classNumber, onSelectSection, onBack, showAlert }) {
  const [configuredSections, setConfiguredSections] = useState([]);
  const [modalInfo, setModalInfo] = useState({ isOpen: false, section: null, data: null });
  const [pendingCounts, setPendingCounts] = useState({});
  const [sectionStatusCounts, setSectionStatusCounts] = useState({});
  const allSections = ['A', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  useEffect(() => {
    // Listen to all classes and filter client-side so we support documents
    // that use either `className` or legacy `class` field names.
    const unsubscribe = onSnapshot(collection(db, "classes"), async (snap) => {
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => String(c.className) === String(classNumber) || String(c.class) === String(classNumber));
      setConfiguredSections(list);

      // Auto-create missing section docs (placeholder without ranges) so teacher can set ranges
      const existingSections = new Set(list.map(c => String(c.section)));
      const missing = allSections.filter(s => !existingSections.has(s));
      for (const sec of missing) {
        try {
          await addDoc(collection(db, 'classes'), { className: String(classNumber), section: String(sec), startRoll: null, endRoll: null, createdAt: serverTimestamp() });
        } catch (e) {
          // ignore creation errors, continue
        }
      }
    });

    const studentsQuery = query(collection(db, "students"), where("className", "==", classNumber));
    const studentUnsub = onSnapshot(studentsQuery, (snap) => {
      const counts = {};
      // initialize counts for all sections so missing sections show zeros
      allSections.forEach(s => counts[s] = { verified: 0, unverified: 0, rejected: 0, blocked: 0 });
      snap.forEach(doc => {
        const student = doc.data();
        const sec = student.section || '';
        const st = student.status || 'unverified';
        if (!counts[sec]) counts[sec] = { verified: 0, unverified: 0, rejected: 0, blocked: 0 };
        if (st === 'verified') counts[sec].verified++;
        else if (st === 'rejected') counts[sec].rejected++;
        else if (st === 'blocked') counts[sec].blocked++;
        else counts[sec].unverified++;
      });
      // pendingCounts is used elsewhere (class-level pending), keep its shape for backwards compatibility
      const unverifiedMap = {};
      Object.keys(counts).forEach(k => { unverifiedMap[k] = counts[k].unverified; });
      setPendingCounts(unverifiedMap);
      setSectionStatusCounts(counts);
    });

    return () => { unsubscribe(); studentUnsub(); };
  }, [classNumber]);

  return (
    <>
      <div className="flex items-center mb-6 px-4 sm:px-0">
         <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-200"><ArrowLeftIcon/></button>
        <h2 className="text-3xl font-bold text-gray-900">Class {classNumber} Sections</h2>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 sm:px-0">
  {allSections.map(sectionLetter => {
    const sectionData = configuredSections.find(s => s.section === sectionLetter);
    const statusCounts = sectionStatusCounts[sectionLetter] || { verified: 0, unverified: 0, rejected: 0 };
    return <SectionCard 
    key={sectionLetter} 
    sectionInfo={sectionData}
    sectionLetter={sectionLetter}
    onSelectSection={onSelectSection} 
    showAlert={showAlert} 
    onModifyClick={() => setModalInfo({ isOpen: true, section: sectionLetter, data: sectionData })}
    pendingCount={pendingCounts[sectionLetter] || 0}
    statusCounts={statusCounts} />;
  })}
      </div>
      {modalInfo.isOpen && <ConfigureSectionModal classNumber={classNumber} section={modalInfo.section} existingData={modalInfo.data} onClose={() => setModalInfo({isOpen: false, section: null, data: null})} showAlert={showAlert} />}
    </>
  );
}

// --- Section Detail View ---
function SectionDetailView({ sectionInfo, showAlert, onViewStatistics, onBack }) {
  const [showClearModal, setShowClearModal] = useState(false);
  const handleClearSection = async () => {
    try {
      // Get all students in this section and class
      const allStudents = [ ...students.unverified, ...students.verified, ...students.rejected, ...students.blocked ];
      const batch = writeBatch(db);
      allStudents.forEach(stu => {
        batch.delete(doc(db, "students", stu.id));
      });
      await batch.commit();
      setShowClearModal(false);
      if (showAlert) showAlert("All students in this section erased.", false);
    } catch (err) {
      if (showAlert) showAlert("Error erasing section: " + err.message);
    }
  };
  const [students, setStudents] = useState({ unverified: [], verified: [], rejected: [], blocked: [] });
  const [activeTab, setActiveTab] = useState('unverified');

  useEffect(() => {
    if (!sectionInfo) return;
    // Listen to students in the same section and filter client-side by className or legacy `class` field
    const q = query(collection(db, "students"), where("section", "==", sectionInfo.section));
    const unsubscribe = onSnapshot(q, (snap) => {
    const buckets = { unverified: [], verified: [], rejected: [], blocked: [] };
      snap.docs.forEach(d => {
        const data = { id: d.id, ...d.data() };
        const studentClass = String(data.className || data.class || '');
        if (studentClass !== String(sectionInfo.className) && studentClass !== String(sectionInfo.class)) return;
        const st = data.status || 'unverified';
  if (st === 'verified') buckets.verified.push(data);
  else if (st === 'rejected') buckets.rejected.push(data);
  else if (st === 'blocked') buckets.blocked.push(data);
  else buckets.unverified.push(data);
      });
      setStudents(buckets);
    });
    return () => unsubscribe();
  }, [sectionInfo]);
    
  const handleUpdateStatus = async (studentId, newStatus) => {
    try {
      const updates = { status: newStatus };
      // When verifying, ensure the student's className and section are set to this section
      if (newStatus === 'verified' && sectionInfo) {
        updates.className = sectionInfo.className || sectionInfo.class;
        updates.section = sectionInfo.section;
      }
      await updateDoc(doc(db, "students", studentId), updates);
      showAlert(`Student status updated to ${newStatus}`, false);
    } catch (error) {
      showAlert("Error updating student status: " + (error.message || error));
    }
  };
    
  const navLinks = [ { key: 'unverified', label: 'Unverified' }, { key: 'verified', label: 'Verified' }, { key: 'rejected', label: 'Rejected' }, { key: 'blocked', label: 'Blocked' }];

  return (
    <>
      <div className="flex items-center mb-6 px-4 sm:px-0">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-200"><ArrowLeftIcon/></button>
        <h2 className="text-3xl font-bold text-gray-900">Manage Students: {sectionInfo.name}</h2>
      </div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 px-4 sm:px-0" aria-label="Tabs">
          {navLinks.map(link => (
            <button key={link.key} onClick={() => setActiveTab(link.key)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === link.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {link.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
        {students[activeTab].length > 0 ? students[activeTab].map(student => ( <StudentCard key={student.id} student={student} onUpdateStatus={handleUpdateStatus} onViewStatistics={onViewStatistics}/> )) : <p className="text-gray-500 col-span-full text-center py-10">No {activeTab} students in this section.</p>}
      </div>
    </>
  );
}

// --- Top Students View (Placeholder) ---
function TopStudentsView() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6 px-4 sm:px-0">Top Students</h2>
      <div className="bg-white p-6 rounded-lg shadow border">
        <p className="text-gray-600">This feature is coming soon! It will display a ranked list of students based on their overall quiz performance.</p>
      </div>
    </div>
  );
}

// --- Configure/Modify Section Modal ---
function ConfigureSectionModal({ classNumber, section, existingData, onClose, showAlert }) { /* ... same as before */ return <div/>; }

// --- Confirmation Modal ---
function ConfirmationModal({ title, message, onConfirm, onCancel }) { /* ... same as before */ return <div/>; }

// --- Card Components ---
function StudentCard({ student, onUpdateStatus, onViewStatistics }) {
  const { id, name, rollNo, className, section, status } = student;
  return (
    <div className="bg-white p-4 rounded-lg shadow border flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-lg">{name || 'Unnamed Student'}</h3>
        <p className="text-sm text-gray-500">Roll: <span className="font-mono">{rollNo}</span></p>
        <p className="text-sm text-gray-500">Class: {className || '—'} · Section: {section || '—'}</p>
        <p className="mt-2 text-xs text-gray-400">Status: <span className={`font-semibold ${status === 'verified' ? 'text-green-600' : status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{status}</span></p>
      </div>
      <div className="mt-4 flex gap-2">
        {status === 'unverified' && (
          <>
            <button onClick={() => onUpdateStatus(id, 'verified')} className="flex-1 bg-green-600 text-white py-2 rounded">Verify</button>
            <button onClick={() => onUpdateStatus(id, 'rejected')} className="flex-1 bg-red-500 text-white py-2 rounded">Reject</button>
          </>
        )}
        {status === 'verified' && (
          <>
            <button onClick={() => onViewStatistics && onViewStatistics(student)} className="flex-1 bg-indigo-600 text-white py-2 rounded">Statistics</button>
          </>
        )}
        {status === 'rejected' && (
          <>
            <button onClick={() => onUpdateStatus(id, 'unverified')} className="flex-1 bg-yellow-500 text-white py-2 rounded">Re-verify</button>
            <button onClick={() => onUpdateStatus(id, 'blocked')} className="flex-1 bg-gray-800 text-white py-2 rounded">Block</button>
          </>
        )}
      </div>
    </div>
  );
}
function ClassSelectionCard({ classNumber, count, onClick }) {
  return (
    <div className="relative bg-white p-4 rounded-lg shadow border flex flex-col justify-between cursor-pointer" onClick={onClick}>
      {count > 0 && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">{count}</div>
        </div>
      )}
      <div>
        <h3 className="font-bold text-lg">Class {classNumber}</h3>
        <p className="mt-2 text-sm text-gray-600">Pending Verifications: <span className="font-semibold text-red-600">{count}</span></p>
      </div>
    </div>
  );
}
function UnconfiguredSectionCard({ sectionLetter, onClick }) { /* ... same as before */ return <div/>; }

// --- Student Dashboard Component ---
function StudentDashboard({ user }) {
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState('home');
  const [sections, setSections] = useState([]);
  const [sectionStudents, setSectionStudents] = useState({});
  const [viewSection, setViewSection] = useState(null);
  const [viewingStatisticsFor, setViewingStatisticsFor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notices, setNotices] = useState([]);
  const [discussionMessages, setDiscussionMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);


  useEffect(() => {
    if (!user) return;
    const fetchStudent = async () => {
      try {
        const docRef = await getDoc(doc(db, 'students', user.uid));
        if (docRef.exists()) setStudent({ id: docRef.id, ...docRef.data() });
      } catch (e) {
        // ignore
      }
    };
    fetchStudent();
  }, [user]);

  // Listen for discussion messages for student's class
  useEffect(() => {
    if (!student?.className && !student?.class) return;
    const classNum = student.className || student.class;
    const unsub = onSnapshot(query(collection(db, 'discussions'), where('className', '==', String(classNum))), snap => {
      setDiscussionMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsub();
  }, [student]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !student) return;
    await addDoc(collection(db, 'discussions'), {
      message: newMessage.trim(),
      name: student.name,
      className: student.className || student.class,
      section: student.section,
      role: 'student',
      createdAt: serverTimestamp()
    });
    setNewMessage('');
  };

  // Listen for personal notifications (e.g., verification)
  useEffect(() => {
    if (!student?.id) return;
    const unsub = onSnapshot(query(collection(db, 'notifications'), where('studentId', '==', student.id)), snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [student]);

  // Listen for global notices
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notices'), snap => {
      setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Fetch sections for student's class
  useEffect(() => {
    if (!student?.className && !student?.class) return;
    const classNum = student.className || student.class;
    const unsub = onSnapshot(query(collection(db, 'classes'), where('className', '==', String(classNum))), snap => {
      setSections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [student]);

  // Fetch verified students for each section
  useEffect(() => {
    if (!student?.className && !student?.class) return;
    const classNum = student.className || student.class;
    const allSections = ['A', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const unsub = onSnapshot(query(collection(db, 'students'), where('className', '==', String(classNum)), where('status', '==', 'verified')), snap => {
      const buckets = {};
      allSections.forEach(s => buckets[s] = []);
      snap.docs.forEach(d => {
        const data = { id: d.id, ...d.data() };
        const sec = data.section || '';
        if (buckets[sec]) buckets[sec].push(data);
      });
      setSectionStudents(buckets);
    });
    return () => unsub();
  }, [student]);

  // Fetch quizzes for the student's class
  useEffect(() => {
    if (!student?.className) return;
    const q = query(collection(db, 'quizzes'), where('className', '==', student.className));
    const unsubscribe = onSnapshot(q, snap => {
      setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [student]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { /* ignore */ }
  };

  function StudentQuizzesView({ student, quizzes, selectedQuiz, setSelectedQuiz }) {
    const [completedQuizzes, setCompletedQuizzes] = useState([]);
    useEffect(() => {
      if (!student?.id) return;
      const q = query(collection(db, 'quiz_results'), where('studentId', '==', student.id));
      const unsubscribe = onSnapshot(q, snap => {
        setCompletedQuizzes(snap.docs.map(d => d.data().quizId));
      });
      return () => unsubscribe();
    }, [student]);

    if (!student) {
      return <p className="text-gray-500">Loading student data...</p>;
    }
  
    if (selectedQuiz) {
      return <QuizAttemptPage quiz={selectedQuiz} studentId={student.id} onClose={() => setSelectedQuiz(null)} />;
    }
  
    return (
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">My Quizzes</h2>
        <div className="space-y-4">
          {quizzes.length > 0 ? (
            quizzes.map(quiz => {
              const isCompleted = completedQuizzes.includes(quiz.id);
              return (
                <div key={quiz.id} className="p-4 border rounded flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">Questions: {quiz.questions?.length || 0}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedQuiz(quiz)} 
                    className={`px-4 py-2 rounded ${isCompleted ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-indigo-600 text-white'}`}
                    disabled={isCompleted}
                  >
                    {isCompleted ? 'Completed' : 'Start Test'}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">No quizzes available for your class yet.</p>
          )}
        </div>
      </div>
    );
  }

function QuizAttemptPage({ quiz, studentId, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResults, setQuizResults] = useState(null);

  // Load questions from Firebase
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!quiz?.questions || quiz.questions.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }
      const questionsData = [];
      for (const qId of quiz.questions) {
        const qDoc = await getDoc(doc(db, 'quiz_questions', qId));
        if (qDoc.exists()) {
          questionsData.push({ id: qDoc.id, ...qDoc.data() });
        }
      }
      setQuestions(questionsData.sort((a,b) => a.questionNumber - b.questionNumber));
      setLoading(false);
    };
    fetchQuestions();
  }, [quiz]);

  // Handle timer for each question
  useEffect(() => {
    if (loading || quizFinished) return;
    setTimer(questions[currentQuestionIndex]?.timeLimit || 60);
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNextQuestion('skipped');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex, loading, quizFinished, questions]);

  const handleNextQuestion = async (status = 'skipped') => {
    const marksCorrect = Number(1);
    const negativeMarksWrong = Number(1);
    const negativeMarksSkipped = Number(2);
    
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = { ...answers };
    newAnswers[currentQuestion.id] = {
      userAnswer: selectedAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      status: status,
      marks: 0
    };
    
    if (status === 'correct') {
      newAnswers[currentQuestion.id].marks = marksCorrect;
    } else if (status === 'incorrect') {
      newAnswers[currentQuestion.id].marks = -negativeMarksWrong;
    } else if (status === 'skipped') {
      newAnswers[currentQuestion.id].marks = -negativeMarksSkipped;
    }

    setAnswers(newAnswers);
    setSelectedAnswer(null);

    // Move to the next question or finish quiz
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      let totalScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let skippedCount = 0;
      let gainedMarks = 0;
      let negativeMarks = 0;
      
      const newCalculatedAnswers = { ...answers };
      const lastQuestion = questions[currentQuestionIndex];
      const lastQuestionStatus = selectedAnswer ? (selectedAnswer === lastQuestion.correctAnswer ? 'correct' : 'incorrect') : 'skipped';
      let lastQuestionMarks = 0;
      if (lastQuestionStatus === 'correct') {
        lastQuestionMarks = marksCorrect;
      } else if (lastQuestionStatus === 'incorrect') {
        lastQuestionMarks = -negativeMarksWrong;
      } else if (lastQuestionStatus === 'skipped') {
        lastQuestionMarks = -negativeMarksSkipped;
      }
      newCalculatedAnswers[lastQuestion.id] = {
        userAnswer: selectedAnswer,
        correctAnswer: lastQuestion.correctAnswer,
        status: lastQuestionStatus,
        marks: lastQuestionMarks
      };
      
      Object.values(newCalculatedAnswers).forEach(ans => {
        if (ans.status === 'correct') {
          gainedMarks += marksCorrect;
          correctCount++;
        } else if (ans.status === 'incorrect') {
          negativeMarks += negativeMarksWrong;
          incorrectCount++;
        } else if (ans.status === 'skipped') {
          negativeMarks += negativeMarksSkipped;
          skippedCount++;
        }
      });
      
      totalScore = gainedMarks - negativeMarks;

      const results = {
        totalScore: totalScore,
        correctCount,
        incorrectCount,
        skippedCount,
        totalQuestions: questions.length,
        gainedMarks,
        negativeMarks,
        maxMarks: questions.length * marksCorrect
      };

      await addDoc(collection(db, 'quiz_results'), {
        quizId: quiz.id,
        studentId: studentId,
        score: totalScore,
        details: results,
        submittedAt: serverTimestamp(),
      });

      setQuizResults(results);
      setQuizFinished(true);
    }
  };

  const handleAnswerClick = (option) => {
    setSelectedAnswer(option);
  };
  
  if (loading) {
    return <div className="text-center py-10">Loading quiz...</div>;
  }
  
  if (quizFinished) {
    const { totalScore, maxMarks, gainedMarks, negativeMarks } = quizResults;
    
    const barData = [
      { label: 'Gained Marks', value: gainedMarks, color: '#22c55e' },
      { label: 'Negative Marking', value: negativeMarks, color: '#f97316' },
    ];
    
    const maxValue = Math.max(...barData.map(d => d.value));

    return (
      <div className="bg-white p-6 rounded-lg shadow-xl text-center">
        <h2 className="text-3xl font-bold text-green-600 mb-4">Quiz Complete!</h2>
        <div className="text-lg text-gray-700 mb-6">
          Your Score: <span className="font-bold text-indigo-600">{totalScore}</span> / {maxMarks}
        </div>
        
        <div className="flex justify-center items-end h-64 gap-4">
          {barData.map((bar, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="w-12 rounded-t-lg transition-all duration-500" 
                style={{
                  height: `${(bar.value / (maxValue || 1)) * 100}%`,
                  backgroundColor: bar.color
                }}>
              </div>
              <span className="mt-2 text-sm text-gray-600">{bar.label}</span>
              <span className="font-bold text-sm" style={{ color: bar.color }}>
                {bar.label === 'Negative Marking' ? `-${bar.value}` : bar.value}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-8 space-y-2 text-sm text-gray-700">
          <div className="flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            <span>Correct Answers: {quizResults.correctCount}</span>
          </div>
          <div className="flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
            <span>Incorrect Answers: {quizResults.incorrectCount}</span>
          </div>
          <div className="flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
            <span>Skipped Answers: {quizResults.skippedCount}</span>
          </div>
        </div>

        <button onClick={onClose} className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg">Back to Quizzes</button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="text-center py-10">Quiz has no questions.</div>;
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-6 rounded shadow max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4">{quiz.title}</h2>
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span className="text-red-500 font-bold text-xl">{timer}s</span>
        </div>
        <div className="border-b-2 border-gray-200 pb-4 mb-4">
          <p className="text-gray-800 text-lg">{currentQuestion.questionText}</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {Object.keys(currentQuestion.options).map(optionKey => (
            <button 
              key={optionKey}
              onClick={() => handleAnswerClick(optionKey)}
              className={`text-left w-full px-4 py-3 rounded-lg border-2 transition-colors ${selectedAnswer === optionKey ? 'bg-indigo-100 border-indigo-600 text-indigo-800' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}
            >
              <span className="font-semibold mr-2">{optionKey}.</span>
              {currentQuestion.options[optionKey]}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-between gap-4">
          <button
            onClick={() => handleNextQuestion('skipped')}
            className={`px-6 py-2 rounded-lg ${selectedAnswer ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-yellow-500 text-white'}`}
            disabled={!!selectedAnswer}
          >
            Skip
          </button>
          <button
            onClick={() => handleNextQuestion(selectedAnswer === currentQuestion.correctAnswer ? 'correct' : 'incorrect')}
            className={`px-6 py-2 rounded-lg ${selectedAnswer ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            disabled={!selectedAnswer}
          >
            {isLastQuestion ? 'Finish Quiz' : 'Answer'}
          </button>
        </div>
      </div>
    </div>
  );
}
// ... (rest of the file remains the same)
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-indigo-600">Student Portal</h1>
              <nav className="hidden sm:flex gap-3">
                <button onClick={() => setTab('home')} className={`px-3 py-2 rounded ${tab==='home' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Home</button>
                <button onClick={() => setTab('profile')} className={`px-3 py-2 rounded ${tab==='profile' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Profile</button>
                <button onClick={() => setTab('classes')} className={`px-3 py-2 rounded ${tab==='classes' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Classes</button>
                <button onClick={() => setTab('quizzes')} className={`px-3 py-2 rounded ${tab==='quizzes' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Quizzes</button>
                <button onClick={() => setTab('discussion')} className={`px-3 py-2 rounded ${tab==='discussion' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Discussion</button>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 hidden sm:block">{student?.name ?? ''}</span>
              <button onClick={handleLogout} className="bg-red-600 text-white px-3 py-2 rounded">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {tab === 'home' && (
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold">Welcome, {student?.name ?? 'Student'}</h2>
            <p className="mt-2 text-gray-600">Use the Profile tab to view your details and status.</p>
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-2">Notifications</h3>
              <div className="max-h-80 min-h-[120px] overflow-y-auto bg-gray-50 rounded border p-2">
                {(() => {
                  // Filter notifications: only show verification notifications from classmates for 24 hours
                  const now = Date.now();
                  const filteredNotifications = notifications.filter(note => {
                    if (note.type === 'classmate-verified' && note.createdAt?.toDate) {
                      const created = note.createdAt.toDate().getTime();
                      return now - created < 24 * 60 * 60 * 1000;
                    }
                    return true;
                  });
                  const filteredNotices = notices.filter(notice => {
                    if (notice.expiresAt && notice.expiresAt.toDate) {
                      return now < notice.expiresAt.toDate().getTime();
                    }
                    return true;
                  });
                  if (filteredNotifications.length === 0 && filteredNotices.length === 0) {
                    return <p className="text-gray-500">No notifications yet.</p>;
                  }
                  return (
                    <ul className="space-y-2">
                      {filteredNotices.map(notice => (
                        <li key={notice.id} className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                          <span className="font-semibold text-red-700">Notice:</span> {notice.message}
                          {notice.expiresAt && notice.expiresAt.toDate && (
                            <span className="ml-2 text-xs text-gray-400">Expires: {notice.expiresAt.toDate().toLocaleString()}</span>
                          )}
                          <span className="ml-2 text-xs text-gray-400">Sent at: {notice.createdAt?.toDate?.().toLocaleString?.() ?? ''}</span>
                        </li>
                      ))}
                      {filteredNotifications.map(note => (
                        <li key={note.id} className={`p-3 rounded border-l-4 ${note.type === 'classmate-verified' ? 'bg-green-50 border-green-400' : 'bg-green-100 border-green-300'}`}>
                          <span className="font-semibold">{note.type === 'classmate-verified' ? 'Classmate Verified:' : note.type === 'verified' ? 'Verified:' : 'Notification:'}</span> {note.message}
                          <span className="ml-2 text-xs text-gray-400">{note.createdAt?.toDate?.().toLocaleString?.() ?? ''}</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
        {tab === 'profile' && (
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold">Profile</h2>
            <div className="mt-4 space-y-2 text-gray-700">
              <div><strong>Name:</strong> {student?.name ?? '—'}</div>
              <div><strong>Roll No:</strong> {student?.rollNo ?? '—'}</div>
              <div><strong>Class:</strong> {student?.className ?? student?.class ?? '—'}</div>
              <div><strong>Section:</strong> {student?.section ?? '—'}</div>
              <div><strong>Status:</strong> {student?.status ?? '—'}</div>
            </div>
          </div>
        )}
        {tab === 'classes' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Class {student?.className ?? student?.class} Sections</h2>
            {viewSection === null ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(() => {
                  const sectionOrder = ['A', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                  const uniqueSections = sections.filter((sec, idx, arr) => arr.findIndex(s => s.section === sec.section) === idx);
                  return sectionOrder
                    .map(letter => uniqueSections.find(sec => sec.section === letter))
                    .filter(Boolean)
                    .map(sec => (
                      <div key={sec.section} className="bg-white p-4 rounded-lg shadow border flex flex-col justify-between cursor-pointer" onClick={() => setViewSection(sec.section)}>
                        <h3 className="font-bold text-lg">Section {sec.section}</h3>
                        <p className="mt-2 text-sm text-gray-600">Range: {sec.startRoll ?? '—'} to {sec.endRoll ?? '—'}</p>
                        <p className="mt-2 text-sm text-gray-600">Verified Students: <span className="font-semibold text-green-600">{sectionStudents[sec.section]?.length ?? 0}</span></p>
                      </div>
                    ));
                })()}
              </div>
            ) : (
              <div>
                <button onClick={() => setViewSection(null)} className="mb-4 px-4 py-2 rounded bg-gray-200">Back to Sections</button>
                <h3 className="text-xl font-bold mb-4">Section {viewSection} - Verified Students</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(sectionStudents[viewSection] ?? []).length > 0 ? (
                    sectionStudents[viewSection].map(stu => (
                      <div key={stu.id} className="bg-white p-4 rounded shadow border flex flex-col">
                        <div>
                          <h4 className="font-bold text-lg">{stu.name}</h4>
                          <p className="text-sm text-gray-500">Roll: <span className="font-mono">{stu.rollNo}</span></p>
                        </div>
                        <button onClick={() => setViewingStatisticsFor(stu)} className="mt-4 bg-indigo-600 text-white py-2 rounded">View Statistics</button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 col-span-full text-center py-10">No verified students in this section.</p>
                  )}
                </div>
              </div>
            )}
            {viewingStatisticsFor && <StudentStatisticsModal student={viewingStatisticsFor} onClose={() => setViewingStatisticsFor(null)} />}
          </div>
        )}
        {tab === 'quizzes' && <StudentQuizzesView student={student} quizzes={quizzes} selectedQuiz={selectedQuiz} setSelectedQuiz={setSelectedQuiz} />}
        {tab === 'discussion' && (
          <div className="min-h-[70vh] bg-white flex flex-col rounded shadow relative">
            <button
              onClick={() => setTab('home')}
              className="absolute top-4 left-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded shadow"
            >
              Back to Home
            </button>
            <div className="px-6 py-4 border-b flex items-center justify-center">
              <h2 className="text-2xl font-bold">Class Discussion</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{background:'#f9fafb'}}>
              {discussionMessages.length === 0 ? (
                <p className="text-gray-500">No messages yet.</p>
              ) : (
                <ul className="space-y-3">
                  {[...discussionMessages].sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds).map(msg => (
                    <li key={msg.id} className={`flex flex-col ${msg.role === 'teacher' ? 'items-end' : 'items-start'}`}>
                      <div className={`inline-block px-4 py-2 rounded-lg shadow ${msg.role === 'teacher' ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-gray-100 border border-gray-300 text-gray-800'}`}>
                        <span className="font-semibold">{msg.name} {msg.className} {msg.section}:</span> {msg.message}
                      </div>
                      <span className="text-xs text-gray-400 mt-1">{msg.createdAt?.toDate?.().toLocaleString?.() ?? ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-6 py-4 border-t flex gap-2">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 border rounded px-2 py-2" placeholder="Type your message..." />
              <button onClick={handleSendMessage} className="bg-indigo-600 text-white px-4 py-2 rounded">Send</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}