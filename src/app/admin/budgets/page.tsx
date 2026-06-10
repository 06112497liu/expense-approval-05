import { requireAdminOrFinance } from '@/lib/permissions'
import { getAllDepartments, getAllBudgetsWithDetails } from '@/actions/admin'
import { BudgetManagement } from '@/components/BudgetManagement'
import { getCurrentYearMonth } from '@/lib/utils'

export default async function AdminBudgetsPage() {
  const user = await requireAdminOrFinance()

  const departments = await getAllDepartments()
  const budgets = await getAllBudgetsWithDetails()
  const currentYearMonth = getCurrentYearMonth()

  return (
    <BudgetManagement
      departments={departments as any}
      budgets={budgets as any}
      initialYearMonth={currentYearMonth}
      canEdit={user.role === 'ADMIN'}
    />
  )
}
