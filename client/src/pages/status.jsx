// client/src/pages/status.jsx

import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import {
  query,
  collection,
  where,
  orderBy,
  limit,
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
  nowServing: {
    fontSize: 26,
    fontWeight: 900,
    color: "#ffffff",
    textAlign: "center"
  },
  bigToken: {
    fontSize: 64,
    fontWeight: 900,
    color: "#ffd166",
    textAlign: "center",
    letterSpacing: 2
  },
  amountBox: {
    fontSize: 24,
    fontWeight: 900,
    color: "#ffd166",
    textAlign: "center",
    marginTop: 6
  },
  smallMuted: { color: "#bfb39a", textAlign: "center", fontSize: 14 },
  actionRow: { display: "flex", gap: 10, marginTop: 18 },
  btn: {
    padding: "12px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 800
  },
  placeAnother: { background: "#222", color: "#ffd166", flex: 1 },
  refreshBtn: { background: "#ffd166", color: "#111", flex: 1 },

  // styles for list
  listContainer: { marginTop: 18 },
  listItem: {
    padding: 12,
    borderRadius: 10,
    background: "#0d0d0d",
    border: "1px solid rgba(255,209,102,0.03)",
    marginBottom: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  tokenBadge: {
    fontSize: 22,
    fontWeight: 900,
    color: "#ffd166",
    minWidth: 80,
    textAlign: "center"
  },
  meta: { color: "#bfb39a", fontSize: 13, textAlign: "right" }
};

export default function TokenStatus() {
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const initialPhone =
    params.get("phone") || localStorage.getItem("myPhone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [session, setSession] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  // New: store all orders for the phone
  const [allOrders, setAllOrders] = useState([]);

  // Load active session
  async function loadSessionFromFirestore() {
    try {
      const ref = doc(db, "settings", "activeSession");
      const snap = await getDoc(ref);
      if (snap.exists()) return snap.data().session_id;
      return "Session 1";
    } catch (err) {
      console.error("Failed to load session:", err);
      return "Session 1";
    }
  }

  useEffect(() => {
    let mounted = true;
    loadSessionFromFirestore().then((sess) => {
      if (mounted) setSession(sess);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch the most recent order by phone + session (existing behavior)
  async function fetchMyToken(p, sess = session) {
    if (!p || !sess) {
      setOrderInfo(null);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("phone", "==", String(p)),
        where("session_id", "==", sess),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const snap = await getDocs(q);

      if (snap.empty) setOrderInfo(null);
      else
        setOrderInfo({
          id: snap.docs[0].id,
          ...snap.docs[0].data()
        });
    } catch (err) {
      console.error("fetchMyToken error:", err);
      setOrderInfo(null);
    } finally {
      setLoading(false);
    }
  }

  // New: fetch all orders for a phone across all sessions (desc by createdAt)
  async function fetchAllOrdersByPhone(p) {
    if (!p) {
      setAllOrders([]);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("phone", "==", String(p)),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllOrders(orders);
    } catch (err) {
      console.error("fetchAllOrdersByPhone error:", err);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }

  // Subscribe to currentToken updates and refresh order/allOrders when session changes
  useEffect(() => {
    if (!session) return;

    // fetch the latest single order for the session
    fetchMyToken(phone, session);

    // fetch all orders for the phone (across sessions)
    fetchAllOrdersByPhone(phone);

    const tokenDoc = doc(db, "tokens", "session_" + session);

    const unsub = onSnapshot(
      tokenDoc,
      (snap) => {
        if (!snap.exists()) setCurrent(0);
        else setCurrent(snap.data().currentToken || 0);
      },
      (err) => console.error("tokens onSnapshot error:", err)
    );

    return () => unsub();
    // we intentionally want to re-run when phone or session changes
  }, [phone, session]);

  // Manual refresh: reload session, single order and all orders
  async function handleRefresh() {
    const latestSession = await loadSessionFromFirestore();
    setSession(latestSession);
    fetchMyToken(phone, latestSession);
    fetchAllOrdersByPhone(phone);
  }

  // When user clicks Find: save phone and fetch
  function handleFindClick() {
    localStorage.setItem("myPhone", phone);
    fetchMyToken(phone, session);
    fetchAllOrdersByPhone(phone);
  }

  // helper to format Firestore timestamp safely
  function formatTimestamp(ts) {
    try {
      if (!ts) return "";
      // if it's Firestore Timestamp object
      if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
      // if it's already a Date
      if (ts instanceof Date) return ts.toLocaleString();
      // otherwise return as string
      return String(ts);
    } catch {
      return "";
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Waffle Lounge — Token Status</div>
            <div style={styles.subtitle}>Track your order quickly</div>
          </div>
          <div style={styles.smallMuted}>Session: {session || "—"}</div>
        </div>

        <div style={styles.inputRow}>
          <input
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={styles.input}
          />

          <button style={styles.findBtn} onClick={handleFindClick}>
            Find
          </button>
        </div>

        {(!session || loading) && (
          <div style={{ color: "#bfb39a", textAlign: "center" }}>
            Loading…
          </div>
        )}

        {session && !loading && (
          <>
            <div style={styles.ticket}>
              <div style={styles.nowServing}>NOW SERVING — #{current}</div>

              <div style={styles.bigToken}>
                {orderInfo ? orderInfo.token ?? "WAITING" : "-"}
              </div>

              <div style={styles.amountBox}>
                Amount: ₹
                {orderInfo ? Number(orderInfo.total ?? 0).toFixed(2) : "0.00"}
              </div>

              <div style={styles.smallMuted}>
                {orderInfo && orderInfo.token
                  ? `Position: ${Math.max(0, orderInfo.token - current)}`
                  : ""}
              </div>
            </div>

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
          </>
        )}

        {/* ALL ORDERS LIST */}
        <div style={styles.listContainer}>
          <div style={{ color: "#bfb39a", marginBottom: 8 }}>
            All tokens for {phone || "—"}
          </div>

          {allOrders.length === 0 && (
            <div style={{ color: "#777" }}>No orders found.</div>
          )}

          {allOrders.map((o) => (
            <div key={o.id} style={styles.listItem}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={styles.tokenBadge}>{o.token ?? "—"}</div>
                <div>
                  <div style={{ fontWeight: 800, color: "#fff" }}>
                    {o.session_id ?? "Session —"}
                  </div>
                  <div style={{ color: "#bfb39a", fontSize: 13 }}>
                    Amount: ₹{Number(o.total ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div style={styles.meta}>
                <div>{formatTimestamp(o.createdAt)}</div>
                <div style={{ marginTop: 6 }}>
                  {o.token && typeof current === "number"
                    ? `Position: ${Math.max(0, o.token - current)}`
                    : ""}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}

