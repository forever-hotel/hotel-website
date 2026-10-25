import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function createQualityAudit({
  command,
  evaluate,
  until,
  directory,
}) {
  const axe = await readFile(
    new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const pages = [];
  await mkdir(directory, { recursive: true });
  async function audit(label, widths = [320, 768, 1440]) {
    for (const width of widths) {
      await command('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await command('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      await until(
        () => evaluate('document.readyState === "complete"'),
        `ready for ${label}`,
      );
      await evaluate('document.fonts.ready.then(() => true)');
      await evaluate(axe);
      const result = await evaluate(`(async () => {
          const results = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return { title: document.title, width: innerWidth, contentWidth: document.documentElement.scrollWidth,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          wideElements: [...document.querySelectorAll('body *')].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map((element) => element.tagName + '.' + element.className),
          violations: results.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })),
          incomplete: results.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })),
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          transition: getComputedStyle(document.querySelector('.button') || document.body).transitionDuration };
      })()`);
      pages.push({ label, ...result });
      await writeFile(
        join(directory, 'quality-results.json'),
        JSON.stringify({ pages }, null, 2),
      );
      const metrics = await command('Page.getLayoutMetrics');
      const screenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width,
          height: Math.min(metrics.cssContentSize.height, 16000),
          scale: 1,
        },
      });
      await writeFile(
        join(directory, `${label}-${width}.png`),
        Buffer.from(screenshot.data, 'base64'),
      );
    }
  }
  function verify() {
    const failures = pages.filter(
      (page) =>
        page.overflow ||
        page.violations.length ||
        !page.reducedMotion ||
        page.transition !== '0s',
    );
    assert.deepEqual(
      failures.map(({ label, width, overflow, violations }) => ({
        label,
        width,
        overflow,
        rules: violations.map((rule) => rule.id),
      })),
      [],
      'Responsive/accessibility failures; see quality-results.json',
    );
  }
  return { audit, verify, pages };
}
