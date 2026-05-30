import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';

async function scrollModalAlTop(page: Page) {
    await page.locator('.overflow-y-auto').first().evaluate(el => el.scrollTop = 0);
}

async function abrirFormularioCrear(page: Page) {
    await page.locator('button:has-text("Nuevo Empleado")').click();
    await expect(page.getByRole('heading', { name: 'Nuevo Empleado' })).toBeVisible({ timeout: 3000 });
}

async function completarObligatorios(
    page: Page,
    overrides: { nombre?: string; apellido?: string; legajo?: string; email?: string } = {}
) {
    const {
        nombre   = 'Ana',
        apellido = 'García',
        legajo   = '9001',
        email    = 'ana.garcia.e2e@wsms.com',
    } = overrides;

    const form = page.locator('form');
    await form.locator('input[placeholder="Ej: Juan"]').fill(nombre);
    await form.locator('input[placeholder="Ej: Pérez"]').fill(apellido);
    await form.locator('input[placeholder="Ej: 12345"]').fill(legajo);
    await form.locator('input[type="email"]').fill(email);
}

function uid(): string {
    return String(Date.now()).slice(-5);
}

async function crearEmpleado(page: Page, legajo: string, email: string) {
    await abrirFormularioCrear(page);
    await completarObligatorios(page, { legajo, email });
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("Crear Empleado")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Nuevo Empleado' })).not.toBeVisible({ timeout: 5000 });
}

