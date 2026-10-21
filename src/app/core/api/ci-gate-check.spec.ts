// Solo per il collaudo del gate CI sul ramo ci/task008-negative-test.
// Questo ramo non deve essere integrato in main.
it('blocca la CI quando un test fallisce intenzionalmente', () => {
  expect(true).toBe(false);
});
