"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SearchFilter } from "@/components/ui/search-filter"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import type { Category } from "@/types/domain"
import { CategoriesRepository } from "@/lib/repositories/categoriesRepository"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    status: true,
  })

  useEffect(() => {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000))
    Promise.race([fetchCategories(), timeoutPromise]).catch(() => {
      toast({ title: 'Error', description: 'Hubo un problema al cargar los datos', variant: 'destructive' })
    })
  }, [])

  const categoriesRepository = new CategoriesRepository(supabase)

  const fetchCategories = async () => {
    try {
      const list = await categoriesRepository.list()
      setCategories(list)
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las categorías", variant: "destructive" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const categoryData = {
      name: formData.name,
      status: formData.status ? 1 : 0,
    }

    try {
      if (editingCategory) {
        await categoriesRepository.update(editingCategory.id, categoryData)
      } else {
        await categoriesRepository.create(categoryData)
      }
      toast({ title: "Éxito", description: `Categoría ${editingCategory ? "actualizada" : "creada"} correctamente` })
      setIsDialogOpen(false)
      resetForm()
      fetchCategories()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || 'No se pudo guardar', variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta categoría?")) {
      try {
        await categoriesRepository.remove(id)
        toast({ title: "Éxito", description: "Categoría eliminada correctamente" })
        fetchCategories()
      } catch {
        toast({ title: "Error", description: "No se pudo eliminar la categoría", variant: "destructive" })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      status: true,
    })
    setEditingCategory(null)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      status: category.status === 1,
    })
    setIsDialogOpen(true)
  }

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Agregar el componente de carga
  

  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categorías</h1>
            <p className="text-gray-600">Gestiona las categorías de productos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
                <DialogDescription>
                  {editingCategory
                    ? "Modifica los datos de la categoría"
                    : "Completa la información de la nueva categoría"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="status"
                      checked={formData.status}
                      onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                    />
                    <Label htmlFor="status">Activa</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingCategory ? "Actualizar" : "Crear"} Categoría</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <SearchFilter
            placeholder="Buscar categorías..."
            onFilter={setSearchTerm}
            className="max-w-md"
          />
        </div>

        {/* Lista de categorías */}
        <div className="grid gap-4">
          {filteredCategories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-600">Estado: {category.status === 1 ? "Activa" : "Inactiva"}</p>
                    <p className="text-sm text-gray-500">
                      Creada: {new Date(category.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
