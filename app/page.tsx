import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, DollarSign, Users } from "lucide-react"
import { redirect } from "next/navigation"
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getDashboardData(s: SupabaseClient<any, any, any>) {
  const [
    { count: totalProducts },
    { count: totalCategories },
    { count: totalCustomers },
    { count: totalVendors },
    { count: lowStockProducts },
    { data: recentSells },
    { data: stockData },
  ] = await Promise.all([
    s.from("products").select("*", { count: "exact", head: true }),
    s.from("categories").select("*", { count: "exact", head: true }),
    s.from("customers").select("*", { count: "exact", head: true }),
    s.from("vendors").select("*", { count: "exact", head: true }),
    s.from("stocks").select("*", { count: "exact", head: true }).lt("current_quantity", 10),
    s
      .from("sells")
      .select(`
        *,
        customers(customer_name)
      `)
      .order("created_at", { ascending: false })
      .limit(5),
    s.from("stocks").select("selling_price, current_quantity"),
  ])

  const inventoryValue = stockData?.reduce((sum, stock) => sum + stock.selling_price * stock.current_quantity, 0) || 0

  return {
    totalProducts: totalProducts || 0,
    totalCategories: totalCategories || 0,
    totalCustomers: totalCustomers || 0,
    totalVendors: totalVendors || 0,
    lowStockProducts: lowStockProducts || 0,
    recentSells: recentSells || [],
    inventoryValue,
  }
}

export default async function Dashboard() {
  const cookieStore = await cookies()
  
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
  
  const { data: { session } } = await sb.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  const {
    totalProducts,
    totalCategories,
    totalCustomers,
    totalVendors,
    lowStockProducts,
    recentSells,
    inventoryValue,
  } = await getDashboardData(sb)

  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen general del sistema de inventario</p>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorías</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCategories}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVendors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{lowStockProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${inventoryValue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Ventas recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas Recientes</CardTitle>
            <CardDescription>Últimas 5 ventas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSells.map((sell) => (
                <div key={sell.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">Cliente: {sell.customers?.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      Total: ${sell.total_amount} - Pagado: ${sell.paid_amount}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(sell.created_at).toLocaleDateString()}</div>
                </div>
              ))}
              {recentSells.length === 0 && <p className="text-gray-500 text-center py-4">No hay ventas recientes</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
