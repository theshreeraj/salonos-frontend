import { useState } from 'react'
import { isoDate, rupees } from '../../utils/format'
import { useDesk } from '../desk/context'
import { STAFF_ROLES, payrollFor } from '../desk/logic'
import { Avatar, PageHeader, Stat } from '../ui'

export default function Payroll() {
  const desk = useDesk()
  const [month, setMonth] = useState(isoDate().slice(0, 7))
  const rows = payrollFor(desk, month)
  const sum = (key) => rows.reduce((n, r) => n + r[key], 0)
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <>
      <PageHeader title="Payroll" sub={`Salary plus commission on services billed in ${label}. Unpaid leave is deducted pro rata.`}>
        <input type="month" className="p-select" value={month} max={isoDate().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
      </PageHeader>

      <div className="p-stats">
        <Stat label="Total payout" value={rupees(sum('total'))} note={`${rows.length} active staff`} />
        <Stat label="Base salaries" value={rupees(rows.reduce((n, r) => n + r.staff.salary, 0))} />
        <Stat label="Commission" value={rupees(sum('commission'))} note={`on ${rupees(sum('serviceRevenue'))} of services`} />
        <Stat label="Deductions" value={rupees(sum('deduction'))} note="Unpaid leave" />
      </div>

      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th className="num">Base salary</th>
              <th className="num">Services billed</th>
              <th className="num">Commission</th>
              <th className="num">Days present</th>
              <th className="num">Leave days</th>
              <th className="num">Deductions</th>
              <th className="num">Total payout</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staff.id}>
                <td>
                  <span className="p-person">
                    <Avatar name={r.staff.name} color={r.staff.color} size={30} />
                    <span>
                      <strong>{r.staff.name}</strong>
                      <span className="muted small d-block">{STAFF_ROLES[r.staff.role]}</span>
                    </span>
                  </span>
                </td>
                <td className="num">{rupees(r.staff.salary)}</td>
                <td className="num">{r.serviceRevenue ? rupees(r.serviceRevenue) : '—'}</td>
                <td className="num">
                  {rupees(r.commission)}
                  {r.staff.commission > 0 && <span className="muted small d-block">{r.staff.commission}%</span>}
                </td>
                <td className="num">{r.daysPresent}</td>
                <td className="num">{r.leaveDays}</td>
                <td className="num">{r.deduction ? `−${rupees(r.deduction)}` : '—'}</td>
                <td className="num">
                  <strong>{rupees(r.total)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
