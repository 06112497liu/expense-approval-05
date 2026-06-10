'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/permissions'
import {
  getDepartmentManager,
  getFinanceUser,
  getExpenseReportById,
  getOrCreateDepartmentBudget,
} from '@/lib/queries'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentYearMonth } from '@/lib/utils'

export async function createExpenseReport(data: {
  title: string
  description: string
  items: {
    category: string
    amount: number
    description: string
    date: string
  }[]
}) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('未登录')
  }

  const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0)

  const report = await prisma.expenseReport.create({
    data: {
      title: data.title,
      description: data.description,
      totalAmount,
      status: 'DRAFT',
      creatorId: parseInt(user.id),
      items: {
        create: data.items.map((item) => ({
          category: item.category,
          amount: item.amount,
          description: item.description,
          date: new Date(item.date),
        })),
      },
    },
  })

  revalidatePath('/')
  revalidatePath('/expenses')
  return report
}

export async function updateExpenseReport(
  reportId: number,
  data: {
    title: string
    description: string
    items: {
      id?: number
      category: string
      amount: number
      description: string
      date: string
    }[]
  }
) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('未登录')
  }

  const report = await getExpenseReportById(reportId)
  if (!report) {
    throw new Error('报销单不存在')
  }

  if (report.creatorId !== parseInt(user.id)) {
    throw new Error('无权修改此报销单')
  }

  if (report.status !== 'DRAFT' && report.status !== 'REJECTED') {
    throw new Error('当前状态不能修改报销单')
  }

  const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0)

  await prisma.expenseItem.deleteMany({
    where: { reportId },
  })

  const updateData: any = {
    title: data.title,
    description: data.description,
    totalAmount,
    items: {
      create: data.items.map((item) => ({
        category: item.category,
        amount: item.amount,
        description: item.description,
        date: new Date(item.date),
      })),
    },
  }

  if (report.status === 'REJECTED') {
    updateData.status = 'DRAFT'
    updateData.submittedAt = null
    updateData.currentApproverId = null

    await prisma.approval.deleteMany({
      where: { reportId },
    })
  }

  await prisma.expenseReport.update({
    where: { id: reportId },
    data: updateData,
  })

  revalidatePath('/')
  revalidatePath(`/expenses/${reportId}`)
  revalidatePath('/expenses')
}

export async function submitExpenseReport(reportId: number) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('未登录')
  }

  const report = await getExpenseReportById(reportId)
  if (!report) {
    throw new Error('报销单不存在')
  }

  if (report.creatorId !== parseInt(user.id)) {
    throw new Error('无权提交此报销单')
  }

  if (report.status !== 'DRAFT' && report.status !== 'REJECTED') {
    throw new Error('当前状态不能提交报销单')
  }

  const departmentId = report.creator.departmentId
  if (!departmentId) {
    throw new Error('用户没有所属部门')
  }

  const departmentManager = await getDepartmentManager(departmentId)
  if (!departmentManager) {
    throw new Error('部门没有主管')
  }

  await prisma.approval.deleteMany({
    where: { reportId },
  })

  const financeUser = await getFinanceUser()

  await prisma.expenseReport.update({
    where: { id: reportId },
    data: {
      status: 'PENDING',
      submittedAt: new Date(),
      currentApproverId: departmentManager.id,
      approvals: {
        create: [
          {
            approverId: departmentManager.id,
            stepNumber: 1,
            role: 'MANAGER',
            status: 'PENDING',
          },
          ...(financeUser
            ? [
                {
                  approverId: financeUser.id,
                  stepNumber: 2,
                  role: 'FINANCE',
                  status: 'PENDING',
                },
              ]
            : []),
        ],
      },
    },
  })

  revalidatePath('/')
  revalidatePath(`/expenses/${reportId}`)
  revalidatePath('/expenses')
  revalidatePath('/approvals')
  redirect('/expenses')
}

