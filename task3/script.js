/* =============================================================
   SCIENTIFIC CALCULATOR – script.js
   Features:
   - Full Expression Engine with Shunting-Yard / Recursive Descent
   - Trigonometry (sin, cos, tan, sin⁻¹, cos⁻¹, tan⁻¹)
   - DEG / RAD Angle Modes with precision cleanups (e.g. cos 90° = 0)
   - Logarithms (log10, ln), Powers (x², xʸ, 10ˣ, eˣ), Roots (√, ∛)
   - Factorial (n!), Reciprocal (1/x), Negation (+/-), Percentage (%)
   - Constants (π, e), Parentheses ( ) with auto-close & implicit multiplication
   - Keyboard bindings & tactile visual feedback
   ============================================================= */

'use strict';

/* ── DOM Elements ─────────────────────────────────────────── */
const displayEl    = document.getElementById('display');
const expressionEl = document.getElementById('expression');
const degRadToggle = document.getElementById('deg-rad-toggle');
const keypad       = document.querySelector('.keypad');

/* ── Calculator State ─────────────────────────────────────── */
const state = {
  expression:    '',      // The full expression string shown
  currentInput:  '0',     // The current number / token being entered
  lastResult:    null,    // Result of the last calculation
  angleMode:     'DEG',   // 'DEG' or 'RAD'
  justCalculated:false,   // True immediately after '='
  isNewOperand:  false,   // True after an operator or function to start a new number display
  isError:       false    // True when showing an error message
};

/* ── Angle Mode Toggle ────────────────────────────────────── */
function toggleAngleMode() {
  state.angleMode = state.angleMode === 'DEG' ? 'RAD' : 'DEG';
  degRadToggle.textContent = state.angleMode;
  degRadToggle.setAttribute('aria-label', `Angle mode set to ${state.angleMode}. Click to toggle.`);
}

/* ── Display Formatting ───────────────────────────────────── */
function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return 'Error';
  if (!isFinite(num)) return 'Math Error';

  // Handle small floating-point rounding errors
  if (Math.abs(num) < 1e-14 && Math.abs(num) > 0) return '0';

  // Format to reasonable precision (up to 10 significant digits)
  const precision = 10;
  const str = parseFloat(num.toPrecision(precision)).toString();

  // If extremely large or tiny, use exponential notation
  if (str.length > 12 && !str.includes('e')) {
    return num.toExponential(5);
  }
  return str;
}

function updateDisplay(pop = false) {
  if (state.isError) {
    displayEl.classList.add('error');
    displayEl.textContent = state.currentInput;
    expressionEl.textContent = state.expression;
    return;
  }

  displayEl.classList.remove('error');
  displayEl.textContent = state.currentInput;
  expressionEl.textContent = state.expression;

  // Auto-scroll expression to the end so current typing is visible
  expressionEl.scrollLeft = expressionEl.scrollWidth;

  if (pop) {
    displayEl.classList.remove('pop');
    void displayEl.offsetWidth; // force reflow
    displayEl.classList.add('pop');
  }
}

/* ── Math Functions with Degree/Radian Handling ───────────── */
function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

