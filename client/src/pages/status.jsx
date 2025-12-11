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

  // List (simple, clean)
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
  bulletItem: { marginLeft: 12, color: "#ffd166", fontSize: 14 },

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

  async function loadSessionFromFirestore() {
    try {
      const ref = doc(db, "settings", "activeSession");
      const snap = await getDoc(ref);
      if (snap.exists()) return snap.data().session_id;
      return "Session 1";
    } catch {
      return "Session 1";
    }
  }

  useEffect(() => {
    loadSessionFromFirestore().then(setSession);
  }, []);

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
      setAllOrders([]);
      setTokensOnly([]);
      setMainOrder(null);
      setLoading(false);
      return;
    }

    // sort ascending by token
    const tokens = [...new Set(orders.map((o) => o.token))].sort((a, b) => a - b);

    setTokensOnly(tokens);
    setAllOrders(orders);

    // MAIN = smallest token
    const smallest = tokens[0];
    const m = orders.find((o) => o.token === smallest);
    setMainOrder(m);

    setLoading(false);
  }

  // listen for NOW SERVING
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

  async function handleRefresh() {
    loadAllOrdersForPhone(phone);
  }

  function renderItems(items) {
    if (!items || !items.length) return null;

    return (
      <div>
        <div style={{ fontSize: 14, marginBottom: 4 }}>Items:</div>
        {items.map((it, idx) => (
          <div key={idx} style={styles.bulletItem}>
            • {it.name} × {it.quantity}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HEADER SESSION */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Waffle Lounge — Token Status</div>
            <div style={styles.subtitle}>Track your order quickly</div>
          </div>
          <div style={styles.smallMuted}>Session: {session || "—"}</div>
        </div>

        {/* Search box */}
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
        {/* {mainOrder && !loading && (
          <div style={styles.ticket}>
            <div style={styles.nowServing}>NOW SERVING — #{current}</div>

            <div style={styles.bigToken}>{mainOrder.token}</div>

            <div style={styles.amountBox}>
              Amount: ₹{Number(mainOrder.total || 0).toFixed(2)}
            </div>

            <div style={styles.smallMuted}>
              Position: {Math.max(0, mainOrder.token - current)}
            </div>

            {renderItems(mainOrder.items)}
          </div>
        )} */}
        {mainOrder && !loading && (
  <div style={styles.ticket}>

    {/* TOKEN NUMBER FIRST (highlighted) */}
    <div style={{ 
      fontSize: 70,
      fontWeight: 900,
      color: "#ffd166",
      textAlign: "center",
      marginBottom: 10,
      letterSpacing: 2
    }}>
      #{mainOrder.token}
    </div>

    {/* AMOUNT */}
    <div style={{
      fontSize: 26,
      fontWeight: 800,
      color: "#ffd166",
      textAlign: "center",
      marginBottom: 10
    }}>
      Amount: ₹{Number(mainOrder.total || 0).toFixed(2)}
    </div>

    {/* NOW SERVING */}
    <div style={{
      fontSize: 24,
      fontWeight: 900,
      color: "#ffffff",
      textAlign: "center",
      marginBottom: 8
    }}>
      NOW SERVING — #{current}
    </div>

    {/* POSITION */}
    <div style={{
      color: "#bfb39a",
      textAlign: "center",
      fontSize: 16,
      marginBottom: 12
    }}>
      Position: {Math.max(0, mainOrder.token - current)}
    </div>

    {/* ITEMS ORDERED */}
    <div style={{ marginTop: 10 }}>
      {renderItems(mainOrder.items)}
    </div>

  </div>
)}


        {/* OTHER TOKENS LIST */}
        {/* {tokensOnly.length > 1 && (
          <div style={styles.listContainer}>
            <div style={styles.smallHint}>Your other tokens</div>

            {tokensOnly.slice(1).map((tk) => {
              const order = allOrders.find((o) => o.token === tk);
              if (!order) return null;

              return (
                <div key={tk} style={styles.listItem}>
                  <div style={styles.listLine}>Token {tk}
                  
                    Position: {Math.max(0, tk - current)}
                  </div>
                  <div style={styles.listLine}>
                    Amount: ₹{Number(order.total).toFixed(2)}
                  </div>

                  {renderItems(order.items)}
                </div>
              );
            })}
          </div>
        )} */}
{tokensOnly.length > 1 && (
  <div style={styles.listContainer}>
    <div style={styles.smallHint}>Your other tokens</div>

    {tokensOnly.slice(1).map((tk) => {
      const order = allOrders.find((o) => o.token === tk);
      if (!order) return null;

      return (
        <div key={tk} style={styles.listItem}>

          {/* TOKEN + POSITION (same line) */}
          <div style={{
            ...styles.listLine,
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700
          }}>
            <span>Token #{tk}</span>
            <span>Position: {Math.max(0, tk - current)}</span>
          </div>

          {/* ITEMS ORDERED */}
          <div style={{ marginTop: 6 }}>
            {renderItems(order.items)}
          </div>

          {/* AMOUNT */}
          <div style={{
            ...styles.listLine,
            marginTop: 6,
            fontWeight: 700,
            color: "#ffd166"
          }}>
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
        </div>

        <Footer />
      </div>
    </div>
  );
}
