import('../js/ui/arena.js').then(() => {
  console.log('SUCCESS: parsed arena.js without errors');
}).catch(err => {
  console.error('ERROR: failed to parse arena.js');
  console.error(err);
});
