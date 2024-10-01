// script.js

// Board configuration variables
// const boardSize = 8; // Dimensions of the board (boardSize x boardSize)
const boardData = Array(boardSize)
    .fill(0)
    .map(() => Array(boardSize).fill(0)); // Initialize an empty board

// Define region colors and their corresponding hex values
const regionColors = {
    purple: '#b7a3e2',
    green: '#b8dea0',
    gray: '#e0e0e0',
    red: '#f67858',
    yellow: '#e8f18b',
    brown: '#b9b29b',
    blue: '#99bfff',
    orange: '#fbc88c',
    teal: '#aad1d8', // New color 1
    cyan: '#78ede7', // New color 2
    pink: '#db9ebd', // New color 3
};

// Regions and their corresponding cells
// const regions = {
//     purple: [
//         [0,0], [0,1], [0,2], [0,3], [0,4],
//         [1,0], [1,4],
//         [2,4],
//         [3,4],
//     ],
//     green: [
//         [2,2],
//     ],
//     gray: [
//         [3,0], [3,1],
//     ],
//     red: [
//         [4,3],
//     ],
//     yellow: [
//         [5,1], [5,2],
//     ],
//     brown: [
//         [7,7],
//     ],
//     blue: [
//         [1,6], [2,6], [3,6], [4,6], [5,6],
//         [5,5], [6,5], [6,4], [7,4], [7,3],
//     ],
//     orange: [
//         [0,5], [0,6], [0,7],
//         [1,1], [1,2], [1,3], [1,5], [1,7],
//         [2,0], [2,1], [2,3], [2,5], [2,7],
//         [3,2], [3,3], [3,5], [3,7],
//         [4,0], [4,1], [4,2], [4,4], [4,5], [4,7],
//         [5,0], [5,3], [5,4], [5,7],
//         [6,0], [6,1], [6,2], [6,3], [6,6], [6,7],
//         [7,0], [7,1], [7,2], [7,5], [7,6],
//     ],
//     teal: [],   // New color, empty for now
//     cyan: [],   // New color, empty for now
//     pink: [],   // New color, empty for now
// };

// Mapping of cell coordinates to region colors
const cellRegionMap = {};

// Build cellRegionMap for quick lookup
function buildCellRegionMap() {
    for (let color in regions) {
        regions[color].forEach(coord => {
            const key = `${coord[0]},${coord[1]}`;
            cellRegionMap[key] = color;
        });
    }
}

// Variables for touch dragging
let isDragging = false; // Tracks whether the user is dragging
let currentCells = new Set(); // Stores cells that have been dragged over
let isGameOver = false; // Tracks whether the game is over

// Variables to keep track of queen positions
let queenPositions = {
    rows: {},      // row number -> column number
    cols: {},      // column number -> row number
    regions: {},   // region color -> list of cells with queens
    queens: []     // list of queen positions [row, col]
};

// Timer variables
let timerInterval;
let totalSeconds = 0;

// Variables for touch handling
let touchStartTime = 0;
let touchStartCell = null;
let initialCellState = null;

// Create the chessboard
function createBoard() {
    buildCellRegionMap();
    const board = document.getElementById('chessboard');

    // Set the --board-size CSS variable
    board.style.setProperty('--board-size', boardSize);
    
    // Update CSS variables for region colors
    const styleSheet = document.styleSheets[0];
    for (let color in regionColors) {
        if (styleSheet.insertRule) {
            styleSheet.insertRule(
                `td.${color} { background-color: ${regionColors[color]}; }`,
                styleSheet.cssRules.length
            );
        } else if (styleSheet.addRule) {
            styleSheet.addRule(`td.${color}`, `background-color: ${regionColors[color]};`);
        }
    }

    for (let row = 0; row < boardSize; row++) {
        const tr = document.createElement('tr');
        for (let col = 0; col < boardSize; col++) {
            const td = document.createElement('td');
            td.dataset.row = row;
            td.dataset.col = col;

            // Assign region color classes
            const cellKey = `${row},${col}`;
            const color = cellRegionMap[cellKey];
            if (color) {
                td.classList.add(color);
            }

            // Assign border classes
            const borderClasses = getCellBorderClasses(row, col);
            borderClasses.forEach(borderClass => td.classList.add(borderClass));

            // Event listeners for interactions
            td.addEventListener('click', handleCellClick);
            td.addEventListener('touchstart', handleCellTouchStart);
            td.addEventListener('touchmove', handleCellTouchMove);
            td.addEventListener('touchend', handleCellTouchEnd);

            tr.appendChild(td);
        }
        board.appendChild(tr);
    }
}

// Function to get border classes for a cell based on its region
function getCellBorderClasses(row, col) {
    const classes = [];

    const cellRegion = cellRegionMap[`${row},${col}`];

    // Check top neighbor
    if (row === 0 || cellRegion !== cellRegionMap[`${row - 1},${col}`]) {
        classes.push('border-top');
    }
    // Check right neighbor
    if (col === boardSize - 1 || cellRegion !== cellRegionMap[`${row},${col + 1}`]) {
        classes.push('border-right');
    }
    // Check bottom neighbor
    if (row === boardSize - 1 || cellRegion !== cellRegionMap[`${row + 1},${col}`]) {
        classes.push('border-bottom');
    }
    // Check left neighbor
    if (col === 0 || cellRegion !== cellRegionMap[`${row},${col - 1}`]) {
        classes.push('border-left');
    }

    return classes;
}

