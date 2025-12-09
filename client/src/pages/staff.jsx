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
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot
} from "firebase/firestore";

export default function StaffDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  const [pendingOrders, setPendingOrders] = useState([]);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [currentToken, setCurrentToken] = useState(0);
  const [latestOrderPopup, setLatestOrderPopup] = useState(null);
  const [showPreparingPopup, setShowPreparingPopup] = useState(true);

  const [session, setSession] = useState(
    localStorage.getItem("session") || "Session 1"
  );

  // -------------------------------
  // STAFF LOGIN
  // -------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsStaff(false);
        return;
      }

      const token = await getIdTokenResult(user, true);

      if (token.claims?.role === "staff") {
        setIsStaff(true);
        listenToOrders();
        listenToToken();
      } else {
        alert("This user is NOT staff.");
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
  // REALTIME ORDER LISTENERS
  // -------------------------------
  function listenToOrders() {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const pending = all.filter(
        (o) => o.status === "pending" && o.session_id === session
      );

      const approved = all
        .filter((o) => o.status === "approved" && o.session_id === session)
        .sort((a, b) => (a.token || 0) - (b.token || 0));

      // POPUP: Show latest pending order
      if (pending.length > pendingOrders.length) {
        setLatestOrderPopup(pending[0]);
      }

      setPendingOrders(pending);
      setApprovedOrders(approved);
    });
  }

  function listenToToken() {
    const tokenRef = doc(db, "tokens", "session_" + session);
    onSnapshot(tokenRef, (snap) => {
      if (snap.exists()) {
        setCurrentToken(snap.data().currentToken || 0);
      }
    });
  }

  // -------------------------------
  // START NEW SESSION
  // -------------------------------
  async function startNewSession() {
    const n = Number(session.split(" ")[1]);
    const newSession = `Session ${n + 1}`;

    localStorage.setItem("session", newSession);
    setSession(newSession);

    const ref = doc(db, "tokens", "session_" + newSession);
    await setDoc(ref, { session_id: newSession, currentToken: 0, lastTokenIssued: 0 });

    alert("Session started: " + newSession);
  }

  // -------------------------------
  // APPROVE ORDER
  // -------------------------------
  async function approveOrder(id) {
    try {
      const ref = doc(db, "orders", id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;

        const order = snap.data();
        if (order.status !== "pending") return;

        const tokenRef = doc(db, "tokens", "session_" + session);
        const tSnap = await tx.get(tokenRef);
        const last = tSnap.exists() ? tSnap.data().lastTokenIssued : 0;
        const next = last + 1;

        tx.set(tokenRef, { lastTokenIssued: next }, { merge: true });

        tx.update(ref, {
          token: next,
          status: "approved",
          approvedAt: serverTimestamp(),
          session_id: session
        });
      });
    } catch (err) {
      alert("Approve failed: " + err.message);
    }
  }

  // -------------------------------
  // CALL NEXT TOKEN
  // -------------------------------
  async function callNext() {
    try {
      const ref = doc(db, "tokens", "session_" + session);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);

        let cur = 0;
        let last = 0;

        if (snap.exists()) {
          cur = snap.data().currentToken || 0;
          last = snap.data().lastTokenIssued || 0;
        }

        const next = Math.min(cur + 1, last);

        tx.set(ref, { currentToken: next }, { merge: true });
      });
    } catch (err) {
      alert("Failed: " + err.message);
    }
  }

  // -------------------------------
  // UI STARTS HERE
  // -------------------------------
  return (
    <div style={{ padding: 15, maxWidth: 900, margin: "auto" }}>

      <h1>Staff Dashboard</h1>
      <h3>Session: {session}</h3>

      {/* Action Buttons */}
      {isStaff && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={startNewSession}>Start New Session</button>
          <button onClick={callNext} style={{ marginLeft: 10 }}>
            Call Next (Now Serving #{currentToken})
          </button>
          <button onClick={logout} style={{ marginLeft: 10 }}>
            Logout
          </button>

          <button
            onClick={() => setShowPreparingPopup(true)}
            style={{ marginLeft: 10 }}
          >
            Show Preparing Order
          </button>
        </div>
      )}

      {/* ================= POPUP: NEW ORDER ================= */}
      {latestOrderPopup && (
        <div style={popupStyle}>
          <h3>New Order Received</h3>
          <p><b>{latestOrderPopup.customerName}</b> — {latestOrderPopup.phone}</p>
          <p>{latestOrderPopup.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}</p>

          <button onClick={() => approveOrder(latestOrderPopup.id)}>Approve</button>
          <button onClick={() => setLatestOrderPopup(null)} style={{ marginLeft: 10 }}>
            Close
          </button>
        </div>
      )}

      {/* ================= POPUP: CURRENTLY PREPARING ================= */}
      {showPreparingPopup && (
        <div style={popupStyle}>
          <h3>Currently Preparing</h3>
          <p style={{ fontSize: 22, fontWeight: "bold" }}>Token #{currentToken}</p>

          <button onClick={() => setShowPreparingPopup(false)}>Close</button>
        </div>
      )}

      {/* ================= PENDING ORDERS ================= */}
      <h2>Orders Waiting for Approval</h2>
      {pendingOrders.length === 0 && <p>No pending orders.</p>}

      {pendingOrders.map((o) => (
        <div key={o.id} style={cardStyle}>
          <b>{o.customerName}</b> — {o.phone}
          <div style={{ fontSize: 13 }}>
            {o.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
          </div>

          <div style={{ marginTop: 5 }}>
            <button onClick={() => approveOrder(o.id)}>Approve</button>
          </div>
        </div>
      ))}

      {/* ================= APPROVED ORDERS ================= */}
      <h2 style={{ marginTop: 25 }}>Waiting To Serve</h2>

      {approvedOrders.map((o) => (
        <div
          key={o.id}
          style={{
            ...cardStyle,
            background: o.token === currentToken ? "#fff6d1" : "white",
            borderColor: o.token === currentToken ? "orange" : "#ddd"
          }}
        >
          <b>Token #{o.token}</b>
          <br />
          {o.customerName} — {o.phone}
          <div style={{ fontSize: 13 }}>
            {o.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
          </div>
        </div>
      ))}

    </div>
  );
}

const popupStyle = {
  position: "fixed",
  top: "20px",
  right: "20px",
  background: "white",
  padding: "15px",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  zIndex: 999,
  maxWidth: "300px"
};

const cardStyle = {
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 6,
  marginBottom: 10
};
