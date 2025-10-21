import { createClient } from '@supabase/supabase-js'

import {env} from "@/config/env"

// Supabase 配置
const supabaseUrl = env.supabaseUrl || ''
const supabaseAnonKey = env.supabaseAnonKey || ''

// 检查必需的环境变量
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 用于服务端的 Supabase 客户端
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}