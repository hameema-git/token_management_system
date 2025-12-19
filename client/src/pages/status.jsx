import { useEffect, useState } from "react";
import {
  doc,
  collection,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   QUEUE POSITION LOGIC
   ========================= */
function calculatePosition(allTokens, myToken) {
  if (!myToken) return null;

  if (myToken.status === "completed") return null;
  if (myToken.status === "skipped") return null;

  return allTokens.filter(
    t =>
      ["waiting", "called", "serving"].includes(t.status) &&
      t.queueOrder < myToken.queueOrder
  ).length;
}

/* =========================
   STATUS PAGE
   ========================= */
export default function Status({ tokenId }) {
  const [shop, setShop] = useState(null);
  const [token, setToken] = useState(null);
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    const unsubShop = onSnapshot(
      doc(db, "settings", "shop"),
      snap => setShop(snap.data())
    );

    const unsubToken = onSnapshot(
      doc(db, "tokens", tokenId),
      snap => setToken({ id: snap.id, ...snap.data() })
    );

    const unsubTokens = onSnapshot(
      collection(db, "tokens"),
      snap =>
        setTokens(
          snap.docs.map(d => ({ id: d.id, ...d.data() }))
        )
    );

    return () => {
      unsubShop();
      unsubToken();
      unsubTokens();
    };
  }, [tokenId]);

  if (!shop || !token) return null;

  const position = calculatePosition(tokens, token);
  const isImmediate =
    token.status === "called" || token.status === "serving";

  return (
    <div className={`status-screen ${isImmediate ? "urgent" : ""}`}>
      {/* SHOP HEADER */}
      <header className="shop-header">
        <img
          src={shop.logoUrl}
          alt="Shop Logo"
          className="logo"
        />
        <h1>{shop.name}</h1>
      </header>

      {/* TOKEN NUMBER */}
      <div className="token-box">
        <p className="label">Your Token</p>
        <h2>{token.tokenNumber}</h2>
      </div>

      {/* SKIPPED MESSAGE */}
      {token.status === "skipped" && (
        <p className="warning">
          Your token was skipped.
          <br />
          Please go to the counter and wait for staff.
        </p>
      )}

      {/* POSITION */}
      {position !== null && (
        <p className="position">
          {position === 0
            ? "You are next"
            : `People before you: ${position}`}
        </p>
      )}

      {/* IMMEDIATE ACTION */}
      {isImmediate && (
        <div className="call-now">
          PLEASE COME TO THE COUNTER NOW
        </div>
      )}

      {/* INFO BUTTON */}
      <button
        className="info-btn"
        onClick={() =>
          alert(
            `How this works:
• Tokens are served in order
• If you are not present, your token may be skipped
• Skipped tokens are served manually by staff
• Your turn is never cancelled`
          )
        }
      >
        How this works
      </button>
    </div>
  );
}
