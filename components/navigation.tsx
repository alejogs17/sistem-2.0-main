"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Package, Users, Tag, TrendingUp, Home, FileText, ShoppingCart, Menu, ChevronLeft, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

const navigation = [
	{ name: "Dashboard", href: "/", icon: Home },
	{ name: "Productos", href: "/products", icon: Package },
	{ name: "Categorías", href: "/categories", icon: Tag },
	{ name: "Proveedores", href: "/vendors", icon: Users },
	{ name: "Stock", href: "/stock", icon: TrendingUp },
	{ name: "Ventas", href: "/sells", icon: ShoppingCart },
	{ name: "Clientes", href: "/customers", icon: Users },
	{ name: "Facturación", href: "/facturacion-electronica", icon: FileText },
	{ name: "Reportes", href: "/reports", icon: FileText },
]

export function Navigation() {
	const pathname = usePathname()
	const router = useRouter()
	const [isCollapsed, setIsCollapsed] = useState(false)

	// Cargar preferencia del usuario desde localStorage al iniciar
	useEffect(() => {
		const savedState = localStorage.getItem("sidebarCollapsed")
		if (savedState !== null) {
			setIsCollapsed(savedState === "true")
		}
	}, [])

	// Guardar preferencia del usuario cuando cambia
	useEffect(() => {
		localStorage.setItem("sidebarCollapsed", isCollapsed.toString())
	}, [isCollapsed])

	// Prefetch de rutas para navegación más rápida entre módulos
	useEffect(() => {
		try {
			navigation.forEach((item) => {
				router.prefetch(item.href)
			})
		} catch {}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Función para cerrar sesión
	const handleLogout = async () => {
		await supabase.auth.signOut()
		router.replace("/login")
	}

	return (
		<>
			{/* Botón para mostrar menú cuando está colapsado en móvil */}
			<div className={`fixed top-4 left-4 z-50 md:hidden ${isCollapsed ? "block" : "hidden"}`}>
				<Button variant="outline" size="icon" onClick={() => setIsCollapsed(false)} className="bg-white shadow-md">
					<Menu className="h-5 w-5" />
				</Button>
			</div>

			<nav
				className={cn(
					"bg-gray-800 text-white fixed h-screen transition-all duration-300 z-40",
					isCollapsed ? "w-0 md:w-16 overflow-hidden" : "w-64",
				)}
			>
				<div className="flex flex-col h-full">
					<div className="flex items-center justify-between p-4">
						<h1 className={cn("text-xl font-bold whitespace-nowrap", isCollapsed && "md:hidden")}>
							Sistema de Inventario
						</h1>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsCollapsed(!isCollapsed)}
							className="text-white hover:bg-gray-700"
						>
							<ChevronLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
						</Button>
					</div>

					<ul className="space-y-2 p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
						{navigation.map((item) => {
							const Icon = item.icon
							return (
								<li key={item.name}>
										<Link
											href={item.href}
											prefetch
											className={cn(
											"flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
											pathname === item.href
												? "bg-gray-700 text-white"
												: "text-gray-300 hover:bg-gray-700 hover:text-white",
										)}
										title={isCollapsed ? item.name : undefined}
									>
										<Icon className="w-5 h-5 flex-shrink-0" />
										<span className={cn("transition-opacity", isCollapsed && "md:hidden")}>{item.name}</span>
									</Link>
								</li>
							)
						})}
					</ul>

					{/* Botón de logout */}
					<div className="p-4 border-t border-gray-700">
						<Button
							variant="outline"
							className="w-full flex items-center justify-center gap-2 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
							onClick={handleLogout}
						>
							<LogOut className="w-4 h-4" />
							<span className={cn("transition-opacity", isCollapsed && "md:hidden")}>Cerrar sesión</span>
						</Button>
						<p className={cn("mt-4 text-xs text-gray-400 transition-opacity", isCollapsed && "md:hidden")}>
							Sistema de Gestión v1.0
						</p>
					</div>
				</div>
			</nav>

			{/* Overlay para cerrar el menú en móvil cuando está abierto */}
			<div
				className={`fixed inset-0 bg-black/50 z-30 md:hidden ${isCollapsed ? "hidden" : "block"}`}
				onClick={() => setIsCollapsed(true)}
			/>

			{/* Espaciador para empujar el contenido principal */}
			<div className={cn("transition-all duration-300", isCollapsed ? "w-0 md:w-16" : "w-64")} />
		</>
	)
}
