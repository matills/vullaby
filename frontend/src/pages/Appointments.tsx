export default function Appointments() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Gestión de Turnos</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Lista de Turnos</h2>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              Nuevo Turno
            </button>
          </div>

          <p className="text-gray-500">No hay turnos registrados</p>
        </div>
      </div>
    </div>
  );
}
