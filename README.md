# SISTEM 2.0

Sistema de gestión de inventario y ventas desarrollado con Next.js 14, TypeScript y Supabase.

## Requisitos Previos

- Node.js 18.x o superior
- pnpm (recomendado) o npm
- Una cuenta en Supabase

## Configuración del Entorno

1. Clona el repositorio:
```bash
git clone [url-del-repositorio]
cd sistem-2.0
```

2. Instala las dependencias:
```bash
pnpm install
```

3. Crea un archivo `.env.local` con las siguientes variables:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
UPSTASH_REDIS_REST_URL=tu_url_de_upstash
UPSTASH_REDIS_REST_TOKEN=tu_token_de_upstash
```

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
pnpm dev
```

## Scripts Disponibles

- `pnpm dev`: Inicia el servidor de desarrollo
- `pnpm build`: Construye la aplicación para producción
- `pnpm start`: Inicia la aplicación en modo producción
- `pnpm lint`: Ejecuta el linter
- `pnpm test`: Ejecuta las pruebas
- `pnpm test:watch`: Ejecuta las pruebas en modo watch
- `pnpm test:coverage`: Ejecuta las pruebas con cobertura
- `pnpm format`: Formatea el código con Prettier

## Estructura del Proyecto

```
sistem-2.0/
├── app/                    # Páginas y rutas de Next.js
├── components/            # Componentes reutilizables
├── hooks/                # Custom hooks
├── lib/                  # Bibliotecas y configuraciones
├── public/              # Archivos estáticos
├── styles/              # Estilos globales
├── types/              # Definiciones de TypeScript
└── utils/              # Utilidades y helpers
```

## Pruebas

El proyecto utiliza Jest y Testing Library para las pruebas. Los archivos de prueba se encuentran en el directorio `__tests__`.

Para ejecutar las pruebas:

```bash
pnpm test
```

## Despliegue

La aplicación está optimizada para ser desplegada en Vercel. Para desplegar:

1. Conecta tu repositorio con Vercel
2. Configura las variables de entorno en el panel de Vercel
3. Despliega

## Contribución

1. Crea un fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
