document.addEventListener('DOMContentLoaded', async function() {
    const videoPreview = document.getElementById('videoPreview');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const questionText = document.getElementById('questionText');
    const timer = document.getElementById('timer');
    
    let stream = null;
    let mediaRecorder = null;
    let chunks = [];
    let timeLeft = 30;
    let timerInterval = null;
    
    // Get the selected domain from sessionStorage
    const selectedDomain = sessionStorage.getItem('selectedDomain');
    if (!selectedDomain) {
        alert('No domain selected. Please go back to the dashboard and select a domain.');
        window.location.href = '/dashboard';
        return;
    }
    
    try {
        // Start camera automatically
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoPreview.srcObject = stream;
        
        // Initialize MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const formData = new FormData();
            formData.append('video', blob);
            formData.append('domain', selectedDomain);
            
            try {
                const response = await fetch('/analyze_response', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    // Handle successful analysis
                    console.log('Analysis complete:', data);
                } else {
                    alert('Error during analysis: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error sending video for analysis');
            }
        };
        
        // Fetch and display the first question
        await fetchQuestion();
        
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please ensure you have granted camera permissions.');
    }
    
    startBtn.addEventListener('click', () => {
        startRecording();
    });
    
    stopBtn.addEventListener('click', () => {
        stopRecording();
    });
    
    function startRecording() {
        chunks = [];
        mediaRecorder.start();
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        startTimer();
    }
    
    function stopRecording() {
        mediaRecorder.stop();
        stopBtn.style.display = 'none';
        startBtn.style.display = 'block';
        clearInterval(timerInterval);
        timeLeft = 30;
        timer.textContent = timeLeft;
    }
    
    function startTimer() {
        timerInterval = setInterval(() => {
            timeLeft--;
            timer.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                stopRecording();
                fetchQuestion();
            }
        }, 1000);
    }
    
    async function fetchQuestion() {
        try {
            const response = await fetch('/get_question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ domain: selectedDomain })
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                questionText.textContent = data.question;
            } else {
                alert('Error fetching question: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error fetching question');
        }
    }
}); 