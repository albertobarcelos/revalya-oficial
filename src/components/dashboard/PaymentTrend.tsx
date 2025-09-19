import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface PaymentTrendData {
  mes: string;
  valor: number;
}

interface PaymentTrendProps {
  data: PaymentTrendData[];
}

export function PaymentTrend({ data }: PaymentTrendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência de Pagamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-72 md:h-80 lg:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="mes"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${formatCurrency(value)}`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Valor"]}
              />
              <Bar
                dataKey="valor"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="fill-primary"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