export async function approveReport(reportId: number, comment?: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('未登录')
  }

  const report = await getExpenseReportById(reportId)
  if (!report) {
    throw new Error('报销单不存在')
  }

  if (report.status !== 'PENDING') {
    throw new Error('当前状态不能审批')
  }

  if (report.currentApproverId !== parseInt(user.id)) {
    throw new Error('还没轮到您审批')
  }

  const currentApproval = report.approvals.find(
    (a) => a.approverId === parseInt(user.id) && a.status === 'PENDING'
  )
  if (!currentApproval) {
    throw new Error('您已审批过此报销单')
  }

  const nextApproval = report.approvals.find(
    (a) => a.stepNumber > currentApproval.stepNumber && a.status === 'PENDING'
  )

  const isFinanceApproval = currentApproval.role === 'FINANCE'
  const departmentId = report.creator.departmentId

  if (isFinanceApproval && departmentId) {
    const yearMonth = getCurrentYearMonth()
    const budget = await getOrCreateDepartmentBudget(departmentId, yearMonth)
    const remainingBudget = budget.budgetAmount - budget.usedAmount
    if (remainingBudget < report.totalAmount) {
      throw new Error(
        `预算不足。${report.creator.department?.name || '该部门'}当月预算剩余 ${remainingBudget.toFixed(2)} 元，当前报销金额 ${report.totalAmount.toFixed(2)} 元`
      )
    }
  }

  if (nextApproval) {
    const operations: any[] = [
      prisma.approval.update({
        where: { id: currentApproval.id },
        data: {
          status: 'APPROVED',
          comment,
          approvedAt: new Date(),
        },
      }),
      prisma.expenseReport.update({
        where: { id: reportId },
        data: {
          currentApproverId: nextApproval.approverId,
        },
      }),
    ]

    if (isFinanceApproval && departmentId) {
      const yearMonth = getCurrentYearMonth()
      operations.push(
        prisma.departmentBudget.update({
          where: {
            departmentId_yearMonth: {
              departmentId,
              yearMonth,
            },
          },
          data: {
            usedAmount: {
              increment: report.totalAmount,
            },
          },
        }),
        prisma.budgetTransaction.create({
          data: {
            departmentBudget: {
              connect: {
                departmentId_yearMonth: {
                  departmentId,
                  yearMonth,
                },
              },
            },
            report: {
              connect: { id: reportId },
            },
            amount: report.totalAmount,
            type: 'DEDUCT',
            description: `财务审批通过，扣除报销单「${report.title}」预算`,
            operatorId: parseInt(user.id),
          },
        })
      )
    }

    await prisma.$transaction(operations)
  } else {
    const operations: any[] = [
      prisma.approval.update({
        where: { id: currentApproval.id },
        data: {
          status: 'APPROVED',
          comment,
          approvedAt: new Date(),
        },
      }),
      prisma.expenseReport.update({
        where: { id: reportId },
        data: {
          status: 'APPROVED',
          currentApproverId: null,
        },
      }),
    ]

    if (isFinanceApproval && departmentId) {
      const yearMonth = getCurrentYearMonth()
      operations.push(
        prisma.departmentBudget.update({
          where: {
            departmentId_yearMonth: {
              departmentId,
              yearMonth,
            },
          },
          data: {
            usedAmount: {
              increment: report.totalAmount,
            },
          },
        }),
        prisma.budgetTransaction.create({
          data: {
            departmentBudget: {
              connect: {
                departmentId_yearMonth: {
                  departmentId,
                  yearMonth,
                },
              },
            },
            report: {
              connect: { id: reportId },
            },
            amount: report.totalAmount,
            type: 'DEDUCT',
            description: `财务审批通过，扣除报销单「${report.title}」预算`,
            operatorId: parseInt(user.id),
          },
        })
      )
    }

    await prisma.$transaction(operations)
  }

  revalidatePath('/')
  revalidatePath(`/expenses/${reportId}`)
  revalidatePath('/expenses')
  revalidatePath('/approvals')
  redirect('/approvals')
}

export async function rejectReport(reportId: number, comment?: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('未登录')
  }

  const report = await getExpenseReportById(reportId)
  if (!report) {
    throw new Error('报销单不存在')
  }

  if (report.status !== 'PENDING') {
    throw new Error('当前状态不能审批')
  }

  if (report.currentApproverId !== parseInt(user.id)) {
    throw new Error('还没轮到您审批')
  }

  const currentApproval = report.approvals.find(
    (a) => a.approverId === parseInt(user.id) && a.status === 'PENDING'
  )
  if (!currentApproval) {
    throw new Error('您已审批过此报销单')
  }

  await prisma.$transaction([
    prisma.approval.update({
      where: { id: currentApproval.id },
      data: {
        status: 'REJECTED',
        comment,
        approvedAt: new Date(),
      },
    }),
    prisma.expenseReport.update({
      where: { id: reportId },
      data: {
        status: 'REJECTED',
        currentApproverId: null,
      },
    }),
  ])

  revalidatePath('/')
  revalidatePath(`/expenses/${reportId}`)
  revalidatePath('/expenses')
  revalidatePath('/approvals')
  redirect('/approvals')
}

export async function deleteExpenseReport(reportId: number) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('未登录')
  }

  const report = await getExpenseReportById(reportId)
  if (!report) {
    throw new Error('报销单不存在')
  }

  if (report.creatorId !== parseInt(user.id)) {
    throw new Error('无权删除此报销单')
  }

  if (report.status !== 'DRAFT') {
    throw new Error('只能删除草稿状态的报销单')
  }

  await prisma.expenseReport.delete({
    where: { id: reportId },
  })

  revalidatePath('/')
  revalidatePath('/expenses')
  redirect('/expenses')
}
