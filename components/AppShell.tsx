'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import ImpersonateBar from './ImpersonateBar'
import AiAssistant from './AiAssistant'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const noShell = pathname === '/login' || pathname?.startsWith('/login/')

  if (noShell) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 flex flex-col">
        <ImpersonateBar />
        <div className="flex-1">{children}</div>
      </main>
      <AiAssistant />
    </div>
  )
}
