import { Bird, Calendar, Users, MessageSquare, Settings, LogOut } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem("businessUserId");
    localStorage.removeItem("businessId");
    toast({
      title: "Sesión cerrada",
      description: "Hasta pronto!",
    });
    navigate("/");
  };

  const navItems = [
    { path: "/dashboard", label: "Turnos", icon: Calendar },
    { path: "/dashboard/clients", label: "Clientes", icon: Users },
    { path: "/dashboard/employees", label: "Empleados", icon: Users },
    { path: "/dashboard/messages", label: "Mensajes", icon: MessageSquare },
    { path: "/dashboard/settings", label: "Configuración", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm fixed w-full top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bird className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Lina</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Sidebar + Main Content */}
      <div className="pt-16 flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 border-r border-border bg-card/30 min-h-[calc(100vh-4rem)] fixed">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
