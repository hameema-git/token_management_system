// client/src/pages/status.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  query,
  collection,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { Link } from "wouter";
import Footer from "../components/Footer";

/* ---------------- STYLES ---------------- */
const styles = {
  page: { background: "#0b0b0b", color: "#f6e8c1", minHeight: "100vh", padding: 20 },
  container: { maxWidth: 720, margin: "auto" },
  header: { marginBottom: 18 },
  title: { fontSize: 22, fontWeight: 900, color: "#ffd166" },
  subtitle: { color: "#bfb39a", fontSize: 13 },
  inputRow: { background: "#111", padding: 14, borderRadius: 10, marginBottom: 18 },
  input: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #222", background: "#0c0c0c", color: "#fff" },
  findBtn: { marginTop: 8, padding: "10px 14px", background: "#ffd166", color: "#111", border: "none", borderRadius: 8, fontWeight: 800, cursor: "pointer" },
  card: { marginTop: 14, padding: 20, borderRadius: 12, background: "#111", borderLeft: "8px solid #ffd166", textAlign: "center" },
  skippedCard: { marginTop: 14, padding: 20, borderRadius: 12, background: "#111", borderLeft: "8px solid #ff7a00", textAlign: "center" },
  completedCard: { marginTop: 20, padding: 22, borderRadius: 12, background: "#111", borderLeft: "8px solid #2ecc71", textAlign: "center" },
  bottomRow: { display: "flex", gap: 12, marginTop: 30 },
  btn: { flex: 1, padding: "14px", borderRadius: 8, border: "none", fontWeight: 800, cursor: "pointer" },
  backBtn: { background: "#222", color: "#ffd166" },
  refreshBtn: { background: "#ffd166", color: "#111" },
  helpBtn: { marginTop: 12, background: "#333", color: "#ffd166", padding: 12, borderRadius: 8, border: "none", fontWeight: 800 }
};

/* ---------------- COMPONENT ---------------- */
export default function TokenStatus() {
  const params = new URLSearchParams(window.location.search);
  const initialPhone = params.get("phone") || localStorage.getItem("myPhone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [current, setCurrent] = useState(0);
  const [orders, setOrders] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  /* -------- CURRENT TOKEN LISTENER -------- */
  useEffect(() => {
    let unsubscribe;

    async function listenToken() {
      const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
      const session = sessionSnap.exists() ? sessionSnap.data().session_id : "Session 1";

      unsubscribe = onSnapshot(doc(db, "tokens", "session_" + session), snap => {
        if (snap.exists()) setCurrent(snap.data().currentToken || 0);
      });
    }

    listenToken();
    return () => unsubscribe && unsubscribe();
  }, []);

  /* -------- LOAD ALL ORDERS FOR PHONE -------- */
  async function loadOrder() {
    if (!phone) return;
    setLoading(true);

    const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
    const session = sessionSnap.exists() ? sessionSnap.data().session_id : "Session 1";

    const q = query(
      collection(db, "orders"),
      where("phone", "==", String(phone)),
      where("session_id", "==", session),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!list.length) {
      setOrders([]);
      setCompleted(false);
      setLoading(false);
      return;
    }

    const active = list.filter(o => o.status !== "completed");

    if (!active.length) {
      setCompleted(true);
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders(active.reverse()); // latest token first
    setCompleted(false);
    setLoading(false);
  }

  function handleFind() {
    localStorage.setItem("myPhone", phone);
    loadOrder();
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div style={styles.title}>Waffle Lounge — Order Status</div>
          <div style={styles.subtitle}>Track your order in real time</div>
        </div>

        <div style={styles.inputRow}>
          <input
            placeholder="Enter phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={styles.input}
          />
          <button style={styles.findBtn} onClick={handleFind}>Find Order</button>
        </div>

        {loading && <div style={{ textAlign: "center" }}>Loading…</div>}

        {/* TOKENS */}
        {orders.map(o => {
          const position = o.token - current;
          const isSkipped = position < 0;

          return (
            <div key={o.id} style={isSkipped ? styles.skippedCard : styles.card}>
              <div style={{ fontSize: 52, fontWeight: 900 }}>TOKEN {o.token}</div>
              <div>Now Serving: <b>{current || "-"}</b></div>

              {isSkipped ? (
                <div style={{ marginTop: 10 }}>
                  ⚠ Your token was skipped  
                  <br />Please go to the staff counter
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  Position: <b>{position}</b>
                </div>
              )}
            </div>
          );
        })}

        {completed && (
          <div style={styles.completedCard}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>✅ Order Completed</div>
            <div>Please collect your order at the counter</div>
          </div>
        )}

        <button style={styles.helpBtn} onClick={() => setShowHelp(true)}>
          How this works
        </button>

        <div style={styles.bottomRow}>
          <Link href="/">
            <button style={{ ...styles.btn, ...styles.backBtn }}>Back to Menu</button>
          </Link>
          <button style={{ ...styles.btn, ...styles.refreshBtn }} onClick={loadOrder}>
            Refresh
          </button>
        </div>

        <Footer />
      </div>

      {/* HELP MODAL */}
      {showHelp && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "#111", padding: 20, borderRadius: 12, maxWidth: 400 }}>
            <h3>How tokens work</h3>
            <p>• Tokens are served in order</p>
            <p>• Position shows how many are before you</p>
            <p>• If position is negative, your token was skipped</p>
            <p>• Skipped customers must come to staff counter</p>
            <button style={styles.findBtn} onClick={() => setShowHelp(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}