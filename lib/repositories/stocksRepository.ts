import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { Stock } from '@/types/domain'

export class StocksRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  async listWithRelations(): Promise<Stock[]> {
    const { data, error } = await this.client
      .from('stocks')
      .select(`
        *,
        products:products(product_name, details, status),
        vendors:vendors(name, phone),
        categories:categories(name)
      `)
      .order('id', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => toCamelCaseKeys<Stock>(row))
  }

  async create(input: Omit<Stock, 'id' | 'createdAt' | 'updatedAt' | 'products' | 'vendors' | 'categories'>): Promise<Stock> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('stocks')
      .insert([payload])
      .select(`
        *,
        products:products(product_name, details, status),
        vendors:vendors(name, phone),
        categories:categories(name)
      `)
      .single()
    if (error) throw error
    return toCamelCaseKeys<Stock>(data)
  }

  async update(id: number, input: Partial<Omit<Stock, 'id' | 'createdAt' | 'updatedAt' | 'products' | 'vendors' | 'categories'>>): Promise<Stock> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('stocks')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        products:products(product_name, details, status),
        vendors:vendors(name, phone),
        categories:categories(name)
      `)
      .single()
    if (error) throw error
    return toCamelCaseKeys<Stock>(data)
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.client.from('stocks').delete().eq('id', id)
    if (error) throw error
  }
}

