import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useBusinessId, useCustomers } from "@/hooks";

const Clients = () => {
  const businessId = useBusinessId();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: customers, isLoading } = useCustomers(businessId, searchQuery);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tu base de clientes</p>
        </div>
        <Button>
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Cliente</CardTitle>
          <CardDescription>Encuentra clientes por nombre, teléfono o email</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : !customers || customers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No hay clientes registrados</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customers.map((client: any) => (
            <Card key={client.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">
                      {client.name || "Sin nombre"}
                    </h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {client.phone}
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {client.email}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="text-foreground font-medium">
                          {client.appointmentCount || 0}
                        </span> visitas
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
