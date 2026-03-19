import { BaseService } from "./BaseService";

/**
 * UserService extending BaseService
 * Handles all logic for the 'profiles' table.
 */
class UserServiceClass extends BaseService {
  constructor() {
    super('profiles'); // Pass the table name to the generic parent
  }

  /**
   * Fetch a profile by its Telegram User ID instead of UUID
   */
  async getByTgId(tgUserId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('tg_user_id', tgUserId)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // ignore "Not found"
    return data;
  }

  /**
   * Extends update logic by checking for verification badges or logic
   */
  async updateProfile(id, metadata) {
      // Polymorphism allows us to use core methods inside custom methods
      return await this.update(id, metadata);
  }
}

export const UserService = new UserServiceClass();
