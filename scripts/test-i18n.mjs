import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { translate, translateCopy, translateServiceType, spanish } from '../lib/i18n.ts';
import { resourceSpanish } from '../lib/resource-translations.ts';
import { SERVICES, SERVICE_TYPES } from '../lib/services.ts';
import { HOUSEHOLD_SIZE_OPTIONS, DEVICE_COUNT_OPTIONS, USAGE_PROFILE_OPTIONS } from '../lib/plan-utils.ts';

test('guided options and service categories all have Spanish labels without changing values', () => {
  const options = [...HOUSEHOLD_SIZE_OPTIONS, ...DEVICE_COUNT_OPTIONS, ...USAGE_PROFILE_OPTIONS];
  for (const { label } of options) assert.ok(spanish[label], label);
  for (const type of SERVICE_TYPES) assert.ok(spanish[type], type);
  assert.equal(HOUSEHOLD_SIZE_OPTIONS[1].value, '2-3');
  assert.equal(USAGE_PROFILE_OPTIONS[0].value, 'basic');
});

test('every nonempty resource description has an exact Spanish translation', () => {
  for (const service of SERVICES) {
    if (service.description) assert.ok(resourceSpanish[service.description], `${service.name}: ${service.description}`);
  }
  assert.equal(resourceSpanish['A new, untranslated description'], undefined);
});

test('translations preserve interpolation variables and emergency numbers', () => {
  for (const [source, target] of Object.entries(spanish)) {
    const variables = text => [...text.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
    assert.deepEqual(variables(target), variables(source), source);
    assert.ok(!target.includes('—'), source);
  }
  const emergency = 'For emergencies, call 911 · Mental health crisis, call or text 988 · Social services, call 211';
  assert.deepEqual(translate('es', emergency).match(/\d+/g), ['911', '988', '211']);
});

test('confirmation templates preserve the exact address', () => {
  const address = '1700 Pinto Lane, Las Vegas, NV 89106';
  const copy = { key: 'Did you mean **{address}**?', values: { address } };
  assert.equal(translateCopy('es', copy), `¿Se refiere a **${address}**?`);
  assert.equal(translateCopy('en', copy), `Did you mean **${address}**?`);
});

test('answer templates translate presentation, not stable IDs', () => {
  assert.equal(translateCopy('es', { key: 'Household: {value}', values: { value: '2-3 people' } }), 'Hogar: 2-3 personas');
  assert.equal(translateServiceType('es', 'Digital Skills Training, Device Access Resources'), 'Capacitación en habilidades digitales, Acceso a dispositivos');
  assert.equal(translateCopy('es', { key: 'Here are the {type} resources near this address.', values: { type: 'Device Access Resources' } }), 'Estos son los recursos de acceso a dispositivos cerca de esta dirección.');
});

test('unknown locale catalog entries preserve original source text', () => {
  assert.equal(translate('es', 'Provider Name'), 'Provider Name');
  assert.equal(translate('es', 'Phone: {phone}', { phone: '(702) 123-4567' }), 'Teléfono: (702) 123-4567');
});

test('literal UI translation calls always have a catalog entry', () => {
  for (const filename of readdirSync(new URL('../components/chat/', import.meta.url)).filter(name => name.endsWith('.tsx'))) {
    const source = readFileSync(new URL(`../components/chat/${filename}`, import.meta.url), 'utf8');
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && ts.isStringLiteral(node.arguments[0])) {
        const key = node.arguments[0].text;
        if (key) assert.ok(spanish[key], `${filename}: ${key}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
});
