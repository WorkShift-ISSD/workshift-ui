import { Page } from '@playwright/test';

/**
 * Selecciona una fecha en el CustomDatePicker
 * @param page - La página de Playwright
 * @param inputId - El id del input del datepicker (ej: 'fecha-disponible-0')
 * @param dateStr - La fecha en formato 'YYYY-MM-DD'
 */
export async function selectDate(page: Page, inputId: string, dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);

    // Scroll al input antes de abrir para evitar calendarios fuera del viewport
    await page.locator(`#${inputId}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Abrir el calendario
    await page.locator(`#${inputId}`).click();

    // Esperar que aparezca el calendario
    await page.waitForTimeout(2000);

    // Navegar al mes/año correcto
    const targetDate = new Date(year, month - 1, 1);

    let attempts = 0;
    while (attempts < 24) {
        const calendarHeader = await page.locator('text=/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i').first().textContent({ timeout: 3000 }).catch(() => null);

        if (!calendarHeader) break;

        const yearText = await page.locator('text=/^20\\d\\d$/').first().textContent({ timeout: 3000 }).catch(() => null);

        if (!yearText) break;

        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const currentMonthIdx = monthNames.findIndex(m => calendarHeader.toLowerCase().includes(m));
        const currentYear = parseInt(yearText);

        if (currentMonthIdx === month - 1 && currentYear === year) break;

        const isAfter = currentYear > year || (currentYear === year && currentMonthIdx > month - 1);

        if (isAfter) {
            await page.locator('button svg.lucide-chevron-left').click();
        } else {
            await page.locator('button svg.lucide-chevron-right').click();
        }

        attempts++;
        await page.waitForTimeout(200);
    }

    // Hacer click en el día
    const dayButtons = page.locator('.grid.grid-cols-7 button:not([disabled])');
    const count = await dayButtons.count();

    for (let i = 0; i < count; i++) {
        const btn = dayButtons.nth(i);
        const text = await btn.locator('span').first().textContent();
        if (text?.trim() === String(day)) {
            await btn.dispatchEvent('click');
            break;
        }
    }

    // Esperar que se cierre el calendario
    await page.waitForTimeout(200);
}