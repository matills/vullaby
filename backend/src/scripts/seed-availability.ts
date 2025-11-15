import { supabase } from '../config/supabase';
import { logger } from '../config/logger';

/**
 * Script para poblar datos de disponibilidad de ejemplo
 * Ejecutar con: tsx src/scripts/seed-availability.ts
 */

async function seedAvailability() {
  try {
    logger.info('🌱 Iniciando seed de disponibilidad...');

    // 1. Obtener todos los empleados activos
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('is_active', true);

    if (employeeError) {
      throw employeeError;
    }

    if (!employees || employees.length === 0) {
      logger.warn('⚠️  No se encontraron empleados activos. Primero debes crear empleados.');
      return;
    }

    logger.info(`📋 Encontrados ${employees.length} empleados activos`);

    // 2. Para cada empleado, crear disponibilidad
    for (const employee of employees) {
      logger.info(`Procesando empleado: ${employee.name} (${employee.id})`);

      // Limpiar disponibilidad existente
      const { error: deleteError } = await supabase
        .from('availability')
        .delete()
        .eq('employee_id', employee.id);

      if (deleteError) {
        logger.error(`Error eliminando disponibilidad anterior:`, deleteError);
        continue;
      }

      // Crear disponibilidad para la semana
      const availabilityData = [
        // Lunes a Viernes - Mañana (9:00 - 13:00)
        { employee_id: employee.id, day_of_week: 1, start_time: '09:00:00', end_time: '13:00:00', slot_duration_minutes: 60 },
        { employee_id: employee.id, day_of_week: 2, start_time: '09:00:00', end_time: '13:00:00', slot_duration_minutes: 60 },
        { employee_id: employee.id, day_of_week: 3, start_time: '09:00:00', end_time: '13:00:00', slot_duration_minutes: 60 },
        { employee_id: employee.id, day_of_week: 4, start_time: '09:00:00', end_time: '13:00:00', slot_duration_minutes: 60 },
        { employee_id: employee.id, day_of_week: 5, start_time: '09:00:00', end_time: '13:00:00', slot_duration_minutes: 60 },

        // Lunes a Viernes - Tarde (15:00 - 19:00)
        { employee_id: employee.id, day_of_week: 1, start_time: '15:00:00', end_time: '19:00:00', slot_duration_minutes: 60 },
        { employee_id: employee.id, day_of_week: 2, start_time: '15:00:00', end_time: '19:00:00', slot_duration_minutes: 60 },
        { employee_id: employee.id, day_of_week: 3, start_time: '15:00:00', end_time: '19:00:00', slot_duration_minutes: 60 },
        { employee_id: employee.id, day_of_week: 4, start_time: '15:00:00', end_time: '19:00:00', slot_duration_minutes: 60 },
        { employee_id: employee.id, day_of_week: 5, start_time: '15:00:00', end_time: '19:00:00', slot_duration_minutes: 60 },

        // Sábado - Solo mañana (9:00 - 13:00)
        { employee_id: employee.id, day_of_week: 6, start_time: '09:00:00', end_time: '13:00:00', slot_duration_minutes: 60 },
      ];

      const { error: insertError } = await supabase
        .from('availability')
        .insert(availabilityData);

      if (insertError) {
        logger.error(`Error insertando disponibilidad para ${employee.name}:`, insertError);
        continue;
      }

      logger.info(`✅ Disponibilidad creada para ${employee.name}`);
    }

    // 3. Verificar resultado
    const { data: allAvailability, error: verifyError } = await supabase
      .from('availability')
      .select(`
        *,
        employees (name)
      `)
      .order('day_of_week', { ascending: true });

    if (verifyError) {
      throw verifyError;
    }

    logger.info(`\n📊 Resumen de disponibilidad creada:`);
    logger.info(`Total de registros: ${allAvailability?.length || 0}`);

    if (allAvailability && allAvailability.length > 0) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

      console.log('\n📅 Horarios configurados:');
      allAvailability.forEach((av: any) => {
        console.log(`  ${av.employees?.name} - ${dayNames[av.day_of_week]}: ${av.start_time.slice(0, 5)} - ${av.end_time.slice(0, 5)}`);
      });
    }

    logger.info('\n✅ Seed de disponibilidad completado exitosamente!');

  } catch (error) {
    logger.error('❌ Error en seed de disponibilidad:', error);
    throw error;
  }
}

// Ejecutar el script
seedAvailability()
  .then(() => {
    logger.info('Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script falló:', error);
    process.exit(1);
  });
