import { supabase } from './supabaseClient'

export const DEFAULT_CATEGORIES = [
  'Aviation Aluminum Solar Light',
  'Aviation Aluminum Solar Road Light',
  'Aviation Aluminum Solar Street Light',
  'Integrated Solar Street Light',
  'Aluminum Solar Street Light',
  'Solar Streetlight',
]

/**
 * Fetch all categories with product counts
 */
export async function fetchCategoriesWithCounts() {
  try {
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('id, name, created_at').order('name', { ascending: true }),
      supabase.from('products').select('type')
    ])

    if (catRes.error) {
      console.warn('Could not load categories table, falling back to defaults/products:', catRes.error)
      // Extract from products if table fails
      const prodTypes = Array.from(new Set((prodRes.data || []).map(p => p.type).filter(Boolean)))
      const allNames = Array.from(new Set([...DEFAULT_CATEGORIES, ...prodTypes]))
      return {
        data: allNames.map((name, i) => ({ id: i + 1, name, count: (prodRes.data || []).filter(p => p.type === name).length })),
        error: null
      }
    }

    const counts = {}
    ;(prodRes.data || []).forEach(p => {
      if (p.type) {
        counts[p.type] = (counts[p.type] || 0) + 1
      }
    })

    const categoriesWithCounts = (catRes.data || []).map(cat => ({
      ...cat,
      count: counts[cat.name] || 0
    }))

    return { data: categoriesWithCounts, error: null }
  } catch (err) {
    console.error('fetchCategories error:', err)
    return { data: [], error: err }
  }
}

/**
 * Add a new category
 */
export async function addCategory(rawName) {
  const name = (rawName || '').trim()
  if (!name) {
    return { data: null, error: { message: 'Category name cannot be empty.' } }
  }

  try {
    // Check if category already exists locally/remotely
    const { data: existing } = await supabase
      .from('categories')
      .select('id, name')
      .ilike('name', name)
      .maybeSingle()

    if (existing) {
      return { data: null, error: { message: `Category "${name}" already exists.` } }
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{ name }])
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('addCategory error:', err)
    return { data: null, error: err }
  }
}

/**
 * Rename a category (Admin only)
 * Also cascades the new name to products that have the old category name
 */
export async function updateCategory(id, oldName, rawNewName) {
  const newName = (rawNewName || '').trim()
  if (!newName) {
    return { data: null, error: { message: 'Category name cannot be empty.' } }
  }
  if (oldName === newName) {
    return { data: { id, name: newName }, error: null }
  }

  try {
    // Check duplicate
    const { data: duplicate } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', newName)
      .neq('id', id)
      .maybeSingle()

    if (duplicate) {
      return { data: null, error: { message: `Another category named "${newName}" already exists.` } }
    }

    // Update category row
    const { data, error } = await supabase
      .from('categories')
      .update({ name: newName })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Sync products that used the old category name
    if (oldName) {
      await supabase
        .from('products')
        .update({ type: newName })
        .eq('type', oldName)
    }

    return { data, error: null }
  } catch (err) {
    console.error('updateCategory error:', err)
    return { data: null, error: err }
  }
}

/**
 * Delete a category (Admin only)
 * Enforces safety: prevents deletion if any products are assigned to this category
 */
export async function deleteCategory(id, name) {
  try {
    // Check if any product is using this category
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('type', name)

    if (countError) throw countError

    if (count && count > 0) {
      return {
        success: false,
        error: {
          message: `Cannot delete category "${name}" because ${count} product(s) are currently assigned to it. Please reassign those products first.`,
          count
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return { success: true, error: null }
  } catch (err) {
    console.error('deleteCategory error:', err)
    return { success: false, error: err }
  }
}
