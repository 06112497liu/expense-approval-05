import { prisma } from './prisma'

export async function getUserExpenseReports(userId: number, includeHistory = false) {
  const where: any = {
    creatorId: userId,
  }

  if (!includeHistory) {
    where.status = { in: ['DRAFT', 'PENDING'] }
  } else {
    where.status = { in: ['APPROVED', 'REJECTED'] }
  }

  return prisma.expenseReport.findMany({
    where,
    include: {
      creator: true,
      currentApprover: true,
      items: true,
      approvals: {
        include: {
          approver: true,
        },
        orderBy: {
          stepNumber: 'asc',
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export async function getPendingApprovalsForUser(
  userId: number,
  userRole: string,
  userDepartmentId: number | null
) {
  if (userRole === 'ADMIN') {
    return prisma.expenseReport.findMany({
      where: { status: 'PENDING' },
      include: {
        creator: {
          include: {
            department: true,
          },
        },
        currentApprover: true,
        items: true,
        approvals: {
          include: {
            approver: true,
          },
          orderBy: {
            stepNumber: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  if (userRole === 'MANAGER' && userDepartmentId) {
    return prisma.expenseReport.findMany({
      where: {
        status: 'PENDING',
        currentApproverId: userId,
        creator: {
          departmentId: userDepartmentId,
        },
      },
      include: {
        creator: {
          include: {
            department: true,
          },
        },
        currentApprover: true,
        items: true,
        approvals: {
          include: {
            approver: true,
          },
          orderBy: {
            stepNumber: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  if (userRole === 'FINANCE') {
    return prisma.expenseReport.findMany({
      where: {
        status: 'PENDING',
        currentApproverId: userId,
      },
      include: {
        creator: {
          include: {
            department: true,
          },
        },
        currentApprover: true,
        items: true,
        approvals: {
          include: {
            approver: true,
          },
          orderBy: {
            stepNumber: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  return []
}

export async function getAllExpenseReports() {
  return prisma.expenseReport.findMany({
    include: {
      creator: {
        include: {
          department: true,
        },
      },
      currentApprover: true,
      items: true,
      approvals: {
        include: {
          approver: true,
        },
        orderBy: {
          stepNumber: 'asc',
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export async function getExpenseReportById(id: number) {
  return prisma.expenseReport.findUnique({
    where: { id },
    include: {
      creator: {
        include: {
          department: true,
        },
      },
      currentApprover: true,
      items: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      approvals: {
        include: {
          approver: true,
        },
        orderBy: {
          stepNumber: 'asc',
        },
      },
    },
  })
}

export async function getDepartmentManager(departmentId: number) {
  return prisma.user.findFirst({
    where: {
      departmentId,
      role: 'MANAGER',
    },
  })
}

export async function getFinanceUser() {
  return prisma.user.findFirst({
    where: {
      role: 'FINANCE',
    },
  })
}

export async function getOrCreateDepartmentBudget(
  departmentId: number,
  yearMonth: string
) {
  let budget = await prisma.departmentBudget.findUnique({
    where: {
      departmentId_yearMonth: {
        departmentId,
        yearMonth,
      },
    },
  })

  if (!budget) {
    budget = await prisma.departmentBudget.create({
      data: {
        departmentId,
        yearMonth,
        budgetAmount: 0,
        usedAmount: 0,
      },
    })
  }

  return budget
}

export async function getDepartmentBudgetsByMonth(yearMonth: string) {
  return prisma.departmentBudget.findMany({
    where: { yearMonth },
    include: {
      department: true,
    },
    orderBy: {
      departmentId: 'asc',
    },
  })
}

export async function getDepartmentBudgetWithTransactions(
  departmentId: number,
  yearMonth: string
) {
  return prisma.departmentBudget.findUnique({
    where: {
      departmentId_yearMonth: {
        departmentId,
        yearMonth,
      },
    },
    include: {
      department: true,
      transactions: {
        include: {
          report: {
            include: {
              creator: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })
}

export async function getAllBudgetTransactions(
  options?: {
    departmentId?: number
    yearMonth?: string
  }
) {
  const where: any = {}
  if (options?.departmentId || options?.yearMonth) {
    where.departmentBudget = {}
    if (options.departmentId) {
      where.departmentBudget.departmentId = options.departmentId
    }
    if (options.yearMonth) {
      where.departmentBudget.yearMonth = options.yearMonth
    }
  }

  return prisma.budgetTransaction.findMany({
    where,
    include: {
      departmentBudget: {
        include: {
          department: true,
        },
      },
      report: {
        include: {
          creator: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}
