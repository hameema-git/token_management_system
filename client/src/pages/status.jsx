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
    gap: 14
  },

  listContainer: { marginTop: 28 },
  smallHint: { color: "#bfb39a", marginBottom: 8, fontSize: 15 },
  listItem: {
    background: "#111",
    padding: "12px 14px",
    borderRadius: 8,
    borderLeft: "4px solid #444",
    marginBottom: 10
  },
  listLine: { fontSize: 16, marginBottom: 4 },

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

  const [allOrders, setAllOrders] = useState([]);
  const [tokensOnly, setTokensOnly] = useState([]);
  const [mainOrder, setMainOrder] = useState(null);

  // HELP POPUP
  const [showHelp, setShowHelp] = useState(false);

  // Load active session
  async function loadSessionFromFirestore() {
    try {
      const ref = doc(db, "settings", "activeSession");
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data().session_id : "Session 1";
    } catch {
      return "Session 1";
    }
  }

  useEffect(() => {
    loadSessionFromFirestore().then(setSession);
  }, []);

  // Load orders
  async function loadAllOrdersForPhone(rawPhone) {
    if (!rawPhone || !session) return;

    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("phone", "==", String(rawPhone)),
      where("session_id", "==", session),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!orders.length) {
      setTokensOnly([]);
      setMainOrder(null);
      setAllOrders([]);
      setLoading(false);
      return;
    }

    const tokens = [...new Set(orders.map((o) => o.token))].sort((a, b) => a - b);

    setTokensOnly(tokens);
    setAllOrders(orders);

    // Main order = smallest token
    setMainOrder(orders.find((o) => o.token === tokens[0]));

    setLoading(false);
  }

  // Listen for current token change
  useEffect(() => {
    if (!session) return;
    const tokenDoc = doc(db, "tokens", "session_" + session);

    return onSnapshot(tokenDoc, (snap) => {
      if (snap.exists()) setCurrent(snap.data().currentToken || 0);
    });
  }, [session]);

  function handleFindClick() {
    localStorage.setItem("myPhone", phone);
    loadAllOrdersForPhone(phone);
  }

  function handleRefresh() {
    loadAllOrdersForPhone(phone);
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Waffle Lounge — Token Status</div>
            <div style={styles.subtitle}>Track your order quickly</div>
          </div>

          <div style={styles.smallMuted}>Session: {session || "—"}</div>
        </div>

        {/* Search */}
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
        {mainOrder && !loading && (
          <div style={styles.ticket}>
            <div
              style={{
                fontSize: 70,
                fontWeight: 900,
                color: "#ffd166",
                textAlign: "center",
                marginBottom: 10
              }}
            >
              TOKEN {mainOrder.token}
            </div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#ffd166",
                textAlign: "center"
              }}
            >
              Amount: ₹{Number(mainOrder.total).toFixed(2)}
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#fff",
                textAlign: "center"
              }}
            >
              NOW SERVING — {current}
            </div>

            <div
              style={{
                color: "#ffd166",
                textAlign: "center",
                fontSize: 22,
                fontWeight: 800
              }}
            >
              Position: {mainOrder.token - current}
            </div>
          </div>
        )}

        {/* OTHER TOKENS */}
        {tokensOnly.length > 1 && (
          <div style={styles.listContainer}>
            <div style={styles.smallHint}>Your other tokens</div>

            {tokensOnly.slice(1).map((tk) => {
              const order = allOrders.find((o) => o.token === tk);
              if (!order) return null;

              return (
                <div key={tk} style={styles.listItem}>
                  <div
                    style={{
                      ...styles.listLine,
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700
                    }}
                  >
                    <span>Token {tk}</span>
                    <span>Position: {tk - current}</span>
                  </div>

                  <div
                    style={{
                      ...styles.listLine,
                      marginTop: 6,
                      fontWeight: 700,
                      color: "#ffd166"
                    }}
                  >
                    Amount: ₹{Number(order.total).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM BUTTONS */}
        <div style={styles.actionRowBottom}>
          <Link href="/">
            <button style={{ ...styles.btn, ...styles.placeAnother }}>
              Place Another Order
            </button>
          </Link>

          <button
            style={{ ...styles.btn, ...styles.refreshBtn }}
            onClick={handleRefresh}
          >
            Refresh
          </button>

          {/* HELP BUTTON */}
          <button
            style={{
              ...styles.btn,
              background: "#333",
              color: "#ffd166"
            }}
            onClick={() => setShowHelp(true)}
          >
            Rules
          </button>
        </div>

        <Footer />
      </div>

      {/* HELP POPUP */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999
          }}
        >
          <div
            style={{
              background: "#111",
              padding: 20,
              borderRadius: 10,
              width: "90%",
              maxWidth: 400,
              border: "2px solid #ffd166"
            }}
          >
            <h3 style={{ color: "#ffd166" }}>Token Rules</h3>

            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              • <b>Token</b> — Your order number<br />
              • <b>Now Serving</b> — Token staff is preparing<br />
              • <b>Position</b> — Tokens before you<br />
              • <b>Negative Position</b> — You were called but missed<br />
              • (-2 served before -1)<br />
              • Passed tokens are served only after the current customer
            </div>

            <button
              onClick={() => setShowHelp(false)}
              style={{
                marginTop: 15,
                width: "100%",
                padding: "10px 12px",
                background: "#ffd166",
                color: "#111",
                borderRadius: 8,
                border: "none",
                fontWeight: 800
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
