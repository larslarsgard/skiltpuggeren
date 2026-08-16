let skiltData = [];
let currentItem = null;
let allOptions = []; 
let isWaitingForNext = false;

let guessedWrongFirst = false;
let usedHint = false;

// Henter lagret statistikk fra nettleseren, eller starter med et tomt objekt
let stats = JSON.parse(localStorage.getItem('skiltStats')) || {};

document.addEventListener("DOMContentLoaded", () => {
    fetch('skiltdata.json')
        .then(response => response.json())
        .then(data => {
            skiltData = data;
            setupAutocompleteData(); 
            nextQuestion();
        })
        .catch(error => {
            document.getElementById('feedback').innerText = "Feil ved innlasting av data.";
            console.error(error);
        });

    const inputField = document.getElementById('answer-input');
    
    inputField.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            checkAnswer();
            document.getElementById('autocomplete-list').innerHTML = ''; 
        }
    });

    inputField.addEventListener('input', function() {
        const val = this.value.trim().toLowerCase();
        const listEl = document.getElementById('autocomplete-list');
        listEl.innerHTML = ''; 
        
        if (!val) return; 
        
        const matches = allOptions.filter(option => option.toLowerCase().includes(val));
        const topMatches = matches.slice(0, 3); 
        
        topMatches.forEach(match => {
            const li = document.createElement('li');
            li.innerHTML = match;
            
            li.onclick = function() {
                inputField.value = match;
                listEl.innerHTML = ''; 
                checkAnswer(); 
            };
            listEl.appendChild(li);
        });
    });
    
    document.addEventListener('click', function(e) {
        if (e.target.id !== 'answer-input') {
            document.getElementById('autocomplete-list').innerHTML = '';
        }
    });
});

function setupAutocompleteData() {
    const uniqueOptions = new Set();
    skiltData.forEach(item => {
        uniqueOptions.add(item.area);
        uniqueOptions.add(item.county);
    });
    allOptions = Array.from(uniqueOptions).sort();
}

function nextQuestion() {
    if (skiltData.length === 0) return;
    
    guessedWrongFirst = false;
    usedHint = false;
    isWaitingForNext = false;

    const randomIndex = Math.floor(Math.random() * skiltData.length);
    currentItem = skiltData[randomIndex];
    
    const randomNumbers = Math.floor(10000 + Math.random() * 90000);
    document.getElementById('skilt-text').innerText = `${currentItem.code} ${randomNumbers}`;
    
    const answerInput = document.getElementById('answer-input');
    answerInput.value = '';
    
    const feedback = document.getElementById('feedback');
    feedback.innerText = '';
    
    document.getElementById('options-container').innerHTML = '';
//    answerInput.focus();
}

function checkAnswer() {
    if (!currentItem || isWaitingForNext) return;

    const userGuess = document.getElementById('answer-input').value.trim().toLowerCase();
    const correctArea = currentItem.area.toLowerCase();
    const correctCounty = currentItem.county.toLowerCase();
    const feedbackEl = document.getElementById('feedback');

    if (userGuess === correctArea || userGuess === correctCounty) {
        isWaitingForNext = true;
        feedbackEl.innerText = `Riktig! 🎉 Det er ${currentItem.area} (${currentItem.county}).`;
        feedbackEl.style.color = '#10b981';
        
        document.getElementById('options-container').innerHTML = '';
        
        let logStatus = 'correct'; 
        if (guessedWrongFirst) {
            logStatus = 'wrong'; 
        } else if (usedHint) {
            logStatus = 'hint'; 
        }
        
        updateLog(currentItem, logStatus);
        recordStats(currentItem.code, logStatus); // Lagre til statistikk
        
        setTimeout(nextQuestion, 2000);
    } else {
        guessedWrongFirst = true; 
        feedbackEl.innerText = 'Feil, prøv igjen! ❌';
        feedbackEl.style.color = '#e11d48';
    }
}

function revealAnswer() {
    if (!currentItem || isWaitingForNext) return;
    isWaitingForNext = true;

    const feedbackEl = document.getElementById('feedback');
    feedbackEl.innerText = `Fasit: ${currentItem.area} (${currentItem.county})`;
    feedbackEl.style.color = '#d97706';
    
    document.getElementById('options-container').innerHTML = '';
    
    updateLog(currentItem, 'wrong');
    recordStats(currentItem.code, 'wrong'); // Lagre feil/avslørt i statistikk
    
    setTimeout(nextQuestion, 2500);
}