const MathOps = {
  sin: (x) => {
    if (state.angleMode === 'DEG') {
      const normalized = ((x % 360) + 360) % 360;
      if (normalized === 0 || normalized === 180) return 0;
      if (normalized === 90) return 1;
      if (normalized === 270) return -1;
      return Math.sin(toRadians(x));
    }
    return Math.sin(x);
  },

  cos: (x) => {
    if (state.angleMode === 'DEG') {
      const normalized = ((x % 360) + 360) % 360;
      if (normalized === 90 || normalized === 270) return 0;
      if (normalized === 0) return 1;
      if (normalized === 180) return -1;
      return Math.cos(toRadians(x));
    }
    return Math.cos(x);
  },

  tan: (x) => {
    if (state.angleMode === 'DEG') {
      const normalized = ((x % 180) + 180) % 180;
      if (normalized === 90) throw new Error('Undefined');
      if (normalized === 0) return 0;
      if (normalized === 45) return 1;
      if (normalized === 135) return -1;
      return Math.tan(toRadians(x));
    }
    const rem = Math.abs(x % Math.PI);
    if (Math.abs(rem - Math.PI / 2) < 1e-12) throw new Error('Undefined');
    return Math.tan(x);
  },

  asin: (x) => {
    if (x < -1 || x > 1) throw new Error('Invalid Input');
    const rad = Math.asin(x);
    return state.angleMode === 'DEG' ? toDegrees(rad) : rad;
  },

  acos: (x) => {
    if (x < -1 || x > 1) throw new Error('Invalid Input');
    const rad = Math.acos(x);
    return state.angleMode === 'DEG' ? toDegrees(rad) : rad;
  },

  atan: (x) => {
    const rad = Math.atan(x);
    return state.angleMode === 'DEG' ? toDegrees(rad) : rad;
  },

  log: (x) => {
    if (x <= 0) throw new Error('Invalid Input');
    return Math.log10(x);
  },

  ln: (x) => {
    if (x <= 0) throw new Error('Invalid Input');
    return Math.log(x);
  },

  sqrt: (x) => {
    if (x < 0) throw new Error('Invalid Input');
    return Math.sqrt(x);
  },

  cbrt: (x) => Math.cbrt(x),

  fact: (n) => {
    if (n < 0 || !Number.isInteger(n)) throw new Error('Invalid Input');
    if (n > 170) throw new Error('Overflow');
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }
};

/* ── Expression Tokenizer & Parser ────────────────────────── */

/**
 * Tokenize human expression into tokens:
 * Supports: numbers, identifiers/functions, constants, operators, parentheses.
 */
function tokenize(expr) {
  // Normalize symbols
  let s = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, ' ' + Math.PI + ' ')
    .replace(/\be\b/g, ' ' + Math.E + ' ')
    .replace(/sin⁻¹/g, 'asin')
    .replace(/cos⁻¹/g, 'acos')
    .replace(/tan⁻¹/g, 'atan');

  const tokens = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number (including decimals)
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < s.length && /[0-9.]/.test(s[i])) {
        numStr += s[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    // Functions / Identifiers
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) {
        ident += s[i];
        i++;
      }
      tokens.push({ type: 'IDENT', value: ident });
      continue;
    }

    // Operators and Parentheses
    if (['+', '-', '*', '/', '^', '%', '!', '(', ')'].includes(ch)) {
      tokens.push({ type: ch, value: ch });
      i++;
      continue;
    }

    // Cube root symbol '∛'
    if (ch === '∛') {
      tokens.push({ type: 'IDENT', value: 'cbrt' });
      i++;
      continue;
    }

    // Square root symbol '√'
    if (ch === '√') {
      tokens.push({ type: 'IDENT', value: 'sqrt' });
      i++;
      continue;
    }

    i++;
  }

  // Insert implicit multiplication:
  // e.g., 2(3) -> 2*(3), (2)(3) -> (2)*(3), 2sin(30) -> 2*sin(30)
  const result = [];
  for (let j = 0; j < tokens.length; j++) {
    const curr = tokens[j];
    const prev = tokens[j - 1];

    if (prev) {
      const prevCanMultiply =
        prev.type === 'NUMBER' ||
        prev.type === ')' ||
        prev.type === '!';

      const currCanMultiply =
        curr.type === 'NUMBER' ||
        curr.type === '(' ||
        curr.type === 'IDENT';

      if (prevCanMultiply && currCanMultiply) {
        result.push({ type: '*', value: '*' });
      }
    }
    result.push(curr);
  }

  return result;
}

/**
 * Recursive Descent Parser & Evaluator
 * Grammar:
 * Expression    ::= Additive
 * Additive      ::= Multiplicative (('+' | '-') Multiplicative)*
 * Multiplicative::= Power (('*' | '/' | '%') Power)*
 * Power         ::= Unary ('^' Power)?
 * Unary         ::= ('-' | '+') Unary | Postfix
 * Postfix       ::= Primary ('!')*
 * Primary       ::= NUMBER | IDENT '(' Expression ')' | '(' Expression ')'
 */
