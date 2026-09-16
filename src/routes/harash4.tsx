import { createFileRoute } from "@tanstack/react-router";
import { useDispatch } from "@/context/DispatchContext";
import { HarashWarehouseApp } from "@/components/mobile/HarashWarehouseApp";

export const Route = createFileRoute("/harash4")({
  component: Harash4RouteComponent,
});

function Harash4RouteComponent() {
  const { orders, updateOrderStatus, refreshOrders, isRefreshing } = useDispatch();

  return (
    <HarashWarehouseApp
      orders={orders}
      onUpdateOrderStatus={updateOrderStatus}
      onRefresh={refreshOrders}
      isRefreshing={isRefreshing}
    />
  );
}
