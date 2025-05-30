"use client"

import type React from "react"
import { useRouter } from 'next/navigation'

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { supabase, type Product, type Category, type Vendor } from "@/lib/supabase"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ProductsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    product_name: "",
    details: "",
    category_id: "",
    status: 1,
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        setSession(session)

        // Timeout para las llamadas a la API
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000)
        )

        await Promise.race([
          Promise.all([
            fetchProducts(),
            fetchCategories(),
            fetchVendors()
          ]),
          timeoutPromise
        ])

      } catch (error) {
        console.error('Error durante la carga inicial:', error)
        toast({
          title: "Error",
          description: "Hubo un problema al cargar los datos",
          variant: "destructive",
        })
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Suscripción a cambios en la sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login')
      } else {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories(name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      })
    } else {
      setProducts(data || [])
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").eq("status", 1).order("name")
    if (error) {
      console.error("Error fetching categories:", error)
    }
    setCategories(data || [])
  }

  const fetchVendors = async () => {
    const { data, error } = await supabase.from("vendors").select("*").order("name")
    if (error) {
      console.error("Error fetching vendors:", error)
    }
    setVendors(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación básica
    if (!formData.product_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del producto es requerido",
        variant: "destructive",
      })
      return
    }

    const productData = {
      product_name: formData.product_name.trim(),
      details: formData.details.trim() || null,
      category_id: formData.category_id ? Number.parseInt(formData.category_id) : null,
      status: formData.status,
    }

    console.log("Sending product data:", productData)

    let error
    if (editingProduct) {
      const { error: updateError } = await supabase.from("products").update(productData).eq("id", editingProduct.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from("products").insert([productData])
      error = insertError
    }

    if (error) {
      console.error("Database error:", error)
      toast({
        title: "Error",
        description: `Error al ${editingProduct ? "actualizar" : "crear"} el producto: ${error.message}`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: `Producto ${editingProduct ? "actualizado" : "creado"} correctamente`,
      })
      setIsDialogOpen(false)
      resetForm()
      fetchProducts()
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      const { error } = await supabase.from("products").delete().eq("id", id)

      if (error) {
        console.error("Delete error:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar el producto",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: "Producto eliminado correctamente",
        })
        fetchProducts()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      product_name: "",
      details: "",
      category_id: "",
      status: 1,
    })
    setEditingProduct(null)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      product_name: product.product_name,
      details: product.details || "",
      category_id: product.category_id?.toString() || "",
      status: product.status,
    })
    setIsDialogOpen(true)
  }

  const filteredProducts = products.filter((product) =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Componente de carga
  if (!session || loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Navigation />
        <main className="flex-1 p-8">
          <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <h2 className="text-xl font-semibold text-gray-700">Verificando acceso...</h2>
            <p className="text-gray-500">Por favor espera mientras verificamos tu sesión</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
            <p className="text-gray-600">Gestiona tu catálogo de productos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Modifica los datos del producto" : "Completa la información del nuevo producto"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="product_name">Nombre del Producto *</Label>
                    <Input
                      id="product_name"
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      required
                      placeholder="Ej: Arroz blanco 1kg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoría</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">Sin categoría</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="details">Descripción/Detalles</Label>
                    <Textarea
                      id="details"
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      placeholder="Descripción detallada del producto..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select
                      value={formData.status.toString()}
                      onValueChange={(value) => setFormData({ ...formData, status: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Activo</SelectItem>
                        <SelectItem value="0">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingProduct ? "Actualizar" : "Crear"} Producto</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <Input
            placeholder="Buscar productos por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Lista de productos */}
        <div className="grid gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{product.product_name}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          product.status === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.status === 1 ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    {product.details && <p className="text-sm text-gray-600 mb-2">{product.details}</p>}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Categoría:</span>
                        <p>{product.categories?.name || "Sin categoría"}</p>
                      </div>
                      <div>
                        <span className="font-medium">Creado:</span>
                        <p>{new Date(product.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredProducts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No se encontraron productos</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
