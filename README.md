# Interview Analysis System

A comprehensive interview preparation and analysis system that combines speech recognition, emotion analysis, and AI-powered response evaluation to help candidates practice and improve their interview skills.

## Features

### 1. Domain-Specific Interviews
- Support for multiple technical domains:
  - Software Development
  - Data Science
  - Artificial Intelligence
  - Web Development
  - Mobile Development
- Curated questions for each domain
- Real-time speech-to-text conversion
- 30-second response timer

### 2. Real-time Analysis
- Emotion detection through video analysis
- Response quality assessment using Gemini AI
- Technical accuracy scoring
- Communication clarity evaluation
- Strengths and improvements identification

### 3. Dashboard
- Previous interview results visualization
- Performance metrics and charts
- Question-wise scoring
- Emotional analysis trends

## Technology Stack

### Backend
- Python 3.8+
- Flask (Web Framework)
- OpenCV (Video Processing)
- TensorFlow (Emotion Detection)
- Google Gemini AI (Response Analysis)
- SpeechRecognition (Speech-to-Text)

### Frontend
- HTML5/CSS3/JavaScript
- Bootstrap (UI Framework)
- Chart.js (Data Visualization)
- WebRTC (Camera Access)
- Web Speech API (Speech Recognition)

## Prerequisites

1. Python 3.8 or higher
2. Pip package manager
3. Node.js and npm (for frontend dependencies)
4. Webcam access
5. Microphone access
6. Google Gemini API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd interview-analysis-system
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
GEMINI_API_KEY=your_api_key_here
```

4. Initialize the application:
```bash
cd interview_materials/CV\ IP1/
python app.py
```

## Usage

1. **Starting the Application**
   - Run the Flask server: `python app.py`
   - Access the dashboard at: `http://localhost:8000/dashboard`

2. **Conducting an Interview**
   - Select your domain of interest
   - Click "Start Assessment"
   - Grant camera and microphone permissions
   - Answer questions within the 30-second time limit
   - View real-time emotion analysis and transcription

3. **Viewing Results**
   - Access previous interview results from the dashboard
   - Review performance metrics and charts
   - Analyze strengths and areas for improvement
   - Track progress over time

## Project Structure

```
interview-analysis-system/
├── frontend/
│   ├── public/
│   │   ├── javascripts/
│   │   │   └── dashboard.js
│   │   └── stylesheets/
│   └── views/
│       ├── dashboard.ejs
│       └── herhere.html
├── interview_materials/
│   └── CV IP1/
│       ├── app.py
│       ├── templates/
│       │   └── herhere.html
│       └── emotion_model.h5
├── requirements.txt
└── README.md
```

## API Endpoints

### Interview Management
- `POST /start_analysis`: Initialize interview session
- `POST /next_question`: Get next question
- `POST /stop_analysis`: End interview and save results

### Results and Analysis
- `GET /get_previous_results`: Fetch interview history
- `GET /video_feed`: Stream video analysis
- `GET /analysis_status`: Get current emotion analysis

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini AI for response analysis
- TensorFlow for emotion detection model
- Flask team for the web framework
- Bootstrap team for UI components
- Chart.js for visualization tools

## Support

For support, please open an issue in the repository or contact the development team. 