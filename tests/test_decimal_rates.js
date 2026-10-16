// Smoke test for decimal hourly rates. Run: node tests/test_decimal_rates.js
// Extracts renderRates + helpers from app.js and runs them against a tiny fake DOM.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = src.indexOf('window.renderRates = function');
const end = src.indexOf('window.onload = function');
assert(start > -1 && end > start, 'could not locate rate functions in app.js');

class Opt { constructor() { this.value = ''; this.text = ''; } }
class Select {
    constructor() { this.options = []; this._value = ''; }
    set innerHTML(_) { this.options = []; this._value = ''; }
    appendChild(o) { this.options.push(o); if (this._value === '') this._value = o.value; }
    insertBefore(o, ref) { const i = ref ? this.options.indexOf(ref) : -1; i < 0 ? this.options.push(o) : this.options.splice(i, 0, o); }
    get value() { return this._value; }
    set value(v) { this._value = this.options.some(o => o.value === String(v)) ? String(v) : ''; }
}

function setup(settings) {
    const els = { hourlyRate: new Select(), bulkRateSelect: new Select() };
    const ctx = {
        appSettings: settings,
        getCurrencySymbol: () => '$',
        document: { getElementById: id => els[id], createElement: () => new Opt() },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(src.slice(start, end), ctx);
    return { ctx, els };
}

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }

test('whole-number range still works (default 17)', () => {
    const { ctx, els } = setup({ minRate: 15, maxRate: 20, customRates: '' });
    ctx.renderRates();
    assert.deepStrictEqual(els.hourlyRate.options.map(o => o.value), ['15', '16', '17', '18', '19', '20']);
    assert.strictEqual(els.hourlyRate.value, '17');
});

test('custom decimal city rates appear sorted with 2-decimal labels', () => {
    const { ctx, els } = setup({ minRate: 15, maxRate: 18, customRates: '16.90, 18.25' });
    ctx.renderRates();
    assert.deepStrictEqual(els.hourlyRate.options.map(o => o.value), ['15', '16', '16.9', '17', '18', '18.25']);
    assert.strictEqual(els.hourlyRate.options[2].text, '$16.90');
});

test('decimal min/max bounds are included', () => {
    const { ctx, els } = setup({ minRate: 15.5, maxRate: 17.75, customRates: '' });
    ctx.renderRates();
    assert.deepStrictEqual(els.hourlyRate.options.map(o => o.value), ['15.5', '16', '17', '17.75']);
});

test('editing an old record with an unlisted rate adds and selects it', () => {
    const { ctx, els } = setup({ minRate: 15, maxRate: 18, customRates: '' });
    ctx.renderRates();
    ctx.setRateValue(els.hourlyRate, 22.4);
    assert.strictEqual(els.hourlyRate.value, '22.4');
    assert.strictEqual(parseFloat(els.hourlyRate.value) * 8, 179.2);
});

test('selection survives a re-render', () => {
    const { ctx, els } = setup({ minRate: 15, maxRate: 18, customRates: '16.90' });
    ctx.renderRates();
    els.hourlyRate.value = '16.9';
    ctx.renderRates();
    assert.strictEqual(els.hourlyRate.value, '16.9');
});

test('garbage in custom rates is ignored', () => {
    const { ctx } = setup({});
    assert.deepStrictEqual([...ctx.parseCustomRates('16.90, abc, -3, , 18')], [16.9, 18]);
});

console.log(`\n${passed} tests passed`);
