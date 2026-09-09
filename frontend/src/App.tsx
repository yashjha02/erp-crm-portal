import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Products from "./pages/Products";
import Challans from "./pages/Challans";
import ChallanNew from "./pages/ChallanNew";
import ChallanDetail from "./pages/ChallanDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="products" element={<Products />} />
        <Route path="challans" element={<Challans />} />
        <Route path="challans/new" element={<ChallanNew />} />
        <Route path="challans/:id" element={<ChallanDetail />} />
      </Route>
    </Routes>
  );
}
