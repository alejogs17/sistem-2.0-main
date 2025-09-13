"use client"

import type React from "react"
import { useRouter } from 'next/navigation'

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SearchFilter } from "@/components/ui/search-filter"
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
import { supabase } from "@/lib/supabase"
import type { Product, Category, Vendor } from "@/types/domain"
import { ProductsRepository } from "@/lib/repositories/productsRepository"
import { CategoriesRepository } from "@/lib/repositories/categoriesRepository"
import { VendorsRepository } from "@/lib/repositories/vendorsRepository"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    productName: "",
    details: "",
    categoryId: "",
    status: 1,
  })

  useEffect(() => {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000))
    Promise.race([
      Promise.all([fetchProducts(), fetchCategories(), fetchVendors() ]),
      timeoutPromise
    ]).catch(() => {
      toast({ title: 'Error', description: 'Hubo un problema al cargar los datos', variant: 'destructive' })
    })
  }, [])

  const productsRepository = new ProductsRepository(supabase)
  const categoriesRepository = new CategoriesRepository(supabase)
  const vendorsRepository = new VendorsRepository(supabase)

  const fetchProducts = async () => {
    try {
      const data = await productsRepository.list()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({ title: "Error", description: "No se pudieron cargar los productos", variant: "destructive" })
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await categoriesRepository.listActive()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchVendors = async () => {
    try {
      const data = await vendorsRepository.list()
      setVendors(data)
    } catch (error) {
      console.error("Error fetching vendors:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación básica
    if (!formData.productName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del producto es requerido",
        variant: "destructive",
      })
      return
    }

    const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'categories'> = {
      productName: formData.productName.trim(),
      details: formData.details.trim() || null,
      categoryId: formData.categoryId ? Number.parseInt(formData.categoryId) : null,
      status: formData.status,
    }

    console.log("Sending product data:", productData)

    try {
      if (editingProduct) {
        await productsRepository.update(editingProduct.id, productData)
      } else {
        await productsRepository.create(productData)
      }
      toast({ title: "Éxito", description: `Producto ${editingProduct ? "actualizado" : "creado"} correctamente` })
      setIsDialogOpen(false)
      resetForm()
      fetchProducts()
    } catch (error: any) {
      console.error("Database error:", error)
      toast({ title: "Error", description: `Error al ${editingProduct ? "actualizar" : "crear"} el producto`, variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await productsRepository.remove(id)
        toast({ title: "Éxito", description: "Producto eliminado correctamente" })
        fetchProducts()
      } catch (error) {
        console.error("Delete error:", error)
        toast({ title: "Error", description: "No se pudo eliminar el producto", variant: "destructive" })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      productName: "",
      details: "",
      categoryId: "",
      status: 1,
    })
    setEditingProduct(null)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      productName: product.productName,
      details: product.details || "",
      categoryId: product.categoryId?.toString() || "",
      status: product.status,
    })
    setIsDialogOpen(true)
  }

  const filteredProducts = products.filter((product) =>
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Componente de carga
  

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
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      required
                      placeholder="Ej: Arroz blanco 1kg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoría</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
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
          <SearchFilter
            placeholder="Buscar productos por nombre..."
            onFilter={setSearchTerm}
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
                    <h3 className="text-lg font-semibold">{product.productName}</h3>
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
                        <p>{new Date(product.createdAt).toLocaleDateString()}</p>
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
