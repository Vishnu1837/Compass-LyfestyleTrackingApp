import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { navItems } from "@/config/nav";

export default function DashboardPage() {
  const upcoming = navItems.filter((item) => !item.ready);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your fitness command center. Modules light up as you connect data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to Fitness Hub</CardTitle>
          <CardDescription>
            The foundation is live. Next up: connect Lyfta for strength
            training, then Strava for cardio.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Nothing logged yet — once data flows in, this dashboard will surface
          trends, streaks, and personal records.
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Coming soon
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href} className="opacity-70">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="size-4" />
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
