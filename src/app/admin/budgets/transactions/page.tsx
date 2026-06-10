import { requireAdminOrFinance } from '@/lib/permissions'
import { getAllDepartments, getBudgetTransactions } from '@/actions/admin'
import { BudgetTransactionList } from '@/components/BudgetTransactionList'

interface SearchParams {
  departmentId?: string
  yearMonth?: string
}

export default async function BudgetTransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdminOrFinance()

  const departments = await getAllDepartments()

  const options: { departmentId?: number; yearMonth?: string } = {}
  if (searchParams.departmentId) {
    options.departmentId = parseInt(searchParams.departmentId)
  }
  if (searchParams.yearMonth) {
    options.yearMonth = searchParams.yearMonth
  }

  const transactions = await getBudgetTransactions(
    Object.keys(options).length > 0 ? options : undefined
  )

  return (
    <BudgetTransactionList
      transactions={transactions as any}
      departments={departments as any}
      initialDepartmentId={options.departmentId}
      initialYearMonth={options.yearMonth}
    />
  )
}
