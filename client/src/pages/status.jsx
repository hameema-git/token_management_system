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

  // list styles
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

  // new states to store all orders and the tokens-only array
  const [allOrders, setAllOrders] = useState([]);
  const [tokensOnly, setTokensOnly] = useState([]);

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

  // The existing single latest-order fetch (keeps your original behaviour)
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

  /**
   * Robust loader that gets ALL orders for a phone:
   * - tries phone as string with orderBy(createdAt)
   * - if that fails (createdAt missing), falls back to no-order query and sorts locally
   * - also tries numeric phone if stored as number
   */
  async function loadAllOrdersForPhone(rawPhone) {
    if (!rawPhone) {
      setAllOrders([]);
      setTokensOnly([]);
      return;
    }

    setLoading(true);

    // helper to run a query and map docs
    async function runQuery(q) {
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    const phoneTrim = String(rawPhone).trim();

    // attempt 1: string with createdAt ordering
    try {
      const q1 = query(
        collection(db, "orders"),
        where("phone", "==", phoneTrim),
        orderBy("createdAt", "desc")
      );
      let orders = await runQuery(q1);
      if (orders.length > 0) {
        setAllOrders(orders);
        setTokensOnly(dedupeTokensPreserveOrder(orders));
        setLoading(false);
        return;
      }
    } catch (err) {
      // likely some docs missing createdAt or orderBy caused error — continue to fallback
      console.warn("orderBy(createdAt) failed for string phone, falling back:", err);
    }

    // attempt 2: numeric phone (if digits exist)
    const numeric = phoneTrim.replace(/\D/g, "");
    if (numeric) {
      try {
        const numVal = Number(numeric);
        // try with orderBy(createdAt)
        try {
          const q2 = query(
            collection(db, "orders"),
            where("phone", "==", numVal),
            orderBy("createdAt", "desc")
          );
          const ordersNum = await runQuery(q2);
          if (ordersNum.length > 0) {
            setAllOrders(ordersNum);
            setTokensOnly(dedupeTokensPreserveOrder(ordersNum));
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn("orderBy(createdAt) failed for numeric phone, falling back:", err);
        }

        // fallback: numeric without orderBy
        const q3 = query(collection(db, "orders"), where("phone", "==", numVal));
        const ordersNumPlain = await runQuery(q3);
        if (ordersNumPlain.length > 0) {
          const sorted = sortByCreatedAtDesc(ordersNumPlain);
          setAllOrders(sorted);
          setTokensOnly(dedupeTokensPreserveOrder(sorted));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("numeric parse error", err);
      }
    }

    // final fallback: string without orderBy
    try {
      const q4 = query(collection(db, "orders"), where("phone", "==", phoneTrim));
      const ordersPlain = await runQuery(q4);
      if (ordersPlain.length > 0) {
        const sorted = sortByCreatedAtDesc(ordersPlain);
        setAllOrders(sorted);
        setTokensOnly(dedupeTokensPreserveOrder(sorted));
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("final fallback error", err);
    }

    // nothing found
    setAllOrders([]);
    setTokensOnly([]);
    setLoading(false);
  }

  // helper: sort locally by createdAt desc (safe if createdAt missing)
  function sortByCreatedAtDesc(arr) {
    return arr.slice().sort((a, b) => {
      const ta =
        a.createdAt && typeof a.createdAt.toDate === "function"
          ? a.createdAt.toDate().getTime()
          : 0;
      const tb =
        b.createdAt && typeof b.createdAt.toDate === "function"
          ? b.createdAt.toDate().getTime()
          : 0;
      return tb - ta;
    });
  }

  // helper: dedupe tokens while preserving doc order
  function dedupeTokensPreserveOrder(orders) {
    const seen = new Set();
    const tokens = [];
    for (const o of orders) {
      const t = o.token ?? null;
      if (t === null || t === undefined) continue;
      if (!seen.has(t)) {
        seen.add(t);
        tokens.push(t);
      }
    }
    return tokens;
  }

  // Subscribe to currentToken updates and refresh order/allOrders when session changes or phone changes
  useEffect(() => {
    if (!session) return;

    // latest single order (existing)
    fetchMyToken(phone, session);

    // full orders list
    loadAllOrdersForPhone(phone);

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
  }, [phone, session]);

  // Manual refresh: reload session, single order and all orders
  async function handleRefresh() {
    const latestSession = await loadSessionFromFirestore();
    setSession(latestSession);
    fetchMyToken(phone, latestSession);
    loadAllOrdersForPhone(phone);
  }

  // When user clicks Find: save phone and fetch
  function handleFindClick() {
    localStorage.setItem("myPhone", phone);
    fetchMyToken(phone, session);
    loadAllOrdersForPhone(phone);
  }

  // helper to format Firestore timestamp safely
  function formatTimestamp(ts) {
    try {
      if (!ts) return "";
      if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
      if (ts instanceof Date) return ts.toLocaleString();
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

