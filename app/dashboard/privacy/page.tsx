export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 lg:p-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Política de Privacidad
        </h1>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          {/* Introducción */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              1. Introducción
            </h2>
            <p className="leading-relaxed">
              Bienvenido a <span className="font-semibold text-blue-600 dark:text-blue-400">WorkShift Management System</span>. 
              Somos una empresa especializada en crear soluciones innovadoras para la gestión de recursos humanos, 
              control de asistencia y administración de turnos laborales. En WorkShift, nos comprometemos a proteger 
              y respetar su privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y 
              protegemos su información personal cuando utiliza nuestros servicios.
            </p>
          </section>

          {/* Información que recopilamos */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              2. Información que Recopilamos
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">
                  2.1 Información proporcionada por usted
                </h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Datos de registro: nombre, correo electrónico, número de teléfono</li>
                  <li>Información laboral: puesto, departamento, horarios de trabajo</li>
                  <li>Datos de asistencia: registros de entrada/salida, licencias, ausencias</li>
                  <li>Información de contacto de emergencia</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">
                  2.2 Información recopilada automáticamente
                </h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Datos de uso: interacciones con la plataforma, páginas visitadas</li>
                  <li>Información del dispositivo: tipo de dispositivo, sistema operativo, navegador</li>
                  <li>Dirección IP y datos de geolocalización (cuando sea necesario)</li>
                  <li>Cookies y tecnologías similares</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cómo usamos su información */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              3. Cómo Usamos su Información
            </h2>
            <p className="mb-3 leading-relaxed">Utilizamos la información recopilada para:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Proporcionar y mantener nuestros servicios de gestión laboral</li>
              <li>Procesar y gestionar registros de asistencia y horarios</li>
              <li>Generar reportes y análisis de productividad</li>
              <li>Comunicarnos con usted sobre actualizaciones y notificaciones importantes</li>
              <li>Mejorar la funcionalidad y experiencia de usuario de la plataforma</li>
              <li>Cumplir con obligaciones legales y regulatorias</li>
              <li>Prevenir fraudes y garantizar la seguridad del sistema</li>
            </ul>
          </section>

          {/* Compartir información */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              4. Compartir su Información
            </h2>
            <p className="mb-3 leading-relaxed">
              No vendemos su información personal. Podemos compartir sus datos en las siguientes circunstancias:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><span className="font-medium">Con su empleador:</span> para gestión de recursos humanos y nómina</li>
              <li><span className="font-medium">Proveedores de servicios:</span> que nos ayudan a operar nuestra plataforma</li>
              <li><span className="font-medium">Autoridades legales:</span> cuando sea requerido por ley</li>
              <li><span className="font-medium">Transacciones comerciales:</span> en caso de fusión, venta o adquisición</li>
            </ul>
          </section>

          {/* Seguridad */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              5. Seguridad de la Información
            </h2>
            <p className="leading-relaxed">
              Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger su información 
              contra acceso no autorizado, pérdida, destrucción o alteración. Esto incluye encriptación de datos, 
              controles de acceso, firewalls y auditorías de seguridad regulares. Sin embargo, ningún sistema es 
              completamente seguro, por lo que no podemos garantizar la seguridad absoluta de su información.
            </p>
          </section>

          {/* Retención de datos */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              6. Retención de Datos
            </h2>
            <p className="leading-relaxed">
              Conservamos su información personal durante el tiempo necesario para cumplir con los propósitos 
              descritos en esta política, a menos que la ley requiera o permita un período de retención más largo. 
              Los registros de asistencia y datos laborales se mantienen según los requisitos legales aplicables 
              en materia laboral y fiscal.
            </p>
          </section>

          {/* Sus derechos */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              7. Sus Derechos
            </h2>
            <p className="mb-3 leading-relaxed">Usted tiene derecho a:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Acceder a su información personal</li>
              <li>Corregir datos inexactos o incompletos</li>
              <li>Solicitar la eliminación de sus datos (sujeto a obligaciones legales)</li>
              <li>Oponerse al procesamiento de sus datos</li>
              <li>Solicitar la portabilidad de sus datos</li>
              <li>Retirar su consentimiento en cualquier momento</li>
            </ul>
            <p className="mt-4 leading-relaxed">
              Para ejercer estos derechos, contáctenos en{' '}
              <a href="mailto:privacy@workshift.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@workshift.com
              </a>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              8. Cookies y Tecnologías Similares
            </h2>
            <p className="leading-relaxed">
              Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el uso de la 
              plataforma y personalizar el contenido. Puede configurar su navegador para rechazar cookies, 
              aunque esto puede afectar la funcionalidad de algunos servicios.
            </p>
          </section>

          {/* Menores de edad */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              9. Menores de Edad
            </h2>
            <p className="leading-relaxed">
              Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos intencionalmente 
              información personal de menores. Si descubrimos que hemos recopilado datos de un menor, 
              tomaremos medidas para eliminar esa información.
            </p>
          </section>

          {/* Cambios a la política */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              10. Cambios a esta Política
            </h2>
            <p className="leading-relaxed">
              Podemos actualizar esta Política de Privacidad ocasionalmente. Le notificaremos sobre cambios 
              significativos publicando la nueva política en nuestra plataforma y actualizando la fecha de 
              "Última actualización". Le recomendamos revisar esta política periódicamente.
            </p>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              11. Contacto
            </h2>
            <p className="leading-relaxed mb-4">
              Si tiene preguntas sobre esta Política de Privacidad o sobre nuestras prácticas de privacidad, 
              puede contactarnos en:
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg space-y-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">WorkShift Management System</p>
              <p>Email: <a href="mailto:privacy@workshift.com" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@workshift.com</a></p>
              <p>Soporte: <a href="mailto:support@workshift.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@workshift.com</a></p>
              <p>Teléfono: +54 (299) 123-4567</p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 mt-8 border-t border-gray-300 dark:border-gray-600">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} WorkShift Management System. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}