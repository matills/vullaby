import { Button } from "@/components/ui/button";
import { Bird, Calendar, Users, MessageSquare, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm fixed w-full top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bird className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Lina</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Características
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              Cómo Funciona
            </a>
            <Link to="/login">
              <Button variant="outline">Iniciar Sesión</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-6 rounded-full">
              <Bird className="h-20 w-20 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Gestiona tus turnos desde WhatsApp
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Lina hace que agendar y gestionar citas sea tan simple como enviar un mensaje. 
            Todo desde WhatsApp, sin apps complicadas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Comenzar Ahora
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">
            Todo lo que necesitas
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Gestión completa de turnos con la simplicidad de WhatsApp
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">WhatsApp Integrado</h3>
              <p className="text-muted-foreground">
                Tus clientes agendan directamente desde WhatsApp. Sin apps, sin complicaciones.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Calendario Inteligente</h3>
              <p className="text-muted-foreground">
                Gestiona horarios, disponibilidad y turnos desde un panel sencillo e intuitivo.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Recordatorios Automáticos</h3>
              <p className="text-muted-foreground">
                Reduce ausencias con recordatorios automáticos por WhatsApp antes de cada cita.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Multi-empleado</h3>
              <p className="text-muted-foreground">
                Gestiona múltiples empleados, sus horarios y servicios desde un solo lugar.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Seguro y Confiable</h3>
              <p className="text-muted-foreground">
                Tus datos están protegidos con los más altos estándares de seguridad.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Bird className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Rápido como una Paloma</h3>
              <p className="text-muted-foreground">
                Respuestas instantáneas y notificaciones en tiempo real para ti y tus clientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">
            Cómo Funciona
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Comienza en minutos, no en días
          </p>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Configura tu Negocio</h3>
                <p className="text-muted-foreground">
                  Registra tu información, empleados y servicios en minutos desde el panel de administración.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="bg-accent text-accent-foreground w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Conecta WhatsApp</h3>
                <p className="text-muted-foreground">
                  Vincula tu número de WhatsApp Business y comparte el contacto con tus clientes.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Tus Clientes Agendan</h3>
                <p className="text-muted-foreground">
                  Los clientes envían un mensaje a tu WhatsApp y Lina se encarga del resto automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-3xl">
          <Bird className="h-16 w-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">
            Listo para revolucionar tu gestión de turnos?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a cientos de negocios que ya confían en Lina
          </p>
          <Link to="/login">
            <Button size="lg" variant="secondary" className="text-lg">
              Comenzar Gratis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bird className="h-6 w-6 text-primary" />
            <span className="font-semibold text-foreground">Lina</span>
          </div>
          <p>© 2024 Lina. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