test.describe('Registrar Empleado', () => {
    test.beforeEach(async ({ page }) => {
        await login(page, 'supervisor');
        await page.goto('/dashboard/personal');
        await page.waitForLoadState('networkidle');
    });

    // ── Camino normal ─────────────────────────────────────────────

    test('Registro exitoso de empleado', async ({ page }) => {
        const id = uid();

        await test.step('Abrir el formulario de nuevo empleado', async () => {
            await abrirFormularioCrear(page);
        });

        await test.step('Completar los datos obligatorios', async () => {
            await completarObligatorios(page, { legajo: id, email: `ana.garcia.${id}@wsms.com` });
        });

        await test.step('Confirmar la creación en el diálogo', async () => {
            page.once('dialog', dialog => dialog.accept());
            await page.locator('button:has-text("Crear Empleado")').click();
            await page.waitForLoadState('networkidle');
        });

        await test.step('Verificar que el empleado aparece en la lista', async () => {
            await expect(page.getByText('Ana').first()).toBeVisible({ timeout: 5000 });
        });
    });

    test('Cancelación del formulario no registra al empleado', async ({ page }) => {
        await test.step('Abrir el formulario y completar datos', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { legajo: '9002', email: 'cancelado@wsms.com' });
        });

        await test.step('Cerrar el formulario sin enviar', async () => {
            await page.getByLabel('Cerrar modal').click();
        });

        await test.step('Verificar que el modal se cerró y el empleado no fue registrado', async () => {
            await expect(page.getByRole('heading', { name: 'Nuevo Empleado' })).not.toBeVisible({ timeout: 3000 });
            await expect(page.getByText('cancelado@wsms.com')).not.toBeVisible();
        });
    });

    test('Cancelación del diálogo de confirmación no registra al empleado', async ({ page }) => {
        await test.step('Abrir el formulario y completar datos', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { legajo: '9003', email: 'noseregistra@wsms.com' });
        });

        await test.step('Enviar el formulario y cancelar el diálogo de confirmación', async () => {
            page.once('dialog', dialog => dialog.dismiss());
            await page.locator('button:has-text("Crear Empleado")').click();
        });

        await test.step('Verificar que el formulario sigue abierto y el empleado no fue registrado', async () => {
            await expect(page.getByRole('heading', { name: 'Nuevo Empleado' })).toBeVisible({ timeout: 3000 });
            await expect(page.getByText('noseregistra@wsms.com')).not.toBeVisible();
        });
    });

    // ── Validaciones de nombre y apellido ─────────────────────────

    test('Nombre con caracteres no permitidos muestra error', async ({ page }) => {
        await test.step('Abrir el formulario e ingresar nombre con números ("Ana123")', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { nombre: 'Ana123' });
        });

        await test.step('Enviar el formulario', async () => {
            await page.locator('button:has-text("Crear Empleado")').click();
            await scrollModalAlTop(page);
        });

        await test.step('Verificar mensaje de error de validación del nombre', async () => {
            await expect(page.getByText('El nombre solo puede contener letras')).toBeVisible({ timeout: 3000 });
        });
    });

    // ── Validaciones de legajo ────────────────────────────────────

    test('Legajo duplicado muestra error', async ({ page }) => {
        const id = uid();

        await test.step('Registrar un empleado con el legajo de referencia (condición previa)', async () => {
            await crearEmpleado(page, id, `legajounico.${id}@wsms.com`);
        });

        await test.step('Abrir nuevo formulario e ingresar el mismo legajo', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { legajo: id, email: `legajootro.${id}@wsms.com` });
        });

        await test.step('Enviar el formulario', async () => {
            await page.locator('button:has-text("Crear Empleado")').click();
            await scrollModalAlTop(page);
        });

        await test.step('Verificar mensaje de error de legajo duplicado', async () => {
            await expect(page.getByText('El legajo ya está asignado a otro empleado')).toBeVisible({ timeout: 3000 });
        });
    });

    // ── Validaciones de email ─────────────────────────────────────

    test('Email con formato inválido muestra error', async ({ page }) => {
        await test.step('Abrir el formulario e ingresar email sin arroba', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { legajo: uid(), email: 'emailsinArroba.com' });
        });

        await test.step('Enviar el formulario', async () => {
            await page.locator('button:has-text("Crear Empleado")').click();
            await scrollModalAlTop(page);
        });

        await test.step('Verificar mensaje de error de formato de email', async () => {
            await expect(page.getByText('El formato del email no es válido')).toBeVisible({ timeout: 3000 });
        });
    });

    test('Email duplicado muestra error', async ({ page }) => {
        const id = uid();
        const email = `emailunico.${id}@wsms.com`;

        await test.step('Registrar un empleado con el email de referencia (condición previa)', async () => {
            await crearEmpleado(page, id, email);
        });

        await test.step('Abrir nuevo formulario e ingresar el mismo email', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { legajo: `${id}1`, email });
        });

        await test.step('Enviar el formulario', async () => {
            await page.locator('button:has-text("Crear Empleado")').click();
            await scrollModalAlTop(page);
        });

        await test.step('Verificar mensaje de error de email duplicado', async () => {
            await expect(page.getByText('El email ya está registrado en otro empleado')).toBeVisible({ timeout: 3000 });
        });
    });

    // ── Validaciones de fecha de nacimiento ──────────────────────

    test('Fecha de nacimiento futura muestra error', async ({ page }) => {
        await test.step('Abrir el formulario e ingresar fecha futura (01/01/2030)', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { legajo: uid() });
            await page.locator('form').locator('input[type="date"]').first().fill('2030-01-01');
        });

        await test.step('Enviar el formulario', async () => {
            await page.locator('button:has-text("Crear Empleado")').click();
            await scrollModalAlTop(page);
        });

        await test.step('Verificar mensaje de error de fecha futura', async () => {
            await expect(page.getByText('La fecha de nacimiento no puede ser futura')).toBeVisible({ timeout: 3000 });
        });
    });

    test('Empleado menor de 18 años muestra error', async ({ page }) => {
        await test.step('Abrir el formulario e ingresar fecha de nacimiento de menor de edad (01/01/2009)', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { legajo: uid() });
            await page.locator('form').locator('input[type="date"]').first().fill('2009-01-01');
        });

        await test.step('Enviar el formulario', async () => {
            await page.locator('button:has-text("Crear Empleado")').click();
            await scrollModalAlTop(page);
        });

        await test.step('Verificar mensaje de error de edad mínima requerida', async () => {
            await expect(page.getByText('Debes ser mayor de 18 años')).toBeVisible({ timeout: 3000 });
        });
    });

    // ── Bugs conocidos ────────────────────────────────────────────

    test('Legajo negativo debe mostrar error', {
        annotation: [
            { type: 'Severidad', description: 'Alta' },
            { type: 'Prioridad', description: 'Alta' },
            { type: 'Descripción del bug', description: 'El sistema acepta legajos negativos sin mostrar error. Un número negativo no es un identificador válido y podría provocar inconsistencias en la base de datos.' },
        ],
    }, async ({ page }) => {
        await test.step('Abrir el formulario e ingresar legajo negativo (-5)', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { legajo: '-5', email: `bug01.${uid()}@wsms.com` });
        });

        await test.step('Enviar el formulario', async () => {
            await page.locator('button:has-text("Crear Empleado")').click();
            await scrollModalAlTop(page);
        });

        await test.step('Verificar que el sistema rechaza el legajo negativo', async () => {
            await expect(
                page.getByText('El legajo debe ser un número entero positivo')
            ).toBeVisible({ timeout: 3000 });
        });
    });

    test('Nombre con más de 50 caracteres debe mostrar error', {
        annotation: [
            { type: 'Severidad', description: 'Media' },
            { type: 'Prioridad', description: 'Media' },
            { type: 'Descripción del bug', description: 'El sistema acepta nombres y apellidos de más de 50 caracteres sin validar. La base de datos tiene un límite de 50 caracteres, lo que puede provocar un error al intentar guardar el registro.' },
        ],
    }, async ({ page }) => {
        const nombreLargo = 'Mariadelcarmenisabelcristinaalejandravalentinaxyz'; // 51 chars

        await test.step('Abrir el formulario e ingresar nombre de 51 caracteres', async () => {
            await abrirFormularioCrear(page);
            await completarObligatorios(page, { nombre: nombreLargo, legajo: uid(), email: `bug02.${uid()}@wsms.com` });
        });

        await test.step('Enviar el formulario', async () => {
            await page.locator('button:has-text("Crear Empleado")').click();
            await scrollModalAlTop(page);
        });

        await test.step('Verificar que el sistema rechaza nombres que superan los 50 caracteres', async () => {
            await expect(page.getByText(/50 caracteres/)).toBeVisible({ timeout: 3000 });
        });
    });

    test('Fecha de creación debe mostrarse en formato DD/MM/YYYY', {
        annotation: [
            { type: 'Severidad', description: 'Baja' },
            { type: 'Prioridad', description: 'Baja' },
            { type: 'Descripción del bug', description: 'El campo "Cuenta creada" muestra el timestamp completo del servidor en lugar de la fecha formateada. Por ejemplo: "27 20:08:22.359847/05/2026" en vez de "27/05/2026".' },
        ],
    }, async ({ page }) => {
        await test.step('Abrir el detalle del primer empleado', async () => {
            await page.locator('button[title="Ver detalles"]').first().click();
            await expect(page.getByText('Cuenta creada')).toBeVisible({ timeout: 3000 });
        });

        await test.step('Leer el valor del campo "Cuenta creada"', async () => {
            const fechaText = await page.evaluate(() => {
                const labels = document.querySelectorAll('p');
                for (const label of labels) {
                    if (label.textContent?.trim() === 'Cuenta creada') {
                        const parent = label.closest('div');
                        const valueEl = parent?.querySelectorAll('p')[1];
                        return valueEl?.textContent?.trim() ?? '';
                    }
                }
                return '';
            });

            await test.step('Verificar que el formato es DD/MM/YYYY', async () => {
                expect(fechaText).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
            });
        });
    });
});
