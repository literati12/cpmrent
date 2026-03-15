import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://zxepkbacmkzgoremfhnc.supabase.co"
const supabaseAnonKey = "sb_publishable_TNJINoyZHQEmy4bAClAI7Q_Bhwa6r3N"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)