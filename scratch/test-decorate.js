import('../js/games/solo/neon-serpent.js').then((module) => {
  const GameClass = window.GameClass;
  console.log('GameClass resolved:', typeof GameClass);
  const proto = GameClass.prototype;
  console.log('proto before decoration:', Object.keys(proto), typeof proto.start);
  
  proto.start = function() {};
  console.log('proto after decoration:', typeof proto.start);
}).catch(err => {
  console.error(err);
});
