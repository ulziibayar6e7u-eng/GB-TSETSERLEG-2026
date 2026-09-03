'use client'

import { useEffect, useState } from 'react'
import { createClient } from './supabase-browser'

export type Me = {
  id: string
  auth_user_id: string
  last_name: string
  first_name: string
  role: string
  is_admin: boolean
  positions?: { name: string }
  groups: { id: number; code: string; name: string; icon: string; color: string; role_in_group: string }[]
  clubs: { id: number; name: string; icon: string; color: string }[]
  // Impersonation
  real_id?: string
  real_role?: string
  real_is_admin?: boolean
  impersonating?: boolean
}

const IMP_KEY = 'impersonate_employee_id'

export function setImpersonation(employeeId: string | null) {
  if (typeof window === 'undefined') return
  if (employeeId) localStorage.setItem(IMP_KEY, employeeId)
  else localStorage.removeItem(IMP_KEY)
  window.location.reload()
}

export function getImpersonationId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(IMP_KEY)
}

async function loadEmployee(supabase: ReturnType<typeof createClient>, empId: string): Promise<Me | null> {
  const { data: emp } = await supabase
    .from('employees')
    .select('*, positions(name)')
    .eq('id', empId)
    .maybeSingle()
  if (!emp) return null
  const { data: gt } = await supabase
    .from('group_teachers')
    .select('role_in_group, groups(id, code, name, icon, color)')
    .eq('employee_id', emp.id)
  const { data: cl } = await supabase
    .from('clubs')
    .select('id, name, icon, color')
    .eq('teacher_id', emp.id)
  const groups = ((gt || []) as {role_in_group: string; groups: {id:number;code:string;name:string;icon:string;color:string}}[]).map((row) => ({
    ...row.groups,
    role_in_group: row.role_in_group,
  }))
  return {
    ...(emp as Omit<Me, 'groups' | 'clubs'>),
    groups,
    clubs: (cl as Me['clubs']) || [],
  }
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const realMe = await (async () => {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, role, is_admin')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        return emp as { id: string; role: string; is_admin: boolean } | null
      })()

      if (!realMe) { setLoading(false); return }

      const impId = getImpersonationId()
      let target: Me | null = null
      if (impId && (realMe.is_admin || realMe.role === 'erhlegch')) {
        target = await loadEmployee(supabase, impId)
        if (target) {
          target.real_id = realMe.id
          target.real_role = realMe.role
          target.real_is_admin = realMe.is_admin
          target.impersonating = true
          // Impersonation-ий үед is_admin false болгож бодит харагдацыг үзүүлэх
          target.is_admin = false
        }
      }
      if (!target) target = await loadEmployee(supabase, realMe.id)
      setMe(target)
      setLoading(false)
    })()
  }, [])

  return { me, loading }
}

export function canSeeAllChildren(role: string, isAdmin: boolean) {
  return isAdmin || role === 'erhlegch' || role === 'arga_zuich'
}
