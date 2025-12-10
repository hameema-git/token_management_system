// client/src/pages/status.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  query, collection, where, orderBy, getDocs,
  doc, getDoc, onSnapshot
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { fontSize: 24, fontWeight: 900, color: "#ffd166" },
  subtitle: { color: "#bfb39a", fontSize: 13 },

  inputRow: {
    background: "#111",
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
    border: "1px solid rgba(255,209,102,0.05)"
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #222",
    background: "#0c0c0c",
    color: "#fff",
    boxSizing: "border-box",
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

  bigPanel: {
    background: "#111",
    padding: 20,
    borderRadius: 12,
    marginTop: 12,
    borderLeft: "8px solid #ffd166"
  },

  nowServing: {
    fontSize: 28,
    fontWeight: 900,
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 10
  },

  listItem: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    background: "#1a1a1a",
    border: "1px solid rgba(255,209,102,0.2)"
  },
  listItemNext: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    background: "#332500",
    border: "2px solid #ffd166",
    boxShadow: "0 0 12px rgba(255,209,102,0.5)"
  },

  token: { fontSize: 32, fontWeight: 900, color: "#ffd166" },
  amount: { fontSize: 20, fontWeight: 800, marginTop: 4, color: "#ffd166" },
  smallText: { color: "#bfb39a", marginTop: 4 },

  actionRow: { display: "flex", gap: 10, marginTop: 18 },
  btn: { padding: "12px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 800, flex: 1 },
  placeAnother: { background: "#222", color: "#ffd166" },
  refreshBtn: { background: "#ffd166", color: "#111" }
};

export default function TokenStatus() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);

  const initialPhone = params.get("phone") || localStorage.getItem("myPhone") || "";
  const [phone, setPhone] = useState(initialPhone);

  const [session, setSession] = useState(null);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load active session
  async function loadSessionFromFirestore() {
    try {
      const ref = doc(db, "settings", "activeSession");
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data().session_id : "Session 1";
    } catch (err) {
      console.error("Failed to load session:", err);
      return "Session 1";
    }
  }

  useEffect(() => {
    loadSessionFromFirestore().then(setSession);
  }, []);

  // Fetch all approved orders
  async function fetchApprovedOrders(p, sess) {
    if (!p || !sess) return setApprovedOrders([]);

    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("phone", "==", p),
        where("session_id", "==", sess),
        where("status", "==", "approved"),
        orderBy("token", "asc")
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setApprovedOrders(list);
    } catch (err) {
      console.error("fetchApprovedOrders error:", err);
      setApprovedOrders([]);
    }
    setLoading(false);
  }

  // Subscribe to NOW SERVING updates
  useEffect(() => {
    if (!session) return;

    const tokenDoc = doc(db, "tokens", "session_" + session);
    const unsub = onSnapshot(tokenDoc, snap => {
      setCurrent(snap.exists() ? snap.data().currentToken || 0 : 0);
    });

    return () => unsub();
  }, [session]);

  // Refresh token list when phone/session changes
  useEffect(() => {
    if (session) fetchApprovedOrders(phone, session);
  }, [phone, session]);

  // Refresh button handler
  async function handleRefresh() {
    const latestSession = await loadSessionFromFirestore();
    setSession(latestSession);
    fetchApprovedOrders(phone, latestSession);
  }

  // Determine next upcoming token
  const nextTokenObj =
    approvedOrders.find(o => o.token > current) || null;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Waffle Lounge — Token Status</div>
            <div style={styles.subtitle}>Track your approved orders</div>
          </div>
          <div style={styles.subtitle}>Session: {session || "—"}</div>
        </div>

        {/* Search */}
        <div style={styles.inputRow}>
          <input
            placeholder="Enter phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={styles.input}
          />
          <button
            style={styles.findBtn}
            onClick={() => {
              localStorage.setItem("myPhone", phone);
              fetchApprovedOrders(phone, session);
            }}
          >
            Find
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div style={{ color: "#bfb39a", textAlign: "center" }}>Loading…</div>
        )}

        {/* NOW SERVING */}
        <div style={styles.bigPanel}>
          <div style={styles.nowServing}>NOW SERVING — #{current}</div>

          {/* IF NO RECORDS */}
          {!loading && approvedOrders.length === 0 && (
            <div style={{ textAlign: "center", color: "#bfb39a", marginTop: 10 }}>
              No approved orders found.
            </div>
          )}

          {/* ORDERS LIST */}
          {approvedOrders.map(order => {
            const isNext = nextTokenObj && order.token === nextTokenObj.token;
            return (
              <div
                key={order.id}
                style={isNext ? styles.listItemNext : styles.listItem}
              >
                <div style={styles.token}>Token #{order.token}</div>
                <div style={styles.amount}>Amount: ₹{Number(order.total).toFixed(2)}</div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div style={styles.actionRow}>
          <Link href="/">
            <button style={{ ...styles.btn, ...styles.placeAnother }}>
              Place Another Order
            </button>
          </Link>

          <button
            onClick={handleRefresh}
            style={{ ...styles.btn, ...styles.refreshBtn }}
          >
            Refresh
          </button>
        </div>

        <Footer />
      </div>
    </div>
  );
}

