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

const styles = {
  page: {
    background: "#0b0b0b",
    color: "#f6e8c1",
    minHeight: "100vh",
    padding: 20
  },
  container: { maxWidth: 720, margin: "auto" },

  header: { marginBottom: 18 },
  title: { fontSize: 22, fontWeight: 900, color: "#ffd166" },
  subtitle: { color: "#bfb39a", fontSize: 13 },

  inputRow: {
    background: "#111",
    padding: 14,
    borderRadius: 10,
    marginBottom: 18
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff"
  },
  findBtn: {
    marginTop: 8,
    padding: "10px 14px",
    background: "#ffd166",
    color: "#111",
    border: "none",
    borderRadius: 8,
    fontWeight: 800
  },

  card: {
    marginTop: 14,
    padding: 20,
    borderRadius: 12,
    background: "#111",
    borderLeft: "8px solid #ffd166",
    textAlign: "center"
  },

  completedCard: {
    marginTop: 20,
    padding: 22,
    borderRadius: 12,
    background: "#111",
    borderLeft: "8px solid #2ecc71",
    textAlign: "center"
  },

  statusPaid: { color: "#2ecc71", fontWeight: 800 },
  statusUnpaid: { color: "#ffb86b", fontWeight: 800 },

  bottomRow: {
    display: "flex",
    gap: 12,
    marginTop: 40
  },
  btn: {
    flex: 1,
    padding: "14px",
    borderRadius: 8,
    border: "none",
    fontWeight: 800,
    cursor: "pointer"
  },
  backBtn: { background: "#222", color: "#ffd166" },
  refreshBtn: { background: "#ffd166", color: "#111" }
};

export default function TokenStatus() {
  const params = new URLSearchParams(window.location.search);
  const initialPhone =
    params.get("phone") || localStorage.getItem("myPhone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  const [activeOrder, setActiveOrder] = useState(null);
  const [completed, setCompleted] = useState(false);

  /* ---------------- CURRENT TOKEN LISTENER ---------------- */
  useEffect(() => {
    async function listenToken() {
      const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
      const session = sessionSnap.exists()
        ? sessionSnap.data().session_id
        : "Session 1";

      const tokenRef = doc(db, "tokens", "session_" + session);
      return onSnapshot(tokenRef, (snap) => {
        if (snap.exists()) setCurrent(snap.data().currentToken || 0);
      });
    }
    listenToken();
  }, []);

  /* ---------------- LOAD ORDER ---------------- */
  async function loadOrder() {
    if (!phone) return;
    setLoading(true);

    const sessionSnap = await getDoc(doc(db, "settings", "activeSession"));
    const session = sessionSnap.exists()
      ? sessionSnap.data().session_id
      : "Session 1";

    const q = query(
      collection(db, "orders"),
      where("phone", "==", String(phone)),
      where("session_id", "==", session),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!orders.length) {
      setActiveOrder(null);
      setCompleted(false);
      setLoading(false);
      return;
    }

    const completedOrders = orders.filter(o => o.status === "completed");
    if (completedOrders.length === orders.length) {
      setCompleted(true);
      setActiveOrder(null);
      setLoading(false);
      return;
    }

    const active = orders
      .filter(o => o.status !== "completed")
      .sort((a, b) => (a.token || 999) - (b.token || 999))[0];

    setActiveOrder(active);
    setCompleted(false);
    setLoading(false);
  }

  function handleFind() {
    localStorage.setItem("myPhone", phone);
    loadOrder();
  }

  const position =
    activeOrder && current && activeOrder.token
      ? activeOrder.token - current
      : null;

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
            onChange={(e) => setPhone(e.target.value)}
            style={styles.input}
          />
          <button style={styles.findBtn} onClick={handleFind}>
            Find Order
          </button>
        </div>

        {loading && <div style={{ textAlign: "center" }}>Loading…</div>}

        {/* WAITING FOR APPROVAL */}
        {activeOrder && activeOrder.status === "pending" && (
          <div style={styles.card}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>⏳ Waiting</div>
            <div style={{ marginTop: 10, color: "#bfb39a" }}>
              Your order is waiting for approval
            </div>

            <div style={{ marginTop: 10 }}>
              Payment:
              {" "}
              <span style={activeOrder.paid ? styles.statusPaid : styles.statusUnpaid}>
                {activeOrder.paid ? "PAID" : "UNPAID"}
              </span>
            </div>
          </div>
        )}

        {/* ACTIVE TOKEN */}
        {activeOrder && activeOrder.token && (
          <div style={styles.card}>
            <div style={{ fontSize: 64, fontWeight: 900 }}>
              TOKEN {activeOrder.token}
            </div>

            <div style={{ marginTop: 10, fontSize: 18 }}>
              Now Serving: <b>{current || "-"}</b>
            </div>

            {Number.isFinite(position) && (
              <div style={{ marginTop: 6, fontSize: 18 }}>
                Position: <b>{position}</b>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              Payment:
              {" "}
              <span style={activeOrder.paid ? styles.statusPaid : styles.statusUnpaid}>
                {activeOrder.paid ? "PAID" : "UNPAID"}
              </span>
            </div>
          </div>
        )}

        {/* COMPLETED */}
        {completed && (
          <div style={styles.completedCard}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#2ecc71" }}>
              ✅ Order Completed
            </div>
            <div style={{ marginTop: 10 }}>
              Please collect your order at the counter
            </div>
          </div>
        )}

        <div style={styles.bottomRow}>
          <Link href="/">
            <button style={{ ...styles.btn, ...styles.backBtn }}>
              Back to Menu
            </button>
          </Link>

          <button
            style={{ ...styles.btn, ...styles.refreshBtn }}
            onClick={loadOrder}
          >
            Refresh
          </button>
        </div>

        <Footer />
      </div>
    </div>
  );
}
