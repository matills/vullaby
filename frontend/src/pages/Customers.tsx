export default function Customers() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Clientes</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Lista de Clientes</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar cliente..."
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <p className="text-gray-500">No hay clientes registrados</p>
        </div>
      </div>
    </div>
  );
}
