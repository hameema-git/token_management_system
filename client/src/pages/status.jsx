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
import { Link, useLocation } from "wouter";
import Footer from "../components/Footer";

const styles = {
  page: {
    background: "#0b0b0b",
    color: "#f6e8c1",
    minHeight: "100vh",
    padding: 20,
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif"
  },
  container: { maxWidth: 720, margin: "auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18
  },
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
    color: "#fff",
    fontSize: 15
  },
  findBtn: {
    marginTop: 8,
    padding: "10px 14px",
    background: "#ffd166",
    color: "#111",
    border: "none",
    borderRadius: 8,
    fontWeight: 800,
    cursor: "pointer"
  },

  ticket: {
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    background: "#111",
    borderLeft: "8px solid #ffd166",
    display: "grid",
    gap: 14
  },

  completedCard: {
    marginTop: 20,
    padding: 22,
    borderRadius: 12,
    background: "#111",
    borderLeft: "8px solid #2ecc71",
    textAlign: "center"
  },

  listContainer: { marginTop: 28 },
  listItem: {
    background: "#111",
    padding: "12px 14px",
    borderRadius: 8,
    borderLeft: "4px solid #444",
    marginBottom: 10
  },

  actionRowBottom: {
    display: "flex",
    gap: 12,
    marginTop: 40
  },
  btn: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 16
  },
  placeAnother: { background: "#222", color: "#ffd166" },
  refreshBtn: { background: "#ffd166", color: "#111" }
};

export default function TokenStatus() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);

  const initialPhone =
    params.get("phone") || localStorage.getItem("myPhone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [session, setSession] = useState(null);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);

  /* ---------------- Load active session ---------------- */
  async function loadSession() {
    const ref = doc(db, "settings", "activeSession");
    const snap = await getDoc(ref);
    setSession(snap.exists() ? snap.data().session_id : "Session 1");
  }

  useEffect(() => {
    loadSession();
  }, []);

  /* ---------------- Listen current token ---------------- */
  useEffect(() => {
    if (!session) return;
    const tokenRef = doc(db, "tokens", "session_" + session);
    return onSnapshot(tokenRef, (snap) => {
      if (snap.exists()) setCurrent(snap.data().currentToken || 0);
    });
  }, [session]);

  /* ---------------- Load Orders ---------------- */
  async function loadOrders() {
    if (!phone || !session) return;

    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("phone", "==", String(phone)),
      where("session_id", "==", session),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setActiveOrders(all.filter(o => o.status !== "completed"));
    setCompletedOrders(all.filter(o => o.status === "completed"));

    setLoading(false);
  }

  function handleFind() {
    localStorage.setItem("myPhone", phone);
    loadOrders();
  }

  function handleRefresh() {
    loadOrders();
  }

  const mainOrder =
    activeOrders.length > 0
      ? activeOrders.sort((a, b) => a.token - b.token)[0]
      : null;

  /* ---------------- RENDER ---------------- */
  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Waffle Lounge — Token Status</div>
            <div style={styles.subtitle}>Track your order</div>
          </div>
          <div style={styles.subtitle}>Session: {session || "-"}</div>
        </div>

        {/* Search */}
        <div style={styles.inputRow}>
          <input
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={styles.input}
          />
          <button style={styles.findBtn} onClick={handleFind}>
            Find
          </button>
        </div>

        {/* LOADING */}
        {loading && <div style={{ textAlign: "center" }}>Loading…</div>}

        {/* ACTIVE TOKEN CARD */}
        {mainOrder && (
          <div style={styles.ticket}>
            <div style={{ fontSize: 64, fontWeight: 900, textAlign: "center" }}>
              TOKEN {mainOrder.token}
            </div>

            <div style={{ fontSize: 22, fontWeight: 800, textAlign: "center" }}>
              Amount: ₹{Number(mainOrder.total).toFixed(2)}
            </div>

            <div style={{ fontSize: 22, fontWeight: 900, textAlign: "center" }}>
              NOW SERVING — {current || "-"}
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, textAlign: "center" }}>
              Position: {mainOrder.token - current}
            </div>
          </div>
        )}

        {/* COMPLETED STATE */}
        {!mainOrder && completedOrders.length > 0 && (
          <div style={styles.completedCard}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#2ecc71" }}>
              ✅ Order Completed
            </div>

            <div style={{ marginTop: 10, fontSize: 18 }}>
              Please collect your order at the counter
            </div>

            <div style={{ marginTop: 12, color: "#bfb39a" }}>
              Thank you for visiting Waffle Lounge 🍰
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div style={styles.actionRowBottom}>
          <Link href="/">
            <button style={{ ...styles.btn, ...styles.placeAnother }}>
              Back To Menu
            </button>
          </Link>

          <button
            style={{ ...styles.btn, ...styles.refreshBtn }}
            onClick={handleRefresh}
          >
            Refresh
          </button>
        </div>

        <Footer />
      </div>
    </div>
  );
}
