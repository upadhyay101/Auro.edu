document.addEventListener('DOMContentLoaded', function() {
    // Fetch previous results when the page loads
    fetchPreviousResults();
    
    // Initialize camera controls
    const startCameraBtn = document.getElementById('startCamera');
    const stopCameraBtn = document.getElementById('stopCamera');
    const videoPreview = document.getElementById('videoPreview');
    let stream = null;

    startCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoPreview.srcObject = stream;
            startCameraBtn.style.display = 'none';
            stopCameraBtn.style.display = 'block';
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please ensure you have granted camera permissions.');
        }
    });

    stopCameraBtn.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            videoPreview.srcObject = null;
            startCameraBtn.style.display = 'block';
            stopCameraBtn.style.display = 'none';
        }
    });
});

function startAssessment() {
    const domainSelect = document.getElementById('domainSelect');
    const selectedDomain = domainSelect.value;
    
    if (!selectedDomain) {
        alert('Please select a domain for assessment');
        return;
    }
    
    // Store the selected domain in sessionStorage
    sessionStorage.setItem('selectedDomain', selectedDomain);
    
    // Redirect to the speech-to-text page
    window.location.href = '/';
}

async function fetchPreviousResults() {
    try {
        const response = await fetch('/get_previous_results');
        const data = await response.json();
        
        if (data.status === 'success') {
            displayResults(data.results);
        }
    } catch (error) {
        console.error('Error fetching results:', error);
    }
}

function displayResults(results) {
    const accordion = document.getElementById('accordionExample');
    
    if (!results || results.length === 0) {
        accordion.innerHTML = `
            <div class="text-center p-4">
                <h4>No interview results available</h4>
                <p>Start a new interview to see your results here.</p>
            </div>
        `;
        return;
    }

    results.forEach((result, index) => {
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        
        const timestamp = new Date(result.timestamp).toLocaleString();
        
        accordionItem.innerHTML = `
            <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                        data-bs-target="#collapse${index}">
                    ${result.domain} Interview - ${timestamp}
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                <div class="accordion-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h5>Emotional Analysis</h5>
                            <canvas id="emotionChart${index}"></canvas>
                        </div>
                        <div class="col-md-6">
                            <h5>Question Scores</h5>
                            <canvas id="scoreChart${index}"></canvas>
                        </div>
                    </div>
                    <div class="mt-4">
                        <h5>Responses</h5>
                        ${result.responses.map((response, i) => `
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h6>Question ${i + 1}: ${result.question_analysis.questions[i]}</h6>
                                    <p><strong>Response:</strong> ${response.text}</p>
                                    <p><strong>Strengths:</strong> ${response.analysis.strengths.join(', ')}</p>
                                    <p><strong>Areas for Improvement:</strong> ${response.analysis.improvements.join(', ')}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        accordion.appendChild(accordionItem);
        
        // Create charts after the elements are added to the DOM
        createCharts(result, index);
    });
}

function createCharts(result, index) {
    // Emotion Chart
    const emotionCtx = document.getElementById(`emotionChart${index}`).getContext('2d');
    new Chart(emotionCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(result.emotion_analysis.emotion_percentages),
            datasets: [{
                data: Object.values(result.emotion_analysis.emotion_percentages),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Score Chart
    const scoreCtx = document.getElementById(`scoreChart${index}`).getContext('2d');
    new Chart(scoreCtx, {
        type: 'line',
        data: {
            labels: result.question_analysis.questions.map((_, i) => `Q${i + 1}`),
            datasets: [{
                label: 'Technical Score',
                data: result.question_analysis.scores,
                borderColor: '#6C63FF',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 3,
                    ticks: {
                        stepSize: 0.5
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}
