import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderModuleProps {
  title: string;
  description: string;
}

export default function PlaceholderModule({ title, description }: PlaceholderModuleProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Módulo en Desarrollo</CardTitle>
          <CardDescription>
            Este módulo estará disponible próximamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Construction className="h-16 w-16 mb-4 text-primary" />
            <p className="text-lg">En construcción</p>
            <p className="text-sm mt-2">Este módulo se implementará en las próximas iteraciones</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
