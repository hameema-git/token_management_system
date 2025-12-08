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
  const [uidToken, setUidToken] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [orders, setOrders] = useState([]);

  // ⭐ MANUAL SESSION (stored in localStorage)
  const [session, setSession] = useState(
    localStorage.getItem("session") || "Session 1"
  );

  const [loading, setLoading] = useState(false);

  // -------------------------------
  // LOGIN HANDLING
  // -------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUidToken(null);
        setIsStaff(false);
        setOrders([]);
        return;
      }

      const idTokenResult = await getIdTokenResult(user, true);
      const role = idTokenResult.claims?.role;

      if (role === "staff") {
        setIsStaff(true);
        setUidToken(await user.getIdToken());
        fetchOrders();
      } else {
        setIsStaff(false);
        alert("This user is not staff.");
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
  // FETCH ALL ORDERS
  // -------------------------------
  async function fetchOrders() {
    setLoading(true);

    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(200));
    const snap = await getDocs(q);

    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  // -------------------------------
  // START NEW SESSION
  // -------------------------------
  async function startNewSession() {
    const currentNum = Number(session.split(" ")[1]);
    const newSession = `Session ${currentNum + 1}`;

    // Save new session locally
    localStorage.setItem("session", newSession);
    setSession(newSession);

    // Reset token document
    const tokenRef = doc(db, "tokens", "session_" + newSession);
    await setDoc(tokenRef, {
      session_id: newSession,
      currentToken: 0,
      lastTokenIssued: 0
    });

    alert("New session started: " + newSession);
  }

  // -------------------------------
  // APPROVE ORDER (assign token)
  // -------------------------------
  async function approveOrder(orderId) {
    try {
      const orderRef = doc(db, "orders", orderId);

      await runTransaction(db, async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order gone");

        const order = orderSnap.data();
        if (order.status !== "pending") throw new Error("Not pending");

        const tokenRef = doc(db, "tokens", "session_" + session);
        const tSnap = await tx.get(tokenRef);

        let last = 0;

        if (!tSnap.exists()) {
          tx.set(tokenRef, {
            session_id: session,
            currentToken: 0,
            lastTokenIssued: 0
          });
        } else {
          last = tSnap.data().lastTokenIssued || 0;
        }

        const next = last + 1;

        tx.update(tokenRef, { lastTokenIssued: next });
        tx.update(orderRef, {
          token: next,
          status: "approved",
          approvedAt: serverTimestamp(),
          session_id: session
        });
      });

      fetchOrders();
      alert("Order approved");
    } catch (err) {
      alert("Approve failed: " + err.message);
    }
  }

  // -------------------------------
  // CALL NEXT TOKEN
  // -------------------------------
  async function callNext() {
    try {
      const tokenRef = doc(db, "tokens", "session_" + session);

      await runTransaction(db, async (tx) => {
        const tSnap = await tx.get(tokenRef);

        if (!tSnap.exists()) {
          tx.set(tokenRef, {
            session_id: session,
            currentToken: 1,
            lastTokenIssued: 0
          });
        } else {
          const cur = tSnap.data().currentToken || 0;
          const last = tSnap.data().lastTokenIssued || 0;
          const next = Math.min(cur + 1, Math.max(last, cur + 1));

          tx.update(tokenRef, { currentToken: next });
        }
      });

      fetchOrders();
      alert("Calling next token...");
    } catch (err) {
      alert("Next failed: " + err.message);
    }
  }

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "auto" }}>
      <h1>Staff Dashboard</h1>

      {/* ⭐ SESSION TITLE */}
      <h2>Current Session: {session}</h2>

      {/* ⭐ START NEW SESSION BUTTON */}
      {isStaff && (
        <button onClick={startNewSession} style={{ marginBottom: 20 }}>
          Start New Session
        </button>
      )}

      {/* LOGIN FORM */}
      {!isStaff && (
        <form onSubmit={login} style={{ marginBottom: 20 }}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
          />
          <br />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
          />
          <br />
          <button type="submit">Login</button>
        </form>
      )}

      {isStaff && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <button onClick={callNext}>Call Next</button>
            <button onClick={fetchOrders} style={{ marginLeft: 8 }}>
              Refresh Orders
            </button>
            <button onClick={logout} style={{ marginLeft: 8 }}>
              Sign out
            </button>
            <button
              onClick={() => (window.location.href = "/approved")}
              style={{ marginLeft: 8 }}
            >
              View Approved Orders
            </button>
          </div>

          <h3>Pending Orders</h3>

          {loading && <div>Loading…</div>}

          {!loading &&
            orders
              .filter(o => o.status === "pending")
              .map(o => (
                <div
                  key={o.id}
                  style={{ border: "1px solid #ddd", padding: 10, marginBottom: 8 }}
                >
                  <strong>{o.customerName} — {o.phone}</strong>
                  <div>
                    {(o.items || []).map(i => `${i.quantity}× ${i.name}`).join(", ")}
                  </div>
                  <button onClick={() => approveOrder(o.id)} style={{ marginTop: 8 }}>
                    Approve
                  </button>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
