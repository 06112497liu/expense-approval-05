'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil,
  X,
  Loader2,
  Wallet,
  Receipt,
  ChevronRight,
} from 'lucide-react'
import { formatMoney, formatYearMonth, getCurrentYearMonth } from '@/lib/utils'
import { setDepartmentBudget } from '@/actions/admin'

interface Department {
  id: number
  name: string
}

interface DepartmentBudget {
  id: number
  departmentId: number
  yearMonth: string
  budgetAmount: number
  usedAmount: number
  department: Department
}

interface BudgetManagementClientProps {
  departments: Department[]
  budgets: DepartmentBudget[]
  initialYearMonth?: string
  canEdit?: boolean
}

export function BudgetManagement({
  departments,
  budgets,
  initialYearMonth,
  canEdit = true,
}: BudgetManagementClientProps) {
  const router = useRouter()
  const currentYearMonth = initialYearMonth || getCurrentYearMonth()
  const [yearMonth, setYearMonth] = useState(currentYearMonth)

  const budgetsByDept = new Map(
    budgets.filter((b) => b.yearMonth === yearMonth).map((b) => [b.departmentId, b])
  )

  const [editingDeptId, setEditingDeptId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState('')

  const handleMonthChange = (value: string) => {
    setYearMonth(value)
    setEditingDeptId(null)
    setEditValue('')
    setError('')
  }

  const openEdit = (deptId: number, currentAmount?: number) => {
    setEditingDeptId(deptId)
    setEditValue(currentAmount !== undefined ? currentAmount.toString() : '0')
    setError('')
  }

  const cancelEdit = () => {
    setEditingDeptId(null)
    setEditValue('')
    setError('')
  }

  const handleSave = async (deptId: number) => {
    const amount = parseFloat(editValue)
    if (isNaN(amount) || amount < 0) {
      setError('请输入有效的预算金额（非负数）')
      return
    }

    setLoading(deptId)
    setError('')
    try {
      await setDepartmentBudget(deptId, yearMonth, amount)
      setEditingDeptId(null)
      setEditValue('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '保存失败')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">部门预算管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            配置各部门月度预算额度，月初自动重置（需手动设置新月份预算）
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/budgets/transactions"
            className="inline-flex items-center space-x-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Receipt className="h-4 w-4" />
            <span>预算流水</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">月份：</label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">
              {formatYearMonth(yearMonth)} 预算情况
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  部门名称
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  月度预算
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  已使用
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  剩余预算
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  使用率
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((dept) => {
                const budget = budgetsByDept.get(dept.id)
                const budgetAmount = budget?.budgetAmount || 0
                const usedAmount = budget?.usedAmount || 0
                const remaining = budgetAmount - usedAmount
                const usagePercent =
                  budgetAmount > 0
                    ? Math.min((usedAmount / budgetAmount) * 100, 100)
                    : 0
                const isEditing = editingDeptId === dept.id

                return (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      <Link
                        href={`/admin/budgets/transactions?departmentId=${dept.id}&yearMonth=${yearMonth}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {dept.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">¥</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span className="font-semibold">
                          {formatMoney(budgetAmount)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {formatMoney(usedAmount)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span
                        className={`font-semibold ${
                          remaining < 0
                            ? 'text-red-600'
                            : remaining === 0
                            ? 'text-gray-600'
                            : 'text-green-600'
                        }`}
                      >
                        {formatMoney(remaining)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              usagePercent >= 100
                                ? 'bg-red-500'
                                : usagePercent >= 80
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10">
                          {usagePercent.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canEdit && (
                        isEditing ? (
                          <div className="inline-flex items-center space-x-2">
                            <button
                              onClick={() => handleSave(dept.id)}
                              disabled={loading === dept.id}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {loading === dept.id ? (
                                <Loader2 className="animate-spin h-3.5 w-3.5" />
                              ) : null}
                              <span>保存</span>
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={loading === dept.id}
                              className="px-3 py-1.5 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openEdit(dept.id, budgetAmount)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}
