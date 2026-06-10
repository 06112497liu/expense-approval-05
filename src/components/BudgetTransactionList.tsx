'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Receipt,
  MinusCircle,
  PlusCircle,
} from 'lucide-react'
import {
  formatMoney,
  formatDate,
  formatYearMonth,
  getBudgetTypeText,
  getCurrentYearMonth,
} from '@/lib/utils'

interface Department {
  id: number
  name: string
}

interface BudgetTransaction {
  id: number
  departmentBudgetId: number
  reportId: number
  amount: number
  type: string
  description: string | null
  operatorId: number
  createdAt: Date
  departmentBudget: {
    id: number
    departmentId: number
    yearMonth: string
    department: Department
  }
  report: {
    id: number
    title: string
    creator: {
      id: number
      name: string
    }
  }
}

interface BudgetTransactionListProps {
  transactions: BudgetTransaction[]
  departments: Department[]
  initialDepartmentId?: number
  initialYearMonth?: string
}

export function BudgetTransactionList({
  transactions,
  departments,
  initialDepartmentId,
  initialYearMonth,
}: BudgetTransactionListProps) {
  const currentYearMonth = getCurrentYearMonth()
  const [departmentId, setDepartmentId] = useState<string>(
    initialDepartmentId?.toString() || ''
  )
  const [yearMonth, setYearMonth] = useState(
    initialYearMonth || currentYearMonth
  )

  const buildUrl = () => {
    const params = new URLSearchParams()
    if (departmentId) params.set('departmentId', departmentId)
    if (yearMonth) params.set('yearMonth', yearMonth)
    const query = params.toString()
    return query ? `/admin/budgets/transactions?${query}` : '/admin/budgets/transactions'
  }

  const handleFilter = () => {
    window.location.href = buildUrl()
  }

  const totalDeducted = transactions
    .filter((t) => t.type === 'DEDUCT')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/budgets"
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">预算流水记录</h1>
            <p className="mt-1 text-sm text-gray-500">
              查看各部门预算扣除和退回的历史记录
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部门
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">全部部门</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              月份
            </label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              筛选
            </button>
            <Link
              href="/admin/budgets/transactions"
              className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium transition-colors"
            >
              重置
            </Link>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Receipt className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              共 <span className="font-semibold text-gray-900">{transactions.length}</span> 条记录
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <MinusCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-600">
              累计扣除：
              <span className="font-semibold text-red-600">
                {formatMoney(totalDeducted)}
              </span>
            </span>
          </div>
          {yearMonth && (
            <div className="text-sm text-gray-500">
              预算月份：<span className="font-medium">{formatYearMonth(yearMonth)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">暂无预算流水记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    时间
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    部门
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    类型
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    金额
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    关联报销单
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    说明
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => {
                  const isDeduct = t.type === 'DEDUCT'
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {t.departmentBudget.department.name}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium ${
                            isDeduct
                              ? 'bg-red-50 text-red-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {isDeduct ? (
                            <MinusCircle className="h-3 w-3" />
                          ) : (
                            <PlusCircle className="h-3 w-3" />
                          )}
                          <span>{getBudgetTypeText(t.type)}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span
                          className={`font-semibold ${
                            isDeduct ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {isDeduct ? '-' : '+'}
                          {formatMoney(t.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <Link
                          href={`/expenses/${t.reportId}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {t.report.title}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          提交人：{t.report.creator.name}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 max-w-xs">
                        {t.description || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
