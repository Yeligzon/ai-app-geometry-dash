document.addEventListener('DOMContentLoaded', () => {
    const mainDisplay = document.getElementById('mainDisplay');
    const historyExpression = document.getElementById('historyExpression');
    const scientificPanel = document.getElementById('scientificPanel');
    const historyPanel = document.getElementById('historyPanel');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    let currentInput = '0';
    let expression = '';
    let memory = null;
    let history = JSON.parse(localStorage.getItem('calc_history')) || [];

    // Render initial history
    renderHistory();

    // Mode Switching
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mode = btn.dataset.mode;
            
            if (mode === 'standard') {
                scientificPanel.classList.add('hidden');
                historyPanel.classList.add('hidden');
            } else if (mode === 'scientific') {
                scientificPanel.classList.remove('hidden');
                historyPanel.classList.add('hidden');
            } else if (mode === 'history') {
                scientificPanel.classList.add('hidden');
                historyPanel.classList.remove('hidden');
            }
        });
    });

    // Button Clicks
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', () => {
            const num = button.dataset.num;
            const action = button.dataset.action;

            if (num !== undefined) {
                handleNumber(num);
            } else if (action) {
                handleAction(action);
            }
            updateDisplay();
        });
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
        if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
            handleNumber(e.key);
        } else if (e.key === '+') handleAction('add');
        else if (e.key === '-') handleAction('subtract');
        else if (e.key === '*') handleAction('multiply');
        else if (e.key === '/') {
            e.preventDefault();
            handleAction('divide');
        }
        else if (e.key === 'Enter' || e.key === '=') handleAction('equals');
        else if (e.key === 'Backspace') handleAction('delete');
        else if (e.key === 'Escape') handleAction('clear');
        else if (e.key === '%') handleAction('percent');
        updateDisplay();
    });

    function handleNumber(num) {
        if (currentInput === '0' && num !== '.') {
            currentInput = num;
        } else {
            if (num === '.' && currentInput.includes('.')) return;
            if (currentInput.length >= 16) return; // Limit length
            currentInput += num;
        }
    }

    function handleAction(action) {
        switch (action) {
            case 'clear':
                currentInput = '0';
                expression = '';
                break;
            case 'delete':
                if (currentInput.length > 1) {
                    currentInput = currentInput.slice(0, -1);
                } else {
                    currentInput = '0';
                }
                break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
                const opSymbol = getOpSymbol(action);
                expression += currentInput + ' ' + opSymbol + ' ';
                currentInput = '0';
                break;
            case 'percent':
                currentInput = String(parseFloat(currentInput) / 100);
                break;
            case 'sin':
                currentInput = String(Math.sin(parseFloat(currentInput) * Math.PI / 180).toFixed(6));
                break;
            case 'cos':
                currentInput = String(Math.cos(parseFloat(currentInput) * Math.PI / 180).toFixed(6));
                break;
            case 'tan':
                currentInput = String(Math.tan(parseFloat(currentInput) * Math.PI / 180).toFixed(6));
                break;
            case 'sqrt':
                currentInput = String(Math.sqrt(parseFloat(currentInput)).toFixed(6));
                break;
            case 'pow':
                currentInput = String(Math.pow(parseFloat(currentInput), 2));
                break;
            case 'log':
                currentInput = String(Math.log10(parseFloat(currentInput)).toFixed(6));
                break;
            case 'ln':
                currentInput = String(Math.log(parseFloat(currentInput)).toFixed(6));
                break;
            case 'pi':
                currentInput = String(Math.PI.toFixed(6));
                break;
            case 'e':
                currentInput = String(Math.E.toFixed(6));
                break;
            case 'fact':
                currentInput = String(factorial(parseInt(currentInput)));
                break;
            case 'equals':
                if (expression) {
                    const fullExpr = expression + currentInput;
                    try {
                        // Safe evaluation for basic math expression
                        const sanitized = fullExpr.replace(/×/g, '*').replace(/÷/g, '/');
                        const result = eval(sanitized);
                        const formattedResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(6));
                        
                        addToHistory(fullExpr, formattedResult);

                        expression = '';
                        currentInput = String(formattedResult);
                    } catch (err) {
                        currentInput = 'Error';
                        expression = '';
                    }
                }
                break;
        }
    }

    function getOpSymbol(action) {
        switch (action) {
            case 'add': return '+';
            case 'subtract': return '-';
            case 'multiply': return '×';
            case 'divide': return '÷';
            default: return '';
        }
    }

    function factorial(n) {
        if (n < 0) return 'Error';
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    function updateDisplay() {
        mainDisplay.textContent = currentInput;
        historyExpression.textContent = expression;
    }

    function addToHistory(expr, res) {
        const item = { expr, res, time: new Date().toLocaleTimeString() };
        history.unshift(item);
        if (history.length > 20) history.pop();
        localStorage.setItem('calc_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No hay operaciones registradas</div>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item" data-res="${item.res}">
                <span class="history-item-expr">${item.expr} =</span>
                <span class="history-item-res">${item.res}</span>
            </div>
        `).join('');

        // Click on history item to reuse result
        document.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', () => {
                currentInput = el.dataset.res;
                updateDisplay();
                modeBtns[0].click(); // Switch back to standard
            });
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.removeItem('calc_history');
        renderHistory();
    });
});
