import React from "react";
import { Switch, Route } from "wouter";
import PlaceOrder from "./pages/home.jsx";
import StaffDashboard from "./pages/staff.jsx";
import TokenStatus from "./pages/status.jsx";
import { useShop } from "./context/ShopContext";
import useApplyTheme from "./hooks/useApplyTheme";

export default function App() {
  const { shop } = useShop();

  // Apply theme globally (safe even if theme is missing)
  useApplyTheme(shop?.theme);

  return (
    <Switch>
      <Route path="/">
        <PlaceOrder />
      </Route>

      <Route path="/staff">
        <StaffDashboard />
      </Route>

      <Route path="/mytoken">
        <TokenStatus />
      </Route>

      {/* 404 */}
      <Route>
        <div style={{ padding: 20 }}>404 – Page Not Found</div>
      </Route>
    </Switch>
  );
}
