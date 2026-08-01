import {
  AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CHART_COLORS } from '../../styles/themeColors';

interface Props {
  data: { month: string; appointments: number; revenue: number }[];
}

export default function RevenueChart({ data }: Props) {
  const { t } = useTranslation();
  const formatted = data.map(d => ({
    ...d,
    label: d.month.slice(5) + '/' + d.month.slice(0, 4),
    revenue: Number(d.revenue),
  }));
  const avgRevenue = formatted.length > 0
    ? Math.round(formatted.reduce((s, d) => s + d.revenue, 0) / formatted.length)
    : 0;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.revenue} stopOpacity={0.9} />
            <stop offset="50%" stopColor={CHART_COLORS.revenue} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHART_COLORS.revenue} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="apptsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.appointments} stopOpacity={0.9} />
            <stop offset="50%" stopColor={CHART_COLORS.appointments} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHART_COLORS.appointments} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dy={6} />
        <YAxis yAxisId="revenue" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dx={-4} />
        <YAxis yAxisId="appointments" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dx={4} />
        <ReferenceLine yAxisId="revenue" y={avgRevenue} stroke={CHART_COLORS.revenue + '66'} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: t('staffDashboard.analyticsRevenueAxis') + ' avg', fill: 'var(--text-muted)', fontSize: 11, position: 'right' }} />
        <Tooltip
          contentStyle={{ background: 'rgba(26,26,31,0.95)', backdropFilter: 'blur(8px)', border: `1px solid ${CHART_COLORS.revenue}40`, borderRadius: 10, color: 'var(--text-main)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          formatter={(value, name) => {
            if (name === 'revenue') {
              return [`$${Number(value).toLocaleString()}`, t('staffDashboard.analyticsRevenueAxis')];
            }
            if (name === 'appointments') {
              return [`${value} ` + t('staffDashboard.analyticsAppointmentsAxis'), ''];
            }
            return [value, name];
          }}
          labelFormatter={(label: ReactNode) => label}
        />
        <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: CHART_COLORS.revenue, stroke: 'var(--bg-deep)', strokeWidth: 2, r: 4 }} activeDot={{ fill: CHART_COLORS.revenue, stroke: 'var(--bg-deep)', strokeWidth: 2, r: 6 }} animationBegin={0} animationDuration={900} />
        <Line yAxisId="appointments" type="monotone" dataKey="appointments" stroke={CHART_COLORS.appointments} strokeWidth={2} fill="url(#apptsGrad)" dot={{ fill: CHART_COLORS.appointments, stroke: 'var(--bg-deep)', strokeWidth: 2, r: 3 }} activeDot={{ fill: CHART_COLORS.appointments, stroke: 'var(--bg-deep)', strokeWidth: 2, r: 5 }} animationBegin={200} animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
