import React, { useEffect, useState } from "react";
import { db } from "../firebaseInit";
import { collection, getDocs } from "firebase/firestore";

export default function ApprovedOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);

      const snap = await getDocs(collection(db, "orders"));

      const approved = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(o => o.status === "approved");  // SIMPLE FILTER — NO INDEX NEEDED

      setOrders(approved);
      setLoading(false);
    }

    loadOrders();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Approved Orders (To Prepare)</h1>

      {loading && <p>Loading...</p>}

      {!loading && orders.length === 0 && <p>No approved orders yet.</p>}

      {!loading && orders.map(order => (
        <div key={order.id} style={{
          border: "1px solid #ccc",
          padding: 10,
          marginBottom: 10,
          borderRadius: 6
        }}>
          <h3>Token #{order.token ?? "-"}</h3>

          <p><b>Name:</b> {order.customerName}</p>
          <p><b>Phone:</b> {order.phone}</p>

          <b>Items:</b>
          <ul>
            {(order.items || []).map((i, idx) => (
              <li key={idx}>{i.quantity}× {i.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
