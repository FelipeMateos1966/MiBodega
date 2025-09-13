document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = 'AIzaSyDbefVCcgim-nUx__Ho0moJTWTGUurBPWY';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`;

    // Elementos del DOM
    const screens = document.querySelectorAll('.screen');
    const loader = document.getElementById('loader');
    const toast = document.getElementById('toast');
    const imageUploadInput = document.getElementById('image-upload-input');
    const cameraInput = document.getElementById('camera-input');
    const resultsContent = document.getElementById('results-content');
    const cavaList = document.getElementById('cava-list');

    let currentWineData = null;

    // --- NAVEGACIÓN ---
    function showScreen(screenId) {
        screens.forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    document.getElementById('scan-btn').addEventListener('click', () => cameraInput.click());
    document.getElementById('upload-btn').addEventListener('click', () => imageUploadInput.click());
    document.getElementById('describe-btn').addEventListener('click', () => {
        const description = prompt('Describe el vino (ej: tinto español, Rioja, 2019, sabor a frutos rojos y madera):');
        if (description && description.trim() !== '') {
            analyzeInput('text', description.trim());
        }
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => showScreen(btn.dataset.target));
    });

    document.getElementById('cava-btn').addEventListener('click', () => {
        loadCava();
        showScreen('cava-screen');
    });

    cameraInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    imageUploadInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    function handleFile(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target.result.split(',')[1];
                analyzeInput('image', { mimeType: file.type, data: base64Image });
            };
            reader.readAsDataURL(file);
        }
    }

    // --- LÓGICA DE GEMINI ---
    async function analyzeInput(type, data) {
        if (!navigator.onLine) {
            showToast('Necesitas conexión a internet para analizar vinos.');
            return;
        }
        loader.classList.remove('hidden');

        const promptText = `
        Eres VinumAI, un sommelier experto. Analiza la información proporcionada sobre un vino y devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura y en español. No incluyas \`\`\`json ni ningún otro texto fuera del JSON.
        La estructura es:
        {
          "nombre": "string",
          "bodega": "string",
          "do": "string (Denominación de Origen)",
          "region": "string (País/Región)",
          "uva": "string (Tipo de uva)",
          "anada": "number (Año de cosecha)",
          "vista": "string (Descripción del color e intensidad)",
          "olfato": "string (Descripción de aromas)",
          "gusto": "string (Perfil de sabor, acidez, taninos, cuerpo)",
          "maridaje": "string (Recomendaciones de comida)",
          "temperatura": "string (Temperatura óptima de servicio, ej: '16-18°C')",
          "guarda": "string (Potencial de guarda, ej: 'Hasta 5 años')"
        }
        `;

        let requestBody;
        if (type === 'text') {
            requestBody = {
                contents: [{ parts: [{ text: `${promptText}\n\nDescripción del usuario: ${data}` }] }]
            };
        } else { // image
            requestBody = {
                contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: data.mimeType, data: data.data } }] }]
            };
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`Error en la API: ${response.statusText}`);

            const responseData = await response.json();
            const jsonString = responseData.candidates[0].content.parts[0].text;
            const wineData = JSON.parse(jsonString);
            currentWineData = wineData; // Guardar para añadir a la cava
            displayResults(wineData);
            showScreen('results-screen');

        } catch (error) {
            console.error('Error al analizar:', error);
            showToast('No se pudo analizar la información. Inténtalo de nuevo.');
        } finally {
            loader.classList.add('hidden');
        }
    }

    // --- PANTALLA DE RESULTADOS ---
    function displayResults(data) {
        resultsContent.innerHTML = `
            <div class="result-card">
                <h3>${data.nombre || 'Vino Desconocido'}</h3>
                <p class="sub-heading">${data.bodega || ''} - ${data.anada || ''}</p>
            </div>
            <div class="result-card">
                <h4><i class="icon">ℹ️</i> Información General</h4>
                <p><strong>Uva:</strong> ${data.uva || 'N/A'}</p>
                <p><strong>D.O.:</strong> ${data.do || 'N/A'}</p>
                <p><strong>Región:</strong> ${data.region || 'N/A'}</p>
            </div>
            <div class="result-card">
                <h4><i class="icon">👃</i> Análisis Sensorial</h4>
                <p><strong>Vista:</strong> ${data.vista || 'N/A'}</p>
                <p><strong>Olfato:</strong> ${data.olfato || 'N/A'}</p>
                <p><strong>Gusto:</strong> ${data.gusto || 'N/A'}</p>
            </div>
            <div class="result-card">
                <h4><i class="icon">🍽️</i> Servicio</h4>
                <p><strong>Maridaje:</strong> ${data.maridaje || 'N/A'}</p>
                <p><strong>Temperatura:</strong> ${data.temperatura || 'N/A'}</p>
                <p><strong>Potencial de Guarda:</strong> ${data.guarda || 'N/A'}</p>
            </div>
            <button id="add-to-cava-btn">Añadir a Mi Cava</button>
        `;
        document.getElementById('add-to-cava-btn').addEventListener('click', () => saveCurrentWineToCava());
    }

    // --- LÓGICA DE MI CAVA (LocalStorage) ---
    function getCava() {
        return JSON.parse(localStorage.getItem('vinumAI_cava') || '[]');
    }

    function saveCava(cava) {
        localStorage.setItem('vinumAI_cava', JSON.stringify(cava));
    }

    function saveCurrentWineToCava() {
        if (!currentWineData) return;

        const rating = prompt('Califica este vino (1-5 estrellas):', '5');
        const notes = prompt('Añade una nota personal:');

        const newWineEntry = {
            ...currentWineData,
            id: Date.now(),
            rating: parseInt(rating) || 5,
            notes: notes || ''
        };

        const cava = getCava();
        cava.unshift(newWineEntry);
        saveCava(cava);
        showToast(`${currentWineData.nombre} guardado en tu cava.`);
    }

    function loadCava() {
        const cava = getCava();
        renderCavaList(cava);
    }

    function renderCavaList(wines) {
        if (wines.length === 0) {
            cavaList.innerHTML = '<p class="empty-state">Tu cava está vacía. ¡Empieza a analizar vinos!</p>';
            return;
        }
        cavaList.innerHTML = wines.map(wine => `
            <div class="cava-item">
                <div class="cava-item-info">
                    <h4>${wine.nombre}</h4>
                    <p>${wine.bodega} - ${wine.uva}</p>
                    <p class="cava-item-rating">${'★'.repeat(wine.rating)}${'☆'.repeat(5 - wine.rating)}</p>
                    ${wine.notes ? `<p class="cava-item-notes"><em>Nota: ${wine.notes}</em></p>` : ''}
                </div>
                <button class="delete-cava-item-btn" data-id="${wine.id}">🗑️</button>
            </div>
        `).join('');

        document.querySelectorAll('.delete-cava-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wineId = e.currentTarget.dataset.id;
                if (confirm('¿Seguro que quieres eliminar este vino de tu cava?')) {
                    let cava = getCava();
                    cava = cava.filter(w => w.id != wineId);
                    saveCava(cava);
                    loadCava(); // Recargar la lista
                }
            });
        });
    }
    
    document.getElementById('cava-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cava = getCava();
        const filteredCava = cava.filter(wine => 
            (wine.nombre && wine.nombre.toLowerCase().includes(searchTerm)) ||
            (wine.bodega && wine.bodega.toLowerCase().includes(searchTerm)) ||
            (wine.uva && wine.uva.toLowerCase().includes(searchTerm)) ||
            (wine.region && wine.region.toLowerCase().includes(searchTerm)) ||
            (wine.notes && wine.notes.toLowerCase().includes(searchTerm))
        );
        renderCavaList(filteredCava);
    });

    // --- UTILIDADES ---
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    // --- INICIALIZACIÓN ---
    showScreen('home-screen');
    if (!navigator.onLine) {
        showToast('Modo sin conexión. Algunas funciones pueden no estar disponibles.');
    }
});