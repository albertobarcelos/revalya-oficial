import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NotificationStat {
  data: string;
  enviadas: number;
  lidas: number;
  respondidas: number;
}

interface NotificationChartProps {
  data: NotificationStat[];
}

export function NotificationChart({ data }: NotificationChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho das Notificações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="data"
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
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="enviadas"
                stroke="#adfa1d"
                strokeWidth={2}
                name="Enviadas"
              />
              <Line
                type="monotone"
                dataKey="lidas"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Lidas"
              />
              <Line
                type="monotone"
                dataKey="respondidas"
                stroke="#f43f5e"
                strokeWidth={2}
                name="Respondidas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
