import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const PIE_COLORS = ["#0f766e", "#f97316", "#0284c7", "#84cc16", "#ef4444", "#8b5cf6"];

export function DashboardCharts({ yearly = [], activities = [] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance per Tahun</CardTitle>
        </CardHeader>
        <CardContent>
          {yearly.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearly}>
                  <XAxis dataKey="tahun" stroke="currentColor" />
                  <YAxis allowDecimals={false} stroke="currentColor" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_maintenance" name="Maintenance" fill="#0284c7" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="Grafik tahunan belum tersedia"
              description="Tambahkan data maintenance atau ubah filter agar ringkasan tahunan muncul."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance per Jenis Kegiatan</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activities}
                    dataKey="total_maintenance"
                    nameKey="jenis_kegiatan"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                  >
                    {activities.map((entry, index) => (
                      <Cell key={entry.jenis_kegiatan} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="Grafik kegiatan belum tersedia"
              description="Belum ada data yang cocok dengan filter untuk divisualisasikan."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
