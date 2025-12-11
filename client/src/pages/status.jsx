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
    fontSize: 60,
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
  refreshBtn: { background: "#ffd166", color: "#111", flex: 1 }
};

export default function TokenStatus() {
  const [, setLocation] = useLocation();

  const initialPhone =
    new URLSearchParams(window.location.search).get("phone") ||
    localStorage.getItem("myPhone") ||
    "";

  const [phone, setPhone] = useState(initialPhone);
  const [session, setSession] = useState(null);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  const [allOrders, setAllOrders] = useState([]);
  const [tokensOnly, setTokensOnly] = useState([]);

  // Load active session
  async function loadSessionFromFirestore() {
    try {
      const snap = await getDoc(doc(db, "settings", "activeSession"));
      return snap.exists() ? snap.data().session_id : "Session 1";
    } catch {
      return "Session 1";
    }
  }

  useEffect(() => {
    loadSessionFromFirestore().then(setSession);
  }, []);

  // Fetch latest single order for card fallback (not used now)
  async function fetchMyToken(p, sess = session) {
    if (!p || !sess) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, "orders"),
        where("phone", "==", String(p)),
        where("session_id", "==", sess),
        orderBy("createdAt", "asc"),
        limit(1)
      );
      await getDocs(q);
    } finally {
      setLoading(false);
    }
  }

  // LOAD ALL ORDERS FOR PHONE
  async function loadAllOrdersForPhone(p) {
    if (!p) return setTokensOnly([]), setAllOrders([]);

    setLoading(true);
    const list = [];

    // Try string match orders
    try {
      const q = query(
        collection(db, "orders"),
        where("phone", "==", String(p)),
        orderBy("createdAt", "asc")
      );
      const snap = await getDocs(q);
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    } catch {}

    // Try number match
    const numeric = p.replace(/\D/g, "");
    if (numeric) {
      try {
        const q = query(
          collection(db, "orders"),
          where("phone", "==", Number(numeric)),
          orderBy("createdAt", "asc")
        );
        const snap = await getDocs(q);
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      } catch {}
    }

    // dedupe by token
    const tokens = [...new Set(list.map((o) => o.token))].sort((a, b) => a - b);

    setAllOrders(list);
    setTokensOnly(tokens);
    setLoading(false);
  }

  // Subscribe to token updates
  useEffect(() => {
    if (!session) return;

    loadAllOrdersForPhone(phone);

    const unsub = onSnapshot(doc(db, "tokens", "session_" + session), (snap) => {
      setCurrent(snap.exists() ? snap.data().currentToken : 0);
    });

    return () => unsub();
  }, [phone, session]);

  function handleFindClick() {
    localStorage.setItem("myPhone", phone);
    loadAllOrdersForPhone(phone);
  }

  function handleRefresh() {
    loadAllOrdersForPhone(phone);
  }

  // Determine MAIN TOKEN
  const mainToken =
    tokensOnly.find((t) => Number(t) >= Number(current)) ||
    tokensOnly[0] ||
    null;

  const mainOrder =
    allOrders.find((o) => String(o.token) === String(mainToken)) || null;

  const remainingTokens = tokensOnly.filter((t) => t !== mainToken);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Waffle Lounge — Token Status</div>
            <div style={styles.subtitle}>Track your order quickly</div>
          </div>
          <div style={styles.smallMuted}>Session: {session || "—"}</div>
        </div>

        {/* INPUT */}
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

        {loading && (
          <div style={{ color: "#bfb39a", textAlign: "center" }}>Loading…</div>
        )}

        {/* MAIN CARD */}
        {mainToken && !loading && (
          <>
            <div style={styles.ticket}>
              <div style={styles.nowServing}>NOW SERVING — #{current}</div>

              <div style={styles.bigToken}>{mainToken}</div>

              <div style={styles.amountBox}>
                Amount: ₹{mainOrder ? Number(mainOrder.total).toFixed(2) : "0.00"}
              </div>

              <div style={styles.smallMuted}>
                Position: {Math.max(0, mainToken - current)}
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

        {/* REMAINING TOKENS LIST */}
        {remainingTokens.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ color: "#bfb39a", marginBottom: 10 }}>
              Other tokens for {phone}:
            </div>

            {remainingTokens.map((tk) => {
              const ord = allOrders.find((o) => String(o.token) === String(tk));
              const amount = ord ? Number(ord.total).toFixed(2) : "0.00";
              const pos = Math.max(0, tk - current);

              return (
                <div
                  key={tk}
                  style={{
                    padding: "10px 12px",
                    background: "#111",
                    borderRadius: 8,
                    marginBottom: 8,
                    border: "1px solid rgba(255,209,102,0.1)",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 16
                  }}
                >
                  <span># {tk}</span>
                  <span>₹{amount}</span>
                  <span>Pos: {pos}</span>
                </div>
              );
            })}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