function evaluateTokens(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos] || null;
  }

  function consume(expectedType) {
    const token = tokens[pos];
    if (!token) throw new Error('Unexpected end of expression');
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected token ${expectedType} but found ${token.type}`);
    }
    pos++;
    return token;
  }

  function parseExpression() {
    return parseAdditive();
  }

  function parseAdditive() {
    let val = parseMultiplicative();

    while (peek() && (peek().type === '+' || peek().type === '-')) {
      const op = consume().type;
      const right = parseMultiplicative();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  function parseMultiplicative() {
    let val = parsePower();

    while (peek() && (peek().type === '*' || peek().type === '/' || peek().type === '%')) {
      const op = consume().type;
      const right = parsePower();
      if (op === '*') {
        val = val * right;
      } else if (op === '/') {
        if (right === 0) throw new Error('Cannot ÷ 0');
        val = val / right;
      } else if (op === '%') {
        val = val * (right / 100);
      }
    }
    return val;
  }

  function parsePower() {
    let val = parseUnary();

    if (peek() && peek().type === '^') {
      consume('^');
      // Power is right-associative: 2^3^2 = 2^(3^2)
      const right = parsePower();
      val = Math.pow(val, right);
    }
    return val;
  }

  function parseUnary() {
    if (peek() && (peek().type === '-' || peek().type === '+')) {
      const op = consume().type;
      const operand = parseUnary();
      return op === '-' ? -operand : operand;
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let val = parsePrimary();

    while (peek() && peek().type === '!') {
      consume('!');
      val = MathOps.fact(val);
    }
    return val;
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('Incomplete expression');

    // Number
    if (token.type === 'NUMBER') {
      consume('NUMBER');
      return token.value;
    }

    // Function call: IDENT '(' Expression ')'
    if (token.type === 'IDENT') {
      const fnName = consume('IDENT').value;
      if (!MathOps[fnName]) throw new Error(`Unknown function: ${fnName}`);

      if (peek() && peek().type === '(') {
        consume('(');
        const arg = parseExpression();
        if (peek() && peek().type === ')') {
          consume(')');
        }
        return MathOps[fnName](arg);
      }
      throw new Error(`Expected '(' after ${fnName}`);
    }

    // Parenthesized expression: '(' Expression ')'
    if (token.type === '(') {
      consume('(');
      const val = parseExpression();
      if (peek() && peek().type === ')') {
        consume(')');
      }
      return val;
    }

    throw new Error('Invalid syntax');
  }

  const result = parseExpression();

  if (pos < tokens.length) {
    throw new Error('Unexpected extra tokens');
  }

  return result;
}

/**
 * Top-level calculation handler
 */
function calculateExpression(rawExpr) {
  if (!rawExpr || rawExpr.trim() === '') return 0;

  // Auto-close missing right parentheses
  let openCount = 0;
  for (const ch of rawExpr) {
    if (ch === '(') openCount++;
    if (ch === ')') openCount--;
  }
  let completedExpr = rawExpr;
  while (openCount > 0) {
    completedExpr += ')';
    openCount--;
  }

  const tokens = tokenize(completedExpr);
  if (tokens.length === 0) return 0;

  return evaluateTokens(tokens);
}

/* ── Keypad Action Handlers ───────────────────────────────── */

function handleDigit(digit) {
  if (state.justCalculated || state.isError) {
    state.expression = '';
    state.currentInput = digit;
    state.justCalculated = false;
    state.isError = false;
    state.isNewOperand = false;
  } else if (state.isNewOperand) {
    state.currentInput = digit;
    state.isNewOperand = false;
  } else {
    if (state.currentInput === '0') {
      state.currentInput = digit;
    } else {
      state.currentInput += digit;
    }
  }

  if (state.expression === '0') {
    state.expression = digit;
  } else {
    state.expression += digit;
  }
  updateDisplay(true);
}

function handleDecimal() {
  if (state.justCalculated || state.isError) {
    state.expression = '0.';
    state.currentInput = '0.';
    state.justCalculated = false;
    state.isError = false;
    state.isNewOperand = false;
    updateDisplay(true);
    return;
  }

  // Prevent duplicate decimals in the current continuous number sequence
  const parts = state.expression.split(/[^0-9.]/);
  const currentPart = parts[parts.length - 1];
  if (currentPart.includes('.')) return;

  if (currentPart === '' || state.isNewOperand) {
    state.expression += '0.';
    state.currentInput = '0.';
    state.isNewOperand = false;
  } else {
    state.expression += '.';
    state.currentInput += '.';
  }
  updateDisplay(true);
}

function handleOperator(opSymbol) {
  if (state.isError) {
    handleClear();
  }

  if (state.justCalculated && state.lastResult !== null) {
    state.expression = String(formatNumber(state.lastResult)) + ' ' + opSymbol + ' ';
    state.currentInput = opSymbol;
    state.justCalculated = false;
    state.isNewOperand = true;
    updateDisplay();
    return;
  }

  // If empty, start with 0
  if (!state.expression) {
    state.expression = '0 ' + opSymbol + ' ';
    state.currentInput = opSymbol;
    state.isNewOperand = true;
    updateDisplay();
    return;
  }

  // Replace previous trailing operator if consecutive
  const trimmed = state.expression.trimEnd();
  const lastChar = trimmed.slice(-1);
  if (['+', '−', '×', '÷'].includes(lastChar)) {
    state.expression = trimmed.slice(0, -1) + opSymbol + ' ';
  } else {
    state.expression += ' ' + opSymbol + ' ';
  }

  state.currentInput = opSymbol;
  state.justCalculated = false;
  state.isNewOperand = true;
  updateDisplay();
}

function handleFunction(fnName, displaySymbol) {
  if (state.justCalculated || state.isError) {
    state.expression = '';
    state.justCalculated = false;
    state.isError = false;
  }

  const prefix = displaySymbol || fnName;
  state.expression += prefix + '(';
  state.currentInput = prefix + '(';
  state.isNewOperand = true;
  updateDisplay(true);
}

function handleConstant(constSymbol, constValue) {
  if (state.justCalculated || state.isError) {
    state.expression = '';
    state.justCalculated = false;
    state.isError = false;
  }

  state.expression += constSymbol;
  state.currentInput = String(formatNumber(constValue));
  updateDisplay(true);
}

function handleParenthesis(paren) {
  if (state.isError) handleClear();

  if (paren === '(' && state.justCalculated) {
    state.expression = '';
    state.justCalculated = false;
  }

  state.expression += paren;
  state.currentInput = paren;
  state.justCalculated = false;
  updateDisplay();
}

function handleFactorial() {
  if (state.isError) return;
  if (!state.expression) state.expression = '0';
  state.expression += '!';
  state.currentInput = '!';
  state.justCalculated = false;
  updateDisplay(true);
}

function handleReciprocal() {
  if (state.isError) return;
  if (state.justCalculated && state.lastResult !== null) {
    state.expression = `(${formatNumber(state.lastResult)})^(-1)`;
    state.justCalculated = false;
  } else if (!state.expression) {
    state.expression = '(0)^(-1)';
  } else {
    state.expression += '^(-1)';
  }
  state.currentInput = '^(-1)';
  updateDisplay(true);
}

function handleSquare() {
  if (state.isError) return;
  if (state.justCalculated && state.lastResult !== null) {
    state.expression = `(${formatNumber(state.lastResult)})^(2)`;
    state.justCalculated = false;
  } else {
    state.expression += '^(2)';
  }
  state.currentInput = '^(2)';
  updateDisplay(true);
}

function handlePower() {
  if (state.isError) return;
  if (state.justCalculated && state.lastResult !== null) {
    state.expression = String(formatNumber(state.lastResult)) + '^(';
    state.justCalculated = false;
  } else {
    state.expression += '^(';
  }
  state.currentInput = '^(';
  updateDisplay();
}

function handlePow10() {
  if (state.justCalculated || state.isError) {
    state.expression = '';
    state.justCalculated = false;
    state.isError = false;
  }
  state.expression += '10^(';
  state.currentInput = '10^(';
  updateDisplay(true);
}

function handleExp() {
  if (state.justCalculated || state.isError) {
    state.expression = '';
    state.justCalculated = false;
    state.isError = false;
  }
  state.expression += 'e^(';
  state.currentInput = 'e^(';
  updateDisplay(true);
}

function handlePercent() {
  if (state.isError) return;
  state.expression += '%';
  state.currentInput = '%';
  state.justCalculated = false;
  updateDisplay();
}

function handleNegate() {
  if (state.isError) return;

  if (state.justCalculated && state.lastResult !== null) {
    const neg = -state.lastResult;
    state.lastResult = neg;
    state.expression = String(formatNumber(neg));
    state.currentInput = String(formatNumber(neg));
    updateDisplay(true);
    return;
  }

  // Toggle negative sign at the front or wrap
  if (!state.expression || state.expression === '0') {
    state.expression = '-';
    state.currentInput = '-';
  } else if (state.expression.startsWith('-(') && state.expression.endsWith(')')) {
    state.expression = state.expression.slice(2, -1);
    state.currentInput = state.expression;
  } else {
    state.expression = `-(${state.expression})`;
    state.currentInput = state.expression;
  }
  updateDisplay(true);
}

function handleDelete() {
  if (state.justCalculated || state.isError) {
    handleClear();
    return;
  }

  if (state.expression.length > 0) {
    // Check if deleting a multi-char function token
    const multiChars = ['asin(', 'acos(', 'atan(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt(', 'cbrt(', '10^(', 'e^(', '^(-1)', '^(2)'];
    let removed = false;
    for (const token of multiChars) {
      if (state.expression.endsWith(token)) {
        state.expression = state.expression.slice(0, -token.length);
        removed = true;
        break;
      }
    }

    if (!removed) {
      state.expression = state.expression.trimEnd().slice(0, -1);
    }
  }

  state.currentInput = state.expression.trim() === '' ? '0' : state.expression.slice(-1);
  updateDisplay();
}

function handleClear() {
  state.expression = '';
  state.currentInput = '0';
  state.lastResult = null;
  state.justCalculated = false;
  state.isNewOperand = false;
  state.isError = false;
  updateDisplay();
}

function handleEquals() {
  if (!state.expression || state.expression.trim() === '') return;

  try {
    const evaluated = calculateExpression(state.expression);

    if (typeof evaluated !== 'number' || isNaN(evaluated) || !isFinite(evaluated)) {
      throw new Error('Math Error');
    }

    const formatted = formatNumber(evaluated);
    state.expression = `${state.expression} =`;
    state.currentInput = formatted;
    state.lastResult = evaluated;
    state.justCalculated = true;
    state.isError = false;

    updateDisplay(true);
  } catch (err) {
    state.isError = true;
    state.currentInput = err.message || 'Error';
    updateDisplay();
  }
}

/* ── Keypad Click Delegation ──────────────────────────────── */
keypad.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  switch (action) {
    // Digits & basic symbols
    case 'digit':       handleDigit(value); break;
    case 'decimal':     handleDecimal(); break;

    // Operators
    case 'add':         handleOperator('+'); break;
    case 'sub':         handleOperator('−'); break;
    case 'mul':         handleOperator('×'); break;
    case 'div':         handleOperator('÷'); break;
    case 'percent':     handlePercent(); break;

    // Functions
    case 'sin':         handleFunction('sin'); break;
    case 'cos':         handleFunction('cos'); break;
    case 'tan':         handleFunction('tan'); break;
    case 'asin':        handleFunction('asin', 'sin⁻¹'); break;
    case 'acos':        handleFunction('acos', 'cos⁻¹'); break;
    case 'atan':        handleFunction('atan', 'tan⁻¹'); break;

    case 'log':         handleFunction('log'); break;
    case 'ln':          handleFunction('ln'); break;
    case 'sqrt':        handleFunction('sqrt', '√'); break;
    case 'cbrt':        handleFunction('cbrt', '∛'); break;

    // Powers
    case 'pow10':       handlePow10(); break;
    case 'exp':         handleExp(); break;
    case 'square':      handleSquare(); break;
    case 'power':       handlePower(); break;
    case 'reciprocal':  handleReciprocal(); break;

    // Math controls
    case 'factorial':   handleFactorial(); break;
    case 'negate':      handleNegate(); break;
    case 'open-paren':  handleParenthesis('('); break;
    case 'close-paren': handleParenthesis(')'); break;

    // Constants
    case 'pi':          handleConstant('π', Math.PI); break;
    case 'euler':       handleConstant('e', Math.E); break;

    // Control
    case 'clear':       handleClear(); break;
    case 'delete':      handleDelete(); break;
    case 'equals':      handleEquals(); break;
  }
});

// DEG / RAD toggle click
degRadToggle.addEventListener('click', () => {
  toggleAngleMode();
});

/* ── Keyboard Support ─────────────────────────────────────── */
const KEYBOARD_ACTION_MAP = {
  '0': 'btn-0', '1': 'btn-1', '2': 'btn-2', '3': 'btn-3', '4': 'btn-4',
  '5': 'btn-5', '6': 'btn-6', '7': 'btn-7', '8': 'btn-8', '9': 'btn-9',
  '.': 'btn-dot', ',': 'btn-dot',
  '+': 'btn-add', '-': 'btn-sub', '*': 'btn-mul', '/': 'btn-div',
  '(': 'btn-open', ')': 'btn-close',
  '^': 'btn-pow', '!': 'btn-fact', '%': 'btn-pct',
  'Enter': 'btn-eq', '=': 'btn-eq',
  'Backspace': 'btn-del',
  'Escape': 'btn-ac', 'Delete': 'btn-ac',
  'p': 'btn-pi', 'P': 'btn-pi',
  'e': 'btn-e',
  's': 'btn-sin', 'c': 'btn-cos', 't': 'btn-tan',
  'l': 'btn-log'
};

function flashKeyButton(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 130);
}

document.addEventListener('keydown', (e) => {
  // Ignore if user is inside an input/textarea if any were present
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

  const btnId = KEYBOARD_ACTION_MAP[e.key];
  if (btnId) {
    e.preventDefault();
    flashKeyButton(btnId);
  }

  // Handle keys
  if (/[0-9]/.test(e.key)) {
    handleDigit(e.key);
  } else if (e.key === '.' || e.key === ',') {
    handleDecimal();
  } else if (e.key === '+') {
    handleOperator('+');
  } else if (e.key === '-') {
    handleOperator('−');
  } else if (e.key === '*') {
    handleOperator('×');
  } else if (e.key === '/') {
    handleOperator('÷');
  } else if (e.key === '%') {
    handlePercent();
  } else if (e.key === '^') {
    handlePower();
  } else if (e.key === '!') {
    handleFactorial();
  } else if (e.key === '(') {
    handleParenthesis('(');
  } else if (e.key === ')') {
    handleParenthesis(')');
  } else if (e.key === 'Enter' || e.key === '=') {
    handleEquals();
  } else if (e.key === 'Backspace') {
    handleDelete();
  } else if (e.key === 'Escape' || e.key === 'Delete') {
    handleClear();
  } else if (e.key.toLowerCase() === 'p') {
    handleConstant('π', Math.PI);
  } else if (e.key === 'e') {
    handleConstant('e', Math.E);
  } else if (e.key.toLowerCase() === 's') {
    handleFunction('sin');
  } else if (e.key.toLowerCase() === 'c') {
    handleFunction('cos');
  } else if (e.key.toLowerCase() === 't') {
    handleFunction('tan');
  } else if (e.key.toLowerCase() === 'l') {
    handleFunction('log');
  }
});

/* ── Initial Render ───────────────────────────────────────── */
updateDisplay();
