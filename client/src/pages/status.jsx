// client/src/pages/status.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  query, collection, where, getDocs,
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
  title: { fontSize: 22, fontWeight: 900, color: "#ffd166" },
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
    marginTop: 8, padding: "10px 14px",
    background: "#ffd166", color: "#111",
    border: "none", borderRadius: 8, fontWeight: 800,
    cursor: "pointer"
  },

  ticket: {
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    background: "#111",
    borderLeft: "8px solid #ffd166",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 14
  },

  nowServing: { fontSize: 26, fontWeight: 900, color: "#ffffff", textAlign: "center" },
  bigToken: { fontSize: 64, fontWeight: 900, color: "#ffd166", textAlign: "center", letterSpacing: 2 },
  amountBox: { fontSize: 24, fontWeight: 900, color: "#ffd166", textAlign: "center", marginTop: 6 },
  smallMuted: { color: "#bfb39a", textAlign: "center", fontSize: 14 },

  actionRow: { display: "flex", gap: 10, marginTop: 18 },
  btn: { padding: "12px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 800 },
  placeAnother: { background: "#222", color: "#ffd166", flex: 1 },
  refreshBtn: { background: "#ffd166", color: "#111", flex: 1 }
};

export default function TokenStatus() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialPhone = params.get("phone") || localStorage.getItem("myPhone") || "";
  const [phone, setPhone] = useState(initialPhone);

  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);   // store ALL approved orders
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  // load session
  async function loadSessionFromFirestore() {
    try {
      const ref = doc(db, "settings", "activeSession");
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data().session_id : "Session 1";
    } catch {
      return "Session 1";
    }
  }

  // initial load
  useEffect(() => {
    loadSessionFromFirestore().then(setSession);
  }, []);

  // fetch all approved orders for phone
  async function fetchAllOrders(p, sess = session) {
    if (!p || !sess) return setOrders([]);

    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("phone", "==", String(p)),
        where("session_id", "==", sess)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setOrders([]);
      } else {
        let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // ONLY approved
        list = list.filter(o => o.status === "Approved");

        // SORT by token ascending
        list.sort((a, b) => (a.token ?? 9999) - (b.token ?? 9999));

        setOrders(list);
      }
    } catch (err) {
      console.error("Error fetching all orders:", err);
      setOrders([]);
    }

    setLoading(false);
  }

  // subscribe for now serving
  useEffect(() => {
    if (!session) return;

    fetchAllOrders(phone, session);

    const tokenDoc = doc(db, "tokens", "session_" + session);
    const unsub = onSnapshot(tokenDoc, snap => {
      setCurrent(snap.exists() ? snap.data().currentToken : 0);
    });

    return () => unsub();
  }, [phone, session]);

  // Refresh button
  async function handleRefresh() {
    const latestSession = await loadSessionFromFirestore();
    setSession(latestSession);
    fetchAllOrders(phone, latestSession);
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Waffle Lounge — Token Status</div>
            <div style={styles.subtitle}>Track your orders</div>
          </div>
          <div style={styles.smallMuted}>Session: {session || "—"}</div>
        </div>

        {/* Input */}
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
              fetchAllOrders(phone, session);
            }}
          >
            Find
          </button>
        </div>

        {/* Loading */}
        {loading && <div style={{ color: "#bfb39a", textAlign: "center" }}>Loading…</div>}

        {/* No orders */}
        {(!loading && orders.length === 0) && (
          <div style={{ color: "#bfb39a", textAlign: "center", marginTop: 20 }}>
            No Approved Orders Found
          </div>
        )}

        {/* Multiple Orders List */}
        {orders.map(order => (
          <div key={order.id} style={styles.ticket}>
            <div style={styles.nowServing}>NOW SERVING — #{current}</div>

            <div style={styles.bigToken}>{order.token}</div>

            <div style={styles.amountBox}>Amount: ₹{Number(order.total ?? 0).toFixed(2)}</div>

            <div style={styles.smallMuted}>
              Position: {Math.max(0, order.token - current)}
            </div>
          </div>
        ))}

        {/* Buttons */}
        {orders.length > 0 && (
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
        )}

        <Footer />
      </div>
    </div>
  );
}