// Handle cell clicks
function handleCellClick(event) {
    if (isGameOver) return; // Prevent interaction if the game is over

    const td = event.currentTarget;
    const row = parseInt(td.dataset.row);
    const col = parseInt(td.dataset.col);
    const existingPiece = td.querySelector('span');

    if (!existingPiece) {
        // Place an 'X'
        markCell(td);
    } else if (existingPiece.classList.contains('x-mark')) {
        // Attempt to place a queen
        if (isValidMove(row, col)) {
            existingPiece.classList.remove('x-mark');
            existingPiece.classList.add('queen');
            existingPiece.textContent = '';
            updateQueenPositions(row, col, true);

            // Update the UI before checking for completion
            setTimeout(() => {
                // Check if puzzle is solved
                if (isPuzzleSolved()) {
                    endGame();
                }
            }, 0);
        } else {
            showErrorMessage(row, col);
        }
    } else if (existingPiece.classList.contains('queen')) {
        // Remove the queen
        td.removeChild(existingPiece);
        updateQueenPositions(row, col, false);
    }
}

// Touch event handlers
function handleCellTouchStart(event) {
    if (isGameOver) return; // Prevent interaction if the game is over

    touchStartTime = Date.now();
    touchStartCell = event.currentTarget;
    isDragging = false;
    initialCellState = null;

    currentCells.clear();

    // Prevent default behavior
    event.preventDefault();
}

function handleCellTouchMove(event) {
    if (isGameOver) return;

    event.preventDefault(); // Prevent default touch behavior

    const touch = event.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (!isDragging) {
        isDragging = true;

        const td = touchStartCell;
        const existingPiece = td.querySelector('span');

        if (!existingPiece) {
            initialCellState = 'empty';
            // Place an 'X'
            markCell(td);
        } else if (existingPiece && existingPiece.classList.contains('x-mark')) {
            initialCellState = 'x';
            // Remove the 'X'
            td.removeChild(existingPiece);
        } else if (existingPiece && existingPiece.classList.contains('queen')) {
            initialCellState = 'queen';
            // Do nothing
        } else {
            initialCellState = null;
        }
        currentCells.add(td);
    }

    if (element && element.tagName === 'TD' && !currentCells.has(element)) {
        const td = element;
        const existingPiece = td.querySelector('span');

        if (initialCellState === 'empty') {
            if (!existingPiece) {
                // Place an 'X'
                markCell(td);
            }
        } else if (initialCellState === 'x') {
            if (existingPiece && existingPiece.classList.contains('x-mark')) {
                // Remove the 'X'
                td.removeChild(existingPiece);
            }
        }
        // If initial cell is queen, do nothing during dragging
        currentCells.add(td);
    }
}

function handleCellTouchEnd(event) {
    if (isGameOver) return;

    if (!isDragging) {
        // This is a tap, handle like click
        handleCellClick({ currentTarget: touchStartCell });
    }

    isDragging = false;
    currentCells.clear();
    touchStartCell = null;
    initialCellState = null;
}

// Function to place an 'X' on a cell
function markCell(td) {
    const existingPiece = td.querySelector('span');

    if (!existingPiece) {
        // Place an 'X'
        const xMark = document.createElement('span');
        xMark.classList.add('x-mark');
        td.appendChild(xMark);
    }
}

// Function to check if placing a queen at (row, col) is valid
function isValidMove(row, col) {
    const regionColor = getCellRegion(row, col);

    // Check row
    if (queenPositions.rows[row] !== undefined) {
        return false;
    }

    // Check column
    if (queenPositions.cols[col] !== undefined) {
        return false;
    }

    // Check region
    if (queenPositions.regions[regionColor] && queenPositions.regions[regionColor].length >= 1) {
        return false;
    }

    // Check adjacent squares (including diagonals)
    for (let [qRow, qCol] of queenPositions.queens) {
        if (Math.abs(qRow - row) <= 1 && Math.abs(qCol - col) <= 1) {
            return false;
        }
    }

    return true;
}

// Function to update queen positions when a queen is placed or removed
function updateQueenPositions(row, col, isPlacing) {
    const regionColor = getCellRegion(row, col);
    if (isPlacing) {
        queenPositions.rows[row] = col;
        queenPositions.cols[col] = row;
        if (!queenPositions.regions[regionColor]) {
            queenPositions.regions[regionColor] = [];
        }
        queenPositions.regions[regionColor].push([row, col]);
        queenPositions.queens.push([row, col]);
    } else {
        delete queenPositions.rows[row];
        delete queenPositions.cols[col];
        queenPositions.regions[regionColor] = queenPositions.regions[regionColor].filter(
            ([r, c]) => !(r === row && c === col)
        );
        queenPositions.queens = queenPositions.queens.filter(
            ([r, c]) => !(r === row && c === col)
        );
    }
}

