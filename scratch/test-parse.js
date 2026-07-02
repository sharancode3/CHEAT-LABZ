import('../js/ui/home.js').then(() => {
  console.log('SUCCESS: parsed home.js without errors');
}).catch(err => {
  console.error('ERROR: failed to parse home.js');
  console.error(err);
});
