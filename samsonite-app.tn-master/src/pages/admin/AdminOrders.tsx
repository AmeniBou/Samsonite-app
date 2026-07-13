import { useEffect, useMemo, useState } from "react";
import { PackageCheck, RefreshCw } from "lucide-react";

import { formatTnd } from "@/lib/currency";
import { listOrders, updateOrderStatus, type OrderStatus, type StoredOrder } from "@/lib/orders";

const statusLabels: Record<OrderStatus, string> = {
  new: "Nouvelle",
  confirmed: "Confirmee",
  fulfilled: "Livree",
  cancelled: "Annulee",
};

const statusClasses: Record<OrderStatus, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-100",
  confirmed: "bg-amber-50 text-amber-700 border-amber-100",
  fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelled: "bg-red-50 text-red-700 border-red-100",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [search, setSearch] = useState("");

  const loadOrders = () => setOrders(listOrders());

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const customer = `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase();
      return (
        order.id.toLowerCase().includes(query) ||
        customer.includes(query) ||
        order.customer.phone.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query)
      );
    });
  }, [orders, search]);

  const handleStatusChange = (id: string, status: OrderStatus) => {
    updateOrderStatus(id, status);
    loadOrders();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="mt-1 text-sm text-gray-500">{orders.length} commandes enregistrees</p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Rafraichir
        </button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher par reference, client, telephone ou email..."
        className="mb-4 w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
      />

      {filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <PackageCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">
            {orders.length === 0 ? "Aucune commande pour le moment" : "Aucune commande trouvee"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Les commandes validees depuis le checkout apparaitront ici.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Articles</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="align-top transition-colors hover:bg-gray-50">
                    <td className="px-4 py-4 font-mono text-xs text-gray-700">{order.id}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{order.customer.phone}</p>
                      <p className="text-xs text-gray-500">{order.customer.email}</p>
                      <p className="mt-1 max-w-xs text-xs text-gray-500">
                        {order.customer.address}, {order.customer.city}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={`${order.id}-${item.productId}-${item.selectedColor}`} className="flex gap-2">
                            <img src={item.image} alt="" className="h-10 w-10 object-contain" />
                            <div>
                              <p className="max-w-xs truncate text-xs font-medium">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                {item.quantity} x {formatTnd(item.unitPrice)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold">{formatTnd(order.totals.total)}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {new Intl.DateTimeFormat("fr-TN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(order.createdAt))}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={order.status}
                        onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[order.status]}`}
                      >
                        {Object.entries(statusLabels).map(([status, label]) => (
                          <option key={status} value={status}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
