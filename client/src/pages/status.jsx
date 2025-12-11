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
  refreshBtn: { background: "#ffd166", color: "#111", flex: 1 },
  listContainer: { marginTop: 18 },
  smallHint: { color: "#bfb39a", marginBottom: 8 },
  smallListWrap: {
    display: "grid",
    gap: 12,
    marginTop: 8
  }
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

  const [mainOrder, setMainOrder] = useState(null); // << NEW — this replaces orderInfo

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
    if (!rawPhone) {
      setAllOrders([]);
      setTokensOnly([]);
      setMainOrder(null);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("phone", "==", String(rawPhone))
    );

    const snap = await getDocs(q);
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (orders.length === 0) {
      setTokensOnly([]);
      setMainOrder(null);
      setLoading(false);
      return;
    }

    setAllOrders(orders);

    const uniqTokens = [...new Set(orders.map((o) => o.token))].sort(
      (a, b) => a - b
    );

    setTokensOnly(uniqTokens);

    findMainOrder(orders, uniqTokens);

    setLoading(false);
  }

  function findMainOrder(orders, uniqTokens) {
    const waiting = uniqTokens
      .map((tk) => ({
        token: tk,
        pos: tk - current
      }))
      .filter((x) => x.pos > 0)
      .sort((a, b) => a.pos - b.pos);

    if (waiting.length === 0) {
      setMainOrder(null);
      return;
    }

    const nextToken = waiting[0].token;
    const orderObj = orders.find((o) => o.token === nextToken);

    setMainOrder(orderObj || null);
  }

  useEffect(() => {
    if (!session) return;

    loadAllOrdersForPhone(phone);

    const tokenDoc = doc(db, "tokens", "session_" + session);
    return onSnapshot(tokenDoc, (snap) => {
      if (!snap.exists()) setCurrent(0);
      else setCurrent(snap.data().currentToken || 0);
    });
  }, [phone, session]);

  function formatTimestamp(ts) {
    try {
      if (!ts) return "";
      if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
      return String(ts);
    } catch {
      return "";
    }
  }

  function OrderTicket({ order }) {
    return (
      <div style={styles.ticket}>
        <div style={styles.nowServing}>Session: {order.session_id ?? session}</div>

        <div style={styles.bigToken}>{order.token}</div>

        <div style={styles.amountBox}>Amount: ₹{Number(order.total).toFixed(2)}</div>

        <div style={styles.smallMuted}>
          {order.createdAt ? formatTimestamp(order.createdAt) : ""}
        </div>

        <div style={styles.smallMuted}>
          Position: {Math.max(0, order.token - current)}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Waffle Lounge — Token Status</div>
            <div style={styles.subtitle}>Track your order quickly</div>
          </div>
          <div style={styles.smallMuted}>Session: {session}</div>
        </div>

        <div style={styles.inputRow}>
          <input
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={styles.input}
          />

          <button style={styles.findBtn} onClick={() => loadAllOrdersForPhone(phone)}>
            Find
          </button>
        </div>

        {loading && (
          <div style={{ color: "#bfb39a", textAlign: "center" }}>Loading…</div>
        )}

        {!loading && mainOrder && (
          <>
            <OrderTicket order={mainOrder} />

            <div style={styles.actionRow}>
              <Link href="/">
                <button style={{ ...styles.btn, ...styles.placeAnother }}>
                  Place Another Order
                </button>
              </Link>
            </div>
          </>
        )}

        {/* Remaining tokens list */}
        {tokensOnly.length > 1 && (
          <div style={styles.listContainer}>
            <div style={styles.smallHint}>Other tokens for {phone}</div>

            <div style={styles.smallListWrap}>
              {tokensOnly
                .filter((tk) => tk !== (mainOrder?.token || null))
                .map((tk) => {
                  const match = allOrders.find((o) => o.token === tk);
                  return <OrderTicket key={tk} order={match} />;
                })}
            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