// Funksjon for å registrere statistikk i nettleseren
function recordStats(code, status) {
    if (!stats[code]) {
        stats[code] = { correct: 0, hint: 0, wrong: 0 };
    }
    
    if (status === 'correct') stats[code].correct++;
    if (status === 'hint') stats[code].hint++;
    if (status === 'wrong') stats[code].wrong++;
    
    // Lagre permanent i nettleserens localStorage
    localStorage.setItem('skiltStats', JSON.stringify(stats));
}

function updateLog(item, status) {
    const logContainer = document.getElementById('guess-log');
    const li = document.createElement('li');
    
    li.innerHTML = `<strong>${item.code}</strong> - ${item.area} (${item.county})`;
    
    if (status === 'correct') {
        li.style.borderLeftColor = '#10b981'; 
    } else if (status === 'hint') {
        li.style.borderLeftColor = '#eab308'; 
        li.style.backgroundColor = '#fefce8'; 
        li.innerHTML += ' <em style="color: #ca8a04; font-size: 0.85em;">(Med hint)</em>';
    } else if (status === 'wrong') {
        li.style.borderLeftColor = '#e11d48'; 
        li.style.backgroundColor = '#fff1f2'; 
        li.innerHTML += ' <em style="color: #e11d48; font-size: 0.85em;">(Bommet/Avslørt)</em>';
    }
    
    logContainer.prepend(li);
    
    if (logContainer.children.length > 5) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function revealThreeOptions() {
    if (!currentItem || skiltData.length < 3 || isWaitingForNext) return;
    usedHint = true; 
    
    const options = [currentItem.area];
    
    while (options.length < 3) {
        const randomItem = skiltData[Math.floor(Math.random() * skiltData.length)];
        if (!options.includes(randomItem.area)) {
            options.push(randomItem.area);
        }
    }
    
    options.sort(() => Math.random() - 0.5);
    const container = document.getElementById('options-container');
    container.innerHTML = ''; 
    
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.innerText = option;
        
        btn.onclick = () => {
            document.getElementById('answer-input').value = option;
            checkAnswer();
        };
        container.appendChild(btn);
    });
}

// Rå statistikk-visning som henter navnet rett fra skiltData
function toggleStatsView() {
    const container = document.querySelector('.game-container');
    
    let statsView = document.getElementById('stats-view');
    
    if (statsView) {
        statsView.remove(); 
        return;
    }

    statsView = document.createElement('div');
    statsView.id = 'stats-view';
    statsView.style.cssText = "margin-top: 2rem; text-align: left; border-top: 2px dashed #ccc; padding-top: 1rem;";
    
    let html = `<h2>Rå statistikk-oversikt</h2><p>Oversikt over registrert historikk:</p><ul style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">`;
    
    const sortedCodes = Object.keys(stats).sort((a, b) => {
        return (stats[b].wrong - stats[a].wrong); 
    });

    if (sortedCodes.length === 0) {
        html += `<li>Ingen statistikk registrert ennå. Spill litt først!</li>`;
    } else {
        sortedCodes.forEach(code => {
            const s = stats[code];
            
            // HER ER LINJEN SOM HENTER NAVNET: Finn objektet i skiltData som matcher koden
            const match = skiltData.find(item => item.code === code);
            const areaName = match ? `${match.area} (${match.county})` : '';

            html += `<li style="padding: 6px 0; border-bottom: 1px solid #eee; font-size: 0.9rem;">
                <strong>${code}</strong> - <span style="color: #555;">${areaName}</span><br>
                <span style="font-size: 0.85rem;">🟩 ${s.correct} rett | 🟨 ${s.hint} hint | 🟥 ${s.wrong} feil</span>
            </li>`;
        });
    }
    
    html += `</ul>`;
    
    html += `<div style="display: flex; gap: 10px; margin-top: 10px;">`;
    html += `<button onclick="document.getElementById('stats-view').remove()" class="btn-secondary" style="flex: 1;">Lukk statistikk</button>`;
    html += `<button onclick="clearStats()" class="btn-warning" style="flex: 1; background-color: #fee2e2; color: #b91c1c;">Slett all statistikk</button>`;
    html += `</div>`;

    statsView.innerHTML = html;
    container.appendChild(statsView);
}

// Funksjon for å slette all lagret statistikk (lim denne inn rett under toggleStatsView)
function clearStats() {
    if (confirm("Er du sikker på at du vil slette all lagret statistikk? Dette kan ikke angres.")) {
        localStorage.removeItem('skiltStats'); 
        stats = {}; 
        document.getElementById('stats-view').remove(); 
        alert("Statistikken er slettet!");
    }
}
