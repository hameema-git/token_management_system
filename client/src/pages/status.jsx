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

  // list styles (we'll render ticket-style cards)
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
  const [orderInfo, setOrderInfo] = useState(null); // most recent single order
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  // all orders and tokens
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

  // existing latest-order fetch (keeps original behaviour)
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
      else setOrderInfo({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (err) {
      console.error("fetchMyToken error:", err);
      setOrderInfo(null);
    } finally {
      setLoading(false);
    }
  }

  // Robust loader to get ALL orders for a phone (handles string/number and missing createdAt)
  async function loadAllOrdersForPhone(rawPhone) {
    if (!rawPhone) {
      setAllOrders([]);
      setTokensOnly([]);
      return;
    }

    setLoading(true);

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
        orderBy("createdAt", "asc")
      );
      const orders = await runQuery(q1);
      if (orders.length > 0) {
        finalizeOrders(orders);
        return;
      }
    } catch (err) {
      console.warn("orderBy(createdAt) failed for string phone, falling back:", err);
    }

    // attempt 2: numeric phone attempts
    const numeric = phoneTrim.replace(/\D/g, "");
    if (numeric) {
      try {
        const numVal = Number(numeric);

        try {
          const q2 = query(
            collection(db, "orders"),
            where("phone", "==", numVal),
            orderBy("createdAt", "desc")
          );
          const ordersNum = await runQuery(q2);
          if (ordersNum.length > 0) {
            finalizeOrders(ordersNum);
            return;
          }
        } catch (err) {
          console.warn("orderBy(createdAt) failed for numeric phone, falling back:", err);
        }

        // fallback numeric without ordering
        const q3 = query(collection(db, "orders"), where("phone", "==", numVal));
        const ordersNumPlain = await runQuery(q3);
        if (ordersNumPlain.length > 0) {
          finalizeOrders(sortByCreatedAtDesc(ordersNumPlain));
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
        finalizeOrders(sortByCreatedAtDesc(ordersPlain));
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

  // finalize orders: dedupe tokens, produce tokensOnly sorted ascending
  function finalizeOrders(ordersDescByCreatedAt) {
    // ordersDescByCreatedAt expected newest->oldest; keep full objects as-is
    setAllOrders(ordersDescByCreatedAt);

    // dedupe tokens preserving the order provided, but for tokensOnly we will sort ascending
    const uniqueTokensSet = new Set();
    for (const o of ordersDescByCreatedAt) {
      const t = o.token;
      if (t === undefined || t === null) continue;
      uniqueTokensSet.add(t);
    }
    // convert to array and sort ascending numerically when possible
    const uniqArray = Array.from(uniqueTokensSet);
    const sortedAsc = uniqArray.slice().sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!isFinite(na) || !isFinite(nb)) return String(a).localeCompare(String(b));
      return na - nb;
    });
    setTokensOnly(sortedAsc);
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

  // Subscribe to currentToken updates and refresh on phone/session change
  useEffect(() => {
    if (!session) return;

    fetchMyToken(phone, session);
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

  // Manual refresh
  async function handleRefresh() {
    const latestSession = await loadSessionFromFirestore();
    setSession(latestSession);
    fetchMyToken(phone, latestSession);
    loadAllOrdersForPhone(phone);
  }

  // When user clicks Find
  function handleFindClick() {
    localStorage.setItem("myPhone", phone);
    fetchMyToken(phone, session);
    loadAllOrdersForPhone(phone);
  }

  // helper to format timestamp
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

  // Render a ticket-like card for an order (same style as main)
  function OrderTicket({ order }) {
    return (
      <div style={styles.ticket}>
        <div style={styles.nowServing}>Session: {order.session_id ?? session ?? "—"}</div>

        <div style={styles.bigToken}>{order.token ?? "—"}</div>

        <div style={styles.amountBox}>
          Amount: ₹{Number(order.total ?? 0).toFixed(2)}
        </div>

        <div style={styles.smallMuted}>
          {order.createdAt ? formatTimestamp(order.createdAt) : ""}
        </div>

        <div style={styles.smallMuted}>
          {order.token ? `Position: ${Math.max(0, order.token - current)}` : ""}
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
          <div style={{ color: "#bfb39a", textAlign: "center" }}>Loading…</div>
        )}

        {session && !loading && (
          <>
            {/* Main (most-recent single order) */}
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

        {/* ALL TOKENS: show ONLY when > 1 token */}
        {tokensOnly.length > 1 && (
          <div style={styles.listContainer}>
            <div style={styles.smallHint}>All tokens for {phone || "—"}</div>

            <div style={styles.smallListWrap}>
              {/* tokensOnly is an array of token values sorted ascending.
                  For each token, find the first order doc that has that token (prefer newer one).
                  This keeps ticket details (amount, session, createdAt) meaningful. */}
              {tokensOnly.map((tk) => {
                // find the first matching order in allOrders (orders are newest->oldest)
                const match = allOrders.find((o) => String(o.token) === String(tk));
                // If no matching order doc found (shouldn't happen), create a minimal object
                const orderObj = match || { token: tk, total: 0, session_id: session };
                return <OrderTicket key={String(tk)} order={orderObj} />;
              })}
            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}

