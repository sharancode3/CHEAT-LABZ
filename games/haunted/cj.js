let display = document.getElementById('display');
let message = document.getElementById('message');
let blood = document.getElementById('blood');
let container = document.querySelector('.container');

function press(value) {
  display.value += value;
}

function clearDisplay() {
  display.value = '';
  message.innerText = '';
  blood.style.height = '0';
  container.style.transform = 'none';
}

function calculate() {
  try {
    let result = eval(display.value);
    display.value = result;
    checkResult(result);
  } catch {
    message.innerText = 'Invalid!';
  }
}

function checkResult(result) {
  let str = result.toString();

  // Secret Code
  if (str === '141206') {
    message.innerText = '🎉 You found the key to the next Halloween Party! 🎃';
    document.body.style.background = 'black';
    return;
  }

  // All digits same → explosion
  if (/^([0-9])\1+$/.test(str)) {
    message.innerText = '💥 YOU VIOLATED THE LAWS 💥 Happy Halloween from Dracula!';
    document.body.style.background = 'firebrick';
    setTimeout(() => { alert('💀 Calculator Destroyed! 💀'); clearDisplay(); }, 3000);
    return;
  }

  // Any digit appears 3+ times
  for (let i = 0; i < 10; i++) {
    let count = str.split(i).length - 1;
    if (count === 3) {
      message.innerText = '😈 Triple Digits! The calculator runs away!';
      container.style.transition = 'transform 1s';
      container.style.transform = 'translateX(100vw)';
      setTimeout(() => { container.style.transform = 'translateX(0)'; }, 10000);
      return;
    }
    if (count === 2) {
      message.innerText = '🩸 Double digits — Blood rain begins!';
      blood.style.height = '100%';
      setTimeout(() => { blood.style.height = '0'; }, 5000);
      return;
    }
  }

  message.innerText = '';
}