// Function to identify the region color of a cell
function getCellRegion(row, col) {
    return cellRegionMap[`${row},${col}`];
}

// Function to check if the puzzle is solved
function isPuzzleSolved() {
    const totalQueensNeeded = boardSize;

    // Check if there are exactly 'boardSize' queens
    if (queenPositions.queens.length !== totalQueensNeeded) {
        return false;
    }

    // Check rows and columns
    if (
        Object.keys(queenPositions.rows).length !== totalQueensNeeded ||
        Object.keys(queenPositions.cols).length !== totalQueensNeeded
    ) {
        return false;
    }

    // Check regions
    for (let color in regions) {
        if (color !== 'orange') {
            if (!queenPositions.regions[color] || queenPositions.regions[color].length !== 1) {
                return false;
            }
        }
    }

    return true;
}

// Function to display messages
function showMessage(text, color = 'red') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.style.color = color;

    if (!isGameOver) {
        // Clear the message after 3 seconds
        setTimeout(() => {
            messageDiv.textContent = '';
        }, 3000);
    }
}

// Function to display error messages when an invalid move is attempted
function showErrorMessage(row, col) {
    const violation = getViolationReason(row, col);
    showMessage(`Invalid move: ${violation}`);
    // Flash the conflicting queen(s)
    flashConflictingQueens(row, col);
}

// Function to determine the reason for the move violation
function getViolationReason(row, col) {
    const regionColor = getCellRegion(row, col);

    if (queenPositions.rows[row] !== undefined) {
        return 'There is already a queen in this row.';
    } else if (queenPositions.cols[col] !== undefined) {
        return 'There is already a queen in this column.';
    } else if (queenPositions.regions[regionColor] && queenPositions.regions[regionColor].length >= 1) {
        return 'There is already a queen in this region.';
    } else {
        // Check adjacent squares (including diagonals)
        for (let [qRow, qCol] of queenPositions.queens) {
            if (Math.abs(qRow - row) <= 1 && Math.abs(qCol - col) <= 1) {
                return 'Queens cannot be adjacent.';
            }
        }
    }
    return 'Unknown violation.';
}

// Function to flash the conflicting queen(s)
function flashConflictingQueens(row, col) {
    const conflictingCells = [];

    // Check for conflicts and collect conflicting cells
    if (queenPositions.rows[row] !== undefined) {
        // Conflict in row
        const conflictCol = queenPositions.rows[row];
        conflictingCells.push(document.querySelector(`td[data-row='${row}'][data-col='${conflictCol}']`));
    }
    if (queenPositions.cols[col] !== undefined) {
        // Conflict in column
        const conflictRow = queenPositions.cols[col];
        conflictingCells.push(document.querySelector(`td[data-row='${conflictRow}'][data-col='${col}']`));
    }
    const regionColor = getCellRegion(row, col);
    if (queenPositions.regions[regionColor] && queenPositions.regions[regionColor].length >= 1) {
        // Conflict in region
        const [conflictRow, conflictCol] = queenPositions.regions[regionColor][0];
        conflictingCells.push(document.querySelector(`td[data-row='${conflictRow}'][data-col='${conflictCol}']`));
    }
    // Check adjacent squares (including diagonals)
    for (let [qRow, qCol] of queenPositions.queens) {
        if (Math.abs(qRow - row) <= 1 && Math.abs(qCol - col) <= 1) {
            conflictingCells.push(document.querySelector(`td[data-row='${qRow}'][data-col='${qCol}']`));
        }
    }

    // Flash the conflicting queens
    conflictingCells.forEach(cell => {
        const queen = cell.querySelector('.queen');
        if (queen) {
            queen.classList.add('flash');
            setTimeout(() => {
                queen.classList.remove('flash');
            }, 1000);
        }
    });
}

// Timer functions
function startTimer() {
    timerInterval = setInterval(setTime, 1000);
}

function setTime() {
    ++totalSeconds;
    const minutes = pad(Math.floor(totalSeconds / 60));
    const seconds = pad(totalSeconds % 60);
    document.getElementById('timer').textContent = minutes + ":" + seconds;
}

function pad(val) {
    return val.toString().padStart(2, '0');
}

// Function to end the game
function endGame() {
    isGameOver = true;
    clearInterval(timerInterval); // Stop the timer

    // Display a completion message
    showMessage(`Congratulations! You solved the puzzle in ${document.getElementById('timer').textContent}.`, 'green');

    // Make all queens flash green
    const queens = document.querySelectorAll('.queen');
    queens.forEach(queen => {
        queen.classList.add('flash-success');
    });

    // Disable further interactions
    disableBoardInteractions();
}

// Function to disable board interactions
function disableBoardInteractions() {
    const cells = document.querySelectorAll('#chessboard td');
    cells.forEach(cell => {
        cell.removeEventListener('click', handleCellClick);
        cell.removeEventListener('touchstart', handleCellTouchStart);
        cell.removeEventListener('touchmove', handleCellTouchMove);
        cell.removeEventListener('touchend', handleCellTouchEnd);
    });
}

// Initialize the game
window.onload = function() {
    createBoard();
    startTimer();
};