import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bird, Building, Phone, Mail } from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Gestiona la configuración de tu negocio</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Negocio</CardTitle>
          <CardDescription>Actualiza los datos principales de tu empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">
              <Building className="h-4 w-4 inline mr-2" />
              Nombre del Negocio
            </Label>
            <Input id="business-name" placeholder="Mi Negocio" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="h-4 w-4 inline mr-2" />
              Teléfono
            </Label>
            <Input id="phone" placeholder="+54 11 1234-5678" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </Label>
            <Input id="email" type="email" placeholder="contacto@negocio.com" />
          </div>
          <Button>Guardar Cambios</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integración WhatsApp</CardTitle>
          <CardDescription>Conecta tu cuenta de WhatsApp Business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Bird className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium text-foreground">Estado: No Conectado</p>
                <p className="text-sm text-muted-foreground">
                  Conecta WhatsApp para recibir mensajes automáticamente
                </p>
              </div>
            </div>
          </div>
          <Button>Conectar WhatsApp</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horarios de Atención</CardTitle>
          <CardDescription>Define los horarios de tu negocio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm font-medium text-foreground">Lunes - Viernes</span>
              <Input placeholder="09:00" />
              <Input placeholder="18:00" />
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm font-medium text-foreground">Sábado</span>
              <Input placeholder="09:00" />
              <Input placeholder="14:00" />
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm font-medium text-foreground">Domingo</span>
              <Input placeholder="Cerrado" disabled />
              <Input placeholder="Cerrado" disabled />
            </div>
          </div>
          <Button className="mt-4">Guardar Horarios</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
