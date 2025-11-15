import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Messages = () => {
  const messages = [
    { 
      id: 1, 
      client: "Juan Pérez", 
      message: "Hola, quisiera agendar un turno para mañana",
      time: "10:30 AM",
      status: "sin leer"
    },
    { 
      id: 2, 
      client: "María García", 
      message: "Gracias por confirmar mi turno",
      time: "9:15 AM",
      status: "leído"
    },
    { 
      id: 3, 
      client: "Carlos López", 
      message: "Puedo cambiar mi turno de las 3pm?",
      time: "Ayer",
      status: "respondido"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mensajes</h1>
        <p className="text-muted-foreground">Conversaciones con tus clientes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin Leer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">87</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mensajes Recientes</CardTitle>
          <CardDescription>Últimas conversaciones con clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="bg-primary/10 p-3 rounded-full">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-foreground">{msg.client}</p>
                    <span className="text-sm text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                </div>
                <Badge variant={msg.status === "sin leer" ? "default" : "secondary"}>
                  {msg.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Send className="h-5 w-5" />
            <p className="text-sm">
              Los mensajes de WhatsApp aparecerán aquí cuando conectes tu cuenta
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Messages;
