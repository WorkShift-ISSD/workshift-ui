export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 lg:p-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Términos y Condiciones
        </h1>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          {/* Aceptación */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              1. Aceptación de los Términos
            </h2>
            <p className="leading-relaxed">
              Bienvenido a <span className="font-semibold text-blue-600 dark:text-blue-400">WorkShift Management System</span>. 
              Al acceder y utilizar nuestra plataforma de gestión de recursos humanos, usted acepta estar sujeto a estos 
              Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros 
              servicios. Estos términos constituyen un acuerdo legalmente vinculante entre usted y WorkShift Management System.
            </p>
          </section>

          {/* Definiciones */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              2. Definiciones
            </h2>
            <ul className="space-y-3">
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">"Plataforma"</span> se refiere al sistema 
                WorkShift Management System, incluyendo aplicaciones web, móviles y todas sus funcionalidades.
              </li>
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">"Usuario"</span> se refiere a cualquier 
                persona que acceda o utilice la Plataforma.
              </li>
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">"Cliente"</span> se refiere a la organización 
                o empresa que contrata nuestros servicios.
              </li>
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">"Servicios"</span> incluye gestión de turnos, 
                control de asistencia, administración de recursos humanos y todas las funcionalidades ofrecidas.
              </li>
            </ul>
          </section>

          {/* Servicios */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              3. Descripción de los Servicios
            </h2>
            <p className="mb-3 leading-relaxed">
              WorkShift proporciona una plataforma integral para la gestión de recursos humanos que incluye:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Sistema de control de asistencia y puntualidad</li>
              <li>Gestión y programación de turnos laborales</li>
              <li>Registro de licencias y ausencias</li>
              <li>Generación de reportes y análisis de productividad</li>
              <li>Administración de perfiles de empleados</li>
              <li>Sistema de notificaciones y alertas</li>
              <li>Panel de control administrativo</li>
            </ul>
            <p className="mt-4 leading-relaxed">
              Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto de los Servicios 
              en cualquier momento, con o sin previo aviso.
            </p>
          </section>

          {/* Registro y cuenta */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              4. Registro y Cuenta de Usuario
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">
                  4.1 Requisitos de Registro
                </h3>
                <p className="leading-relaxed">
                  Para utilizar nuestros servicios, debe registrarse y crear una cuenta proporcionando información 
                  precisa, actual y completa. Usted es responsable de mantener la confidencialidad de sus credenciales 
                  de acceso y de todas las actividades que ocurran bajo su cuenta.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">
                  4.2 Responsabilidades del Usuario
                </h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Mantener la seguridad de su contraseña y cuenta</li>
                  <li>Notificar inmediatamente sobre cualquier uso no autorizado</li>
                  <li>Proporcionar información verídica y actualizada</li>
                  <li>No compartir credenciales con terceros</li>
                  <li>Cumplir con todas las leyes aplicables</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Uso aceptable */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              5. Uso Aceptable de la Plataforma
            </h2>
            <p className="mb-3 leading-relaxed">Usted acepta NO utilizar la Plataforma para:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Violar leyes, regulaciones o derechos de terceros</li>
              <li>Transmitir contenido ilegal, ofensivo, difamatorio o inapropiado</li>
              <li>Realizar actividades fraudulentas o engañosas</li>
              <li>Intentar acceder a sistemas sin autorización</li>
              <li>Distribuir virus, malware o código malicioso</li>
              <li>Interferir con el funcionamiento de la Plataforma</li>
              <li>Realizar ingeniería inversa o copiar funcionalidades</li>
              <li>Utilizar la Plataforma para competir con WorkShift</li>
            </ul>
          </section>

          {/* Propiedad intelectual */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              6. Propiedad Intelectual
            </h2>
            <p className="leading-relaxed mb-4">
              Todo el contenido, características y funcionalidades de la Plataforma, incluyendo pero no limitado a 
              texto, gráficos, logotipos, iconos, imágenes, clips de audio, descargas digitales, compilaciones de datos 
              y software, son propiedad de WorkShift Management System o sus licenciantes y están protegidos por 
              leyes de propiedad intelectual.
            </p>
            <p className="leading-relaxed">
              Se le otorga una licencia limitada, no exclusiva, no transferible y revocable para acceder y utilizar 
              la Plataforma únicamente para sus propósitos comerciales internos legítimos.
            </p>
          </section>

          {/* Datos del usuario */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              7. Datos del Usuario
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">
                  7.1 Propiedad de los Datos
                </h3>
                <p className="leading-relaxed">
                  Usted mantiene todos los derechos de propiedad sobre los datos que ingresa en la Plataforma. 
                  Nos otorga una licencia para procesar, almacenar y utilizar estos datos únicamente con el 
                  propósito de proporcionarle los Servicios.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">
                  7.2 Respaldo y Seguridad
                </h3>
                <p className="leading-relaxed">
                  Realizamos respaldos regulares de sus datos, pero usted es responsable de mantener copias 
                  de seguridad adicionales. No garantizamos que los datos estarán libres de pérdida, 
                  alteración o destrucción.
                </p>
              </div>
            </div>
          </section>

          {/* Pagos y facturación */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              8. Pagos y Facturación
            </h2>
            <div className="space-y-4">
              <p className="leading-relaxed">
                Los Clientes aceptan pagar todas las tarifas asociadas con su plan de suscripción según los 
                términos acordados en el contrato de servicio.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Los pagos se procesan mensual o anualmente según el plan seleccionado</li>
                <li>Las tarifas no son reembolsables excepto según lo requiera la ley</li>
                <li>Nos reservamos el derecho de modificar precios con 30 días de anticipación</li>
                <li>El no pago puede resultar en la suspensión o terminación del servicio</li>
                <li>Todos los precios están sujetos a impuestos aplicables</li>
              </ul>
            </div>
          </section>

          {/* Garantías */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              9. Garantías y Limitaciones
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">
                  9.1 Disponibilidad del Servicio
                </h3>
                <p className="leading-relaxed">
                  Nos esforzamos por mantener la Plataforma disponible 24/7, pero no garantizamos que el servicio 
                  será ininterrumpido, seguro o libre de errores. Podemos realizar mantenimiento programado con 
                  previo aviso cuando sea posible.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">
                  9.2 Descargo de Garantías
                </h3>
                <p className="leading-relaxed">
                  LA PLATAFORMA SE PROPORCIONA "TAL CUAL" Y "SEGÚN DISPONIBILIDAD". NO OFRECEMOS GARANTÍAS 
                  EXPRESAS O IMPLÍCITAS DE COMERCIABILIDAD, IDONEIDAD PARA UN PROPÓSITO PARTICULAR O 
                  NO INFRACCIÓN.
                </p>
              </div>
            </div>
          </section>

          {/* Limitación de responsabilidad */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              10. Limitación de Responsabilidad
            </h2>
            <p className="leading-relaxed mb-4">
              EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, WORKSHIFT MANAGEMENT SYSTEM NO SERÁ RESPONSABLE POR:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Daños indirectos, incidentales, especiales, consecuentes o punitivos</li>
              <li>Pérdida de beneficios, ingresos, datos, uso o goodwill</li>
              <li>Interrupciones del servicio o errores en la Plataforma</li>
              <li>Acciones de terceros o contenido de terceros</li>
              <li>Acceso no autorizado o alteración de datos</li>
            </ul>
            <p className="mt-4 leading-relaxed">
              Nuestra responsabilidad total no excederá el monto pagado por usted en los últimos 12 meses.
            </p>
          </section>

          {/* Indemnización */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              11. Indemnización
            </h2>
            <p className="leading-relaxed">
              Usted acepta indemnizar, defender y mantener indemne a WorkShift Management System, sus directores, 
              empleados y agentes de cualquier reclamo, demanda, pérdida, responsabilidad y gasto (incluyendo 
              honorarios de abogados) que surjan de: (a) su uso de la Plataforma; (b) violación de estos Términos; 
              (c) violación de derechos de terceros; o (d) cualquier contenido que proporcione.
            </p>
          </section>

          {/* Terminación */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              12. Terminación
            </h2>
            <div className="space-y-4">
              <p className="leading-relaxed">
                Podemos suspender o terminar su acceso a la Plataforma inmediatamente, sin previo aviso, por 
                cualquier motivo, incluyendo:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violación de estos Términos y Condiciones</li>
                <li>No pago de tarifas</li>
                <li>Conducta fraudulenta o ilegal</li>
                <li>Solicitud del Cliente de cancelar el servicio</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Usted puede terminar su cuenta en cualquier momento contactándonos. Al terminar, se 
                desactivará su acceso y se podrán eliminar sus datos según nuestra política de retención.
              </p>
            </div>
          </section>

          {/* Modificaciones */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              13. Modificaciones a los Términos
            </h2>
            <p className="leading-relaxed">
              Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. 
              Las modificaciones entrarán en vigor inmediatamente después de su publicación en la Plataforma. 
              Su uso continuado de los Servicios después de cualquier cambio constituye su aceptación de los 
              nuevos términos. Le notificaremos sobre cambios significativos por correo electrónico o mediante 
              un aviso destacado en la Plataforma.
            </p>
          </section>

          {/* Ley aplicable */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              14. Ley Aplicable y Jurisdicción
            </h2>
            <p className="leading-relaxed">
              Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República Argentina, 
              sin dar efecto a ningún principio de conflictos de ley. Cualquier disputa que surja en relación 
              con estos Términos estará sujeta a la jurisdicción exclusiva de los tribunales de Río Negro, Argentina.
            </p>
          </section>

          {/* Disposiciones generales */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              15. Disposiciones Generales
            </h2>
            <ul className="space-y-3">
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">Acuerdo Completo:</span> Estos 
                Términos constituyen el acuerdo completo entre usted y WorkShift.
              </li>
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">Renuncia:</span> Ninguna renuncia 
                a cualquier término se considerará una renuncia adicional o continua.
              </li>
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">Divisibilidad:</span> Si alguna 
                disposición es inválida, las demás permanecerán vigentes.
              </li>
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">Cesión:</span> No puede ceder 
                estos Términos sin nuestro consentimiento previo por escrito.
              </li>
              <li>
                <span className="font-medium text-gray-900 dark:text-gray-100">Fuerza Mayor:</span> No somos 
                responsables por incumplimientos causados por circunstancias fuera de nuestro control.
              </li>
            </ul>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              16. Contacto
            </h2>
            <p className="leading-relaxed mb-4">
              Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos:
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg space-y-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">WorkShift Management System</p>
              <p>Email: <a href="mailto:legal@workshift.com" className="text-blue-600 dark:text-blue-400 hover:underline">legal@workshift.com</a></p>
              <p>Soporte: <a href="mailto:support@workshift.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@workshift.com</a></p>
              <p>Teléfono: +54 (299) 123-4567</p>
              <p>Dirección: Cipolletti, Río Negro, Argentina</p>
            </div>
          </section>

          {/* Aceptación */}
          <section className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-600">
            <p className="leading-relaxed text-gray-800 dark:text-gray-200">
              <span className="font-semibold">AL UTILIZAR NUESTROS SERVICIOS, USTED RECONOCE QUE HA LEÍDO, 
              ENTENDIDO Y ACEPTA ESTAR SUJETO A ESTOS TÉRMINOS Y CONDICIONES.</span>
            </p>
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