document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const accordion = document.getElementById('accordionExample');
    const errorMessage = document.getElementById('error-container');
    const loadingIndicator = document.getElementById('loading');
    const startButton = document.getElementById('start-btn');
    
    // Fetch previous results
    async function fetchPreviousResults() {
        try {
            loadingIndicator.style.display = 'block';
            errorMessage.style.display = 'none';
            
            const response = await fetch('/get_previous_results');
            const data = await response.json();
            
            if (data.status !== 'success') {
                throw new Error(data.message || 'Failed to fetch results');
            }
            
            displayResults(data.results);
        } catch (error) {
            console.error('Error fetching results:', error);
            errorMessage.textContent = 'Failed to load previous results. Please try again later.';
            errorMessage.style.display = 'block';
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }
    
    // Display results in accordion
    function displayResults(results) {
        accordion.innerHTML = '';
        
        if (!results || results.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'alert alert-info';
            noResults.textContent = 'No previous interview results found.';
            accordion.appendChild(noResults);
            return;
        }
        
        results.forEach((result, index) => {
            const card = document.createElement('div');
            card.className = 'accordion-item';
            
            const header = document.createElement('h2');
            header.className = 'accordion-header';
            
            const button = document.createElement('button');
            button.className = 'accordion-button collapsed';
            button.type = 'button';
            button.setAttribute('data-bs-toggle', 'collapse');
            button.setAttribute('data-bs-target', `#collapse${index}`);
            button.textContent = `Interview ${index + 1} - ${new Date(result.timestamp).toLocaleString()}`;
            
            const collapse = document.createElement('div');
            collapse.id = `collapse${index}`;
            collapse.className = 'accordion-collapse collapse';
            collapse.setAttribute('data-bs-parent', '#accordionExample');
            
            const body = document.createElement('div');
            body.className = 'accordion-body';
            
            // Add result details
            body.innerHTML = `
                <div class="mb-3">
                    <h6>Domain: ${result.domain}</h6>
                    <h6>Overall Score: ${result.overall_score || 'N/A'}%</h6>
                </div>
                <div class="mb-3">
                    <h6>Question Analysis:</h6>
                    <ul class="list-group">
                        ${result.question_scores.map(q => `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                ${q.question}
                                <span class="badge bg-${getScoreColor(q.score)}">${q.score}%</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="mb-3">
                    <h6>Transcript:</h6>
                    <p>${result.transcript || 'No transcript available'}</p>
                </div>
                <div>
                    <h6>Analysis:</h6>
                    <p>${result.analysis || 'No analysis available'}</p>
                </div>
            `;
            
            header.appendChild(button);
            collapse.appendChild(body);
            card.appendChild(header);
            card.appendChild(collapse);
            accordion.appendChild(card);
        });
    }
    
    // Helper function to get score color
    function getScoreColor(score) {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'danger';
    }
    
    // Event listeners
    startButton.addEventListener('click', function() {
        window.location.href = '/interview';
    });
    
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Fetch results on page load
    fetchPreviousResults();
}); 