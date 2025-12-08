import React, { useEffect, useState } from "react";
import { auth, db, serverTimestamp } from "../firebaseInit";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdTokenResult
} from "firebase/auth";

import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  runTransaction,
  setDoc
} from "firebase/firestore";

export default function StaffDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  // ⭐ Sessions
  const [sessionList, setSessionList] = useState([]);
  const [session, setSession] = useState(localStorage.getItem("session") || "Session 1");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // -------------------------------
  // Load all sessions
  // -------------------------------
  async function loadSessions() {
    const snap = await getDocs(collection(db, "sessions"));
    const list = snap.docs.map(d => d.id).sort();
    setSessionList(list);

    // If selected session does not exist, create it
    if (!list.includes(session)) {
      await setDoc(doc(db, "sessions", session), { createdAt: serverTimestamp() });
      setSessionList(prev => [...prev, session]);
    }
  }

  // -------------------------------
  // Authentication
  // -------------------------------
  useEffect(() => {
    loadSessions(); // load sessions on page load

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setIsStaff(false); return; }

      const idTokenResult = await getIdTokenResult(user, true);
      if (idTokenResult.claims?.role === "staff") {
        setIsStaff(true);
        fetchOrders(session);
      } else {
        setIsStaff(false);
        alert("Not a staff account");
      }
    });

    return () => unsub();
  }, []);

  async function login(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  }

  async function logout() {
    await signOut(auth);
    setIsStaff(false);
  }

  // -------------------------------
  // Fetch orders of selected session
  // -------------------------------
  async function fetchOrders(sessionName) {
    setLoading(true);

    const snap = await getDocs(collection(db, "orders"));

    const filtered = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => o.status === "pending" && o.session_id === sessionName);

    setOrders(filtered);
    setLoading(false);
  }

  // Reload orders whenever the session changes
  useEffect(() => {
    if (isStaff) fetchOrders(session);
  }, [session]);

  // -------------------------------
  // Start new session
  // -------------------------------
  async function startNewSession() {
    const last = sessionList.length;
    const newSession = `Session ${last + 1}`;

    await setDoc(doc(db, "sessions", newSession), { createdAt: serverTimestamp() });
    setSession(newSession);
    localStorage.setItem("session", newSession);

    // Create token tracking doc
    await setDoc(doc(db, "tokens", "session_" + newSession), {
      session_id: newSession,
      currentToken: 0,
      lastTokenIssued: 0
    });

    setSessionList(prev => [...prev, newSession]);
    alert("New session started: " + newSession);
  }

  // -------------------------------
  // Approve Order
  // -------------------------------
  async function approveOrder(orderId) {
    try {
      const orderRef = doc(db, "orders", orderId);

      await runTransaction(db, async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order missing");

        const order = orderSnap.data();
        if (order.status !== "pending") throw new Error("Already approved");

        const tokenRef = doc(db, "tokens", "session_" + session);
        const tSnap = await tx.get(tokenRef);

        let last = tSnap.exists() ? tSnap.data().lastTokenIssued : 0;
        const next = last + 1;

        tx.set(tokenRef, {
          session_id: session,
          lastTokenIssued: next,
          currentToken: tSnap.exists() ? tSnap.data().currentToken : 0
        });

        tx.update(orderRef, {
          token: next,
          status: "approved",
          approvedAt: serverTimestamp(),
          session_id: session
        });
      });

      fetchOrders(session);
      alert("Order approved");
    } catch (err) {
      alert("Error approving: " + err.message);
    }
  }

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "auto" }}>
      <h1>Staff Dashboard</h1>

      {/* SESSION DROPDOWN */}
      <h3>Current Session: {session}</h3>
      <select
        value={session}
        onChange={e => {
          setSession(e.target.value);
          localStorage.setItem("session", e.target.value);
        }}
        style={{ padding: 8, marginBottom: 12 }}
      >
        {sessionList.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* START NEW SESSION */}
      <button onClick={startNewSession} style={{ marginLeft: 10 }}>
        Start New Session
      </button>

      {/* LOGIN FORM */}
      {!isStaff && (
        <form onSubmit={login} style={{ marginTop: 20 }}>
          <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <br />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <br />
          <button type="submit">Login</button>
        </form>
      )}

      {/* MAIN STAFF VIEW */}
      {isStaff && (
        <div>
          <div style={{ marginTop: 20 }}>
            <button onClick={() => window.location.href = "/approved"}>
              View Approved Orders
            </button>
            <button onClick={logout} style={{ marginLeft: 10 }}>
              Logout
            </button>
          </div>

          <h3 style={{ marginTop: 20 }}>Pending Orders — {session}</h3>

          {loading && <p>Loading...</p>}

          {!loading && orders.map(o => (
            <div key={o.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
              <strong>{o.customerName} — {o.phone}</strong>
              <p>{(o.items || []).map(i => `${i.quantity}× ${i.name}`).join(", ")}</p>
              <button onClick={() => approveOrder(o.id)}>Approve</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
