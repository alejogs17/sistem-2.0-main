#!/usr/bin/env python3
"""
Script para ejecutar migraciones de base de datos
Basado en soenac/api-dian y especificaciones DIAN
"""

import os
import sys
import argparse
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def get_supabase_client() -> Client:
    """Crear cliente de Supabase"""
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("❌ Error: Variables de entorno de Supabase no configuradas")
        sys.exit(1)
    
    return create_client(url, key)

def run_migration(client: Client, migration_file: str) -> bool:
    """Ejecutar una migración específica"""
    try:
        migration_path = Path(__file__).parent.parent / "database" / "migrations" / migration_file
        
        if not migration_path.exists():
            print(f"❌ Error: Archivo de migración no encontrado: {migration_file}")
            return False
        
        print(f"📁 Ejecutando migración: {migration_file}")
        
        with open(migration_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Ejecutar SQL
        result = client.rpc('exec_sql', {'sql': sql_content}).execute()
        
        print(f"✅ Migración ejecutada exitosamente: {migration_file}")
        return True
        
    except Exception as e:
        print(f"❌ Error ejecutando migración {migration_file}: {str(e)}")
        return False

def run_all_migrations(client: Client) -> bool:
    """Ejecutar todas las migraciones en orden"""
    migrations = [
        "001_create_organizations_table.sql",
        "002_create_invoices_table.sql", 
        "003_create_invoice_items_table.sql",
        "004_create_events_table.sql"
    ]
    
    print("🚀 Iniciando ejecución de migraciones...")
    
    for migration in migrations:
        if not run_migration(client, migration):
            print(f"❌ Falló la migración: {migration}")
            return False
    
    print("✅ Todas las migraciones ejecutadas exitosamente")
    return True

def verify_tables(client: Client) -> bool:
    """Verificar que las tablas se crearon correctamente"""
    print("🔍 Verificando tablas creadas...")
    
    tables_to_check = [
        "organizations",
        "invoices", 
        "invoice_items",
        "events"
    ]
    
    for table in tables_to_check:
        try:
            result = client.table(table).select("count", count="exact").execute()
            count = result.count
            print(f"✅ Tabla {table}: {count} registros")
        except Exception as e:
            print(f"❌ Error verificando tabla {table}: {str(e)}")
            return False
    
    return True

def main():
    parser = argparse.ArgumentParser(description='Ejecutar migraciones de base de datos')
    parser.add_argument('--migration', help='Ejecutar migración específica')
    parser.add_argument('--verify', action='store_true', help='Verificar tablas después de migración')
    
    args = parser.parse_args()
    
    try:
        # Crear cliente Supabase
        client = get_supabase_client()
        
        if args.migration:
            # Ejecutar migración específica
            success = run_migration(client, args.migration)
            if not success:
                sys.exit(1)
        else:
            # Ejecutar todas las migraciones
            success = run_all_migrations(client)
            if not success:
                sys.exit(1)
        
        # Verificar tablas si se solicita
        if args.verify:
            verify_success = verify_tables(client)
            if not verify_success:
                print("❌ Error en verificación de tablas")
                sys.exit(1)
        
        print("🎉 Proceso completado exitosamente")
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
