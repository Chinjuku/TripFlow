import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trip-flow/ui/components/card';
import { Palette } from 'lucide-react';
import { ThemeToggle } from '@/components/feat/theme';

export function AppearanceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Palette className="text-primary h-5 w-5" strokeWidth={1.75} />
          Appearance
        </CardTitle>
        <CardDescription>Choose how TripFlow looks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-foreground text-sm font-medium">Theme</p>
            <p className="text-muted-foreground text-xs">
              Switches the entire app, including the login screen.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </CardContent>
    </Card>
  );
}
