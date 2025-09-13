import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { Product } from '@/types/domain'

export class ProductsRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  async list(): Promise<Product[]> {
    const { data, error } = await this.client
      .from('products')
      .select(`*, categories(name)`) // minimal category information
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => toCamelCaseKeys<Product>(row))
  }

  async create(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'categories'>): Promise<Product> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('products')
      .insert([payload])
      .select(`*, categories(name)`) // return with relation for consistency
      .single()
    if (error) throw error
    return toCamelCaseKeys<Product>(data)
  }

  async update(id: number, input: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'categories'>>): Promise<Product> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('products')
      .update(payload)
      .eq('id', id)
      .select(`*, categories(name)`) // ensure same shape
      .single()
    if (error) throw error
    return toCamelCaseKeys<Product>(data)
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.client.from('products').delete().eq('id', id)
    if (error) throw error
  }
}

