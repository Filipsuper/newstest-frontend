import test from "node:test";
import assert from "node:assert/strict";
import { pollCompanySnapshots, companyPriceCurrency, SNAPSHOT_POLL_MS } from "../app/utils/companyPriceUpdates.js";

test("trading currency wins over a company's reporting currency", () => {
    assert.equal(companyPriceCurrency({ tradingCurrency: "DKK", currency: "EUR" }, {}), "DKK");
    assert.equal(companyPriceCurrency({}, { currency: "NOK" }), "NOK");
    assert.equal(companyPriceCurrency({ currency: "SEK" }, null), "SEK");
    assert.equal(companyPriceCurrency({}, null), "SEK");
});

const settle = () => new Promise((resolve) => setImmediate(resolve));
function fixture(load = async () => ({ price: 12 })) {
    const doc = new EventTarget();
    doc.visibilityState = "visible";
    let time = 0, calls = 0, id = 0;
    const timers = new Map(), data = [], errors = [];
    const stop = pollCompanySnapshots({ document: doc, load: () => { calls++; return load(); },
        onData: (item) => data.push(item), onError: (error) => errors.push(error), now: () => time,
        schedule: (fn, ms) => { assert.equal(ms, SNAPSHOT_POLL_MS); timers.set(++id, fn); return id; },
        cancel: (key) => timers.delete(key) });
    return { doc, data, errors, timers, stop, calls: () => calls,
        next: async () => { time += SNAPSHOT_POLL_MS; const fn = timers.values().next().value; timers.clear(); await fn?.(); },
        visibility: (value) => { doc.visibilityState = value; doc.dispatchEvent(new Event("visibilitychange")); } };
}

test("initial request and five-minute polling stop when unmounted", async () => {
    const fx = fixture();
    await settle();
    assert.equal(fx.calls(), 1);
    await fx.next();
    assert.equal(fx.calls(), 2);
    fx.stop();
    assert.equal(fx.timers.size, 0);
    fx.visibility("visible");
    assert.equal(fx.calls(), 2);
});

test("hidden tabs skip network; returning catches up without overlapping requests", async () => {
    const fx = fixture();
    await settle();
    fx.visibility("hidden");
    await fx.next();
    assert.equal(fx.calls(), 1);
    fx.visibility("visible");
    fx.visibility("visible");
    await settle();
    assert.equal(fx.calls(), 2);
    fx.stop();
});

test("failed refresh keeps prior data and schedules a retry", async () => {
    let index = 0;
    const fx = fixture(async () => { if (index++) throw Error("offline"); return { price: 12 }; });
    await settle();
    await fx.next();
    assert.deepEqual(fx.data, [{ price: 12 }]);
    assert.equal(fx.errors.length, 1);
    assert.equal(fx.timers.size, 1);
    fx.stop();
});

test("late results after unmount cannot update the old company", async () => {
    let resolve;
    const fx = fixture(() => new Promise((done) => { resolve = done; }));
    fx.stop();
    resolve({ price: 12 });
    await settle();
    assert.deepEqual(fx.data, []);
    assert.equal(fx.timers.size, 0);
});
