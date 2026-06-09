import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Navbar } from '@/components/navbar'
import { getCurrentUser } from '@/lib/permissions'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '财务报销系统',
  description: '公司财务报销审批管理系统',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          {user ? (
            <div className="min-h-screen bg-gray-50">
              <Navbar user={user} />
              <main className="container mx-auto py-6 px-4">{children}</main>
            </div>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  )
}
