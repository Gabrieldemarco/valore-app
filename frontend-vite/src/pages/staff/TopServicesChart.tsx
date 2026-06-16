import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList,
} from 'recharts';
import { useTranslation } from 'react-i18next';

interface Props {
  data: { service: string; count: number; avg_price: number }[];
}

export default function TopServicesChart({ data }: Props) {
  const { t } = useTranslation();
  const totalCount = data.reduce((s, d) => s + d.count, 0);
  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count)) : 1;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" barCategoryGap={6} margin={{ top: 4, right: 40, left: -4, bottom: 0 }}>
        <defs>
          <linearGradient id="servicesGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.25} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.08)" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="service" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
        <Tooltip
          contentStyle={{ background: 'rgba(26,26,31,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(197,168,128,0.25)', borderRadius: 10, color: '#f4f4f5', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          formatter={(value: any, name: string, props: any) => {
            if (name === 'count') {
              const item = props.payload;
              const pct = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : '0';
              const totalRev = Math.round(item.count * item.avg_price).toLocaleString();
              return [
                `${value} ${t('staffDashboard.analyticsServiceCount')?.toLowerCase() || 'appts'} · ${pct}% · $${Math.round(item.avg_price).toLocaleString()}/prom · $${totalRev} total`,
                item.service,
              ];
            }
            return [value, name];
          }}
          labelFormatter={() => ''}
        />
        <Bar dataKey="count" fill="url(#servicesGrad)" radius={[0, 6, 6, 0]} maxBarSize={20} animationBegin={0} animationDuration={900}>
          {data.map((d, i) => {
            const opacity = 0.4 + 0.6 * (d.count / maxCount);
            return <Cell key={i} fill="url(#servicesGrad)" fillOpacity={opacity} />;
          })}
          <LabelList
            dataKey="count"
            position="right"
            fill="#9ca3af"
            fontSize={11}
            fontWeight={600}
            formatter={(value: number) => `${value} (${totalCount > 0 ? ((value / totalCount) * 100).toFixed(0) : 0}%)`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
