import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBusinessId, useEmployees } from "@/hooks";

const Employees = () => {
  const businessId = useBusinessId();
  const { data: employees, isLoading } = useEmployees(businessId);

  const formatSchedule = (employee: any) => {
    if (!employee.workingHours) return "No configurado";
    // Simplificar para mostrar
    return "Lun-Vie 9:00-18:00"; // TODO: parsear workingHours correctamente
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Empleados</h1>
          <p className="text-muted-foreground">Gestiona tu equipo de trabajo</p>
        </div>
        <Button>
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : !employees || employees.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No hay empleados registrados</div>
      ) : (
        <div className="grid gap-6">
          {employees.map((employee: any) => (
            <Card key={employee.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{employee.name}</CardTitle>
                      <CardDescription>{employee.specialty || "Sin especialidad"}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={employee.isActive ? "default" : "secondary"}>
                    {employee.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Horario:</span>
                    </div>
                    <p className="text-sm text-foreground">{formatSchedule(employee)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Servicios:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {employee.services ? (
                        employee.services.map((service: string, index: number) => (
                          <Badge key={index} variant="outline">
                            {service}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No especificado</span>
                      )}
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

export default Employees;
