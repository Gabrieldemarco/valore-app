import {
  AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { useTranslation } from 'react-i18next';

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
            <stop offset="0%" stopColor="#c5a880" stopOpacity={0.9} />
            <stop offset="50%" stopColor="#c5a880" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#c5a880" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="apptsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
        <YAxis yAxisId="revenue" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} dx={-4} />
        <YAxis yAxisId="appointments" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} dx={4} />
        <ReferenceLine yAxisId="revenue" y={avgRevenue} stroke="rgba(197,168,128,0.4)" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: t('staffDashboard.analyticsRevenueAxis') + ' avg', fill: '#9ca3af', fontSize: 10, position: 'right' }} />
        <Tooltip
          contentStyle={{ background: 'rgba(26,26,31,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(197,168,128,0.25)', borderRadius: 10, color: '#f4f4f5', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          formatter={(value: any, name: string, props: any) => {
            if (name === 'revenue') {
              return [`$${Number(value).toLocaleString()}`, t('staffDashboard.analyticsRevenueAxis')];
            }
            if (name === 'appointments') {
              return [`${value} ` + t('staffDashboard.analyticsAppointmentsAxis'), ''];
            }
            return [value, name];
          }}
          labelFormatter={(label: string) => label}
        />
        <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#c5a880" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: '#c5a880', stroke: '#1a1a1f', strokeWidth: 2, r: 4 }} activeDot={{ fill: '#c5a880', stroke: '#1a1a1f', strokeWidth: 2, r: 6 }} animationBegin={0} animationDuration={900} />
        <Line yAxisId="appointments" type="monotone" dataKey="appointments" stroke="#a78bfa" strokeWidth={2} fill="url(#apptsGrad)" dot={{ fill: '#a78bfa', stroke: '#1a1a1f', strokeWidth: 2, r: 3 }} activeDot={{ fill: '#a78bfa', stroke: '#1a1a1f', strokeWidth: 2, r: 5 }} animationBegin={200} animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
