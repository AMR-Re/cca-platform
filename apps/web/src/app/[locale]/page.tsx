import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

export default function Home() {
  const t = useTranslations('app');

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('name')}</CardTitle>
          <CardDescription>{t('tagline')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Foundation phase: monorepo, design system, i18n (EN/AR + RTL), API
            conventions, and infrastructure are wired up. Business modules (students,
            activities, enrollments, attendance) come in the next phase.
          </p>
          <Button asChild>
            <Link href="/" locale="en">
              English
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/" locale="ar">
              العربية
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
