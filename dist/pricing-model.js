/* Agreed launch pricing. No subscriptions or billing are created here. */
(() => {
  'use strict';
  const plans = Object.freeze({
    free: Object.freeze({ name: 'Free', monthly: 0, yearly: 0, credits: 500, sites: 1 }),
    basic: Object.freeze({ name: 'Basic', monthly: 15, yearly: 120, credits: 1000, sites: 1 }),
    pro: Object.freeze({ name: 'Pro', monthly: 39, yearly: 360, credits: 3000, sites: 3 })
  });
  function quote(planId, cadence) {
    const id = Object.hasOwn(plans, planId) ? planId : 'free';
    const period = cadence === 'yearly' ? 'yearly' : 'monthly';
    const plan = plans[id];
    return Object.freeze({ ...plan, id, cadence: period, amount: period === 'yearly' ? plan.yearly : plan.monthly, monthlyEquivalent: period === 'yearly' ? plan.yearly / 12 : plan.monthly, annualSavings: plan.monthly * 12 - plan.yearly, signup: './auth.html#' + new URLSearchParams({ mode: 'signup', plan: id, billing: period }).toString() });
  }
  globalThis.DraftmangoPricing = Object.freeze({ quote });
})();
