import { supabase } from "@/lib/supabaseClient";

/**
 * Generic Base Service Class (Polymorphism Pattern)
 * Provides standard CRUD features for any database table.
 */
export class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
    this.supabase = supabase;
  }

  /** Fetch a single record by its ID */
  async getById(id, select = "*") {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(select)
      .eq('id', id)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /** Delete a record by ID */
  async delete(id) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    return { error };
  }
  
  /** Update a record by ID */
  async update(id, payload) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  /** Insert a new record */
  async create(payload) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(payload)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
}
