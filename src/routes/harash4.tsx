import { createFileRoute } from "@tanstack/react-router";
import { useDispatchBoard } from "@/context/DispatchContext";
import { HarashWarehouseApp } from "@/components/mobile/HarashWarehouseApp";

export const Route = createFileRoute("/harash4")({
  component: Harash4RouteComponent,
});

function Harash4RouteComponent() {
  const { published, quickUpdateStatus, syncNow, syncStatus } = useDispatchBoard();

  return (
    <HarashWarehouseApp
      orders={published}
      onUpdateOrderStatus={quickUpdateStatus}
      onRefresh={syncNow}
      isRefreshing={syncStatus === "syncing"}
    />
  );
}
