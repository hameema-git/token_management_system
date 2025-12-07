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
  runTransaction
} from "firebase/firestore";


export default function StaffDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [uidToken, setUidToken] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [orders, setOrders] = useState([]);
  const [session] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setUidToken(null); setIsStaff(false); setOrders([]); return; }
      const idTokenResult = await getIdTokenResult(user, /* forceRefresh */ true);
      const role = idTokenResult.claims?.role;
      if (role === "staff") {
        setIsStaff(true);
        setUidToken(await user.getIdToken());
        fetchOrders();
      } else {
        setIsStaff(false);
        alert("User signed in is not marked as staff. Set custom claim role:'staff' via Admin SDK.");
      }
    });
    return () => unsub();
  }, []);

  async function login(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged will handle next steps
    } catch (err) {
      console.error(err);
      alert("Login failed: " + err.message);
    }
  }

  async function logout() {
    await signOut(auth);
    setUidToken(null);
    setIsStaff(false);
  }

  async function fetchOrders() {
    setLoading(true);
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(200));
    const snap = await getDocs(q);
    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function approveOrder(orderId) {
    try {
      // run atomic transaction on client (requires staff custom claim and Firestore rules allow)
      const orderRef = doc(db, "orders", orderId);
      await runTransaction(db, async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order gone");
        const order = orderSnap.data();
        if (order.status !== "pending") throw new Error("Not pending");
        const tokenRef = doc(db, "tokens", "session_" + order.session_id);
        const tSnap = await tx.get(tokenRef);
        let last = 0;
        if (!tSnap.exists()) tx.set(tokenRef, { session_id: order.session_id, currentToken: 0, lastTokenIssued: 0 });
        else last = tSnap.data().lastTokenIssued || 0;
        const next = last + 1;
        tx.update(tokenRef, { lastTokenIssued: next });
        tx.update(orderRef, { token: next, status: "approved", approvedAt: serverTimestamp() });
      });
      fetchOrders();
      alert("Order approved");
    } catch (err) {
      console.error(err);
      alert("Approve failed: " + (err.message || err));
    }
  }

  async function callNext() {
    try {
      const tokenRef = doc(db, "tokens", "session_" + session);
      await runTransaction(db, async (tx) => {
        const tSnap = await tx.get(tokenRef);
        if (!tSnap.exists()) tx.set(tokenRef, { session_id: session, currentToken: 1, lastTokenIssued: 0 });
        else {
          const cur = tSnap.data().currentToken || 0;
          const last = tSnap.data().lastTokenIssued || 0;
          const next = Math.min(cur + 1, Math.max(last, cur + 1));
          tx.update(tokenRef, { currentToken: next });
        }
      });
      fetchOrders();
      alert("Advanced");
    } catch (err) {
      console.error(err);
      alert("Next failed: " + (err.message || err));
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "auto" }}>
      <h1>Staff Dashboard</h1>

      {!isStaff && (
        <form onSubmit={login} style={{ marginBottom: 16 }}>
          <div>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          </div>
          <div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          </div>
          <div>
            <button type="submit">Sign in</button>
          </div>
          <button onClick={() => window.location.href = "/approved"} style={{ marginLeft: 8 }}>
  View Approved Orders
</button>

        </form>
      )}

      {isStaff && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <button onClick={callNext}>Call Next</button>
            <button onClick={fetchOrders} style={{ marginLeft: 8 }}>Refresh Orders</button>
            <button onClick={logout} style={{ marginLeft: 8 }}>Sign out</button>
          </div>

          <h3>Pending Orders</h3>
          {loading && <div>Loading…</div>}
          {!loading && orders.filter(o => o.status === "pending").map(o => (
            <div key={o.id} style={{ border: "1px solid #eee", padding: 10, marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{o.customerName} — {o.phone}</div>
              <div style={{ fontSize: 13, color: "#444" }}>{(o.items || []).map(i => `${i.quantity}× ${i.name}`).join(", ")}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => approveOrder(o.id)}>Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
