from flask import Flask, render_template, Response, jsonify, request, send_file, session, redirect
from flask_cors import CORS
import json
import os
import time
from datetime import datetime, timedelta
import speech_recognition as sr
import uuid
from dotenv import load_dotenv
import google.generativeai as genai
import random
import logging
import cv2
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

# Initialize CV model
try:
    emotion_model = load_model('emotion_model.h5')
    logger.info("Emotion model loaded successfully")
except Exception as e:
    logger.error(f"Error loading emotion model: {str(e)}")
    emotion_model = None

# Initialize video capture
video_capture = None

def get_frame():
    global video_capture
    if video_capture is None:
        video_capture = cv2.VideoCapture(0)
    
    success, frame = video_capture.read()
    if not success:
        return None
    
    # Process frame with emotion detection
    if emotion_model is not None:
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # Resize to model input size
            face = cv2.resize(gray, (48, 48))
            face = face.astype("float") / 255.0
            face = img_to_array(face)
            face = np.expand_dims(face, axis=0)
            
            # Predict emotion
            preds = emotion_model.predict(face)[0]
            emotion = np.argmax(preds)
            emotions = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]
            
            # Add emotion text to frame
            cv2.putText(frame, f"Emotion: {emotions[emotion]}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}")
    
    # Convert frame to JPEG
    ret, buffer = cv2.imencode('.jpg', frame)
    frame = buffer.tobytes()
    return frame

def generate_frames():
    while True:
        frame = get_frame()
        if frame is None:
            break
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

app = Flask(__name__)
CORS(app)
app.secret_key = 'your-secret-key-here'  # Change this to a secure secret key
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Global variables
recording = False
recognizer = sr.Recognizer()
current_results = {}

# Domain-specific questions
QUESTIONS = {
    "software": [
        "Explain object-oriented programming principles.",
        "How do you handle version control in your projects?",
        "Describe your experience with testing methodologies.",
        "What design patterns have you implemented?",
        "How do you approach code review?"
    ],
    "data": [
        "Explain the difference between supervised and unsupervised learning.",
        "How do you handle missing data in your analysis?",
        "Describe your experience with big data technologies.",
        "What's your approach to feature engineering?",
        "How do you validate your models?"
    ],
    "ai": [
        "Explain the concept of neural networks.",
        "How do you handle model overfitting?",
        "Describe your experience with deep learning frameworks.",
        "What's your approach to hyperparameter tuning?",
        "How do you handle imbalanced datasets?"
    ],
    "web": [
        "Explain RESTful architecture.",
        "How do you optimize website performance?",
        "Describe your experience with frontend frameworks.",
        "How do you handle security in web applications?",
        "What's your approach to responsive design?"
    ],
    "mobile": [
        "Compare native vs hybrid development.",
        "How do you handle offline functionality?",
        "Describe your experience with mobile UI/UX.",
        "How do you optimize app performance?",
        "What's your approach to mobile testing?"
    ]
}

# Ensure answers.json exists
ANSWERS_FILE = 'answers.json'
if not os.path.exists(ANSWERS_FILE):
    with open(ANSWERS_FILE, 'w') as f:
        json.dump({"interviews": [], "last_updated": None}, f)

def load_answers():
    try:
        with open(ANSWERS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"interviews": [], "last_updated": None}
    except json.JSONDecodeError:
        return {"interviews": [], "last_updated": None}

def save_answers(data):
    try:
        with open(ANSWERS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving answers: {str(e)}")
        return False
    return True

def analyze_response(text, domain, question):
    """Analyze the interview response using Gemini API."""
    try:
        prompt = f"""
        Analyze the following interview response for a {domain} position:
        Question: {question}
        Response: "{text}"
        
        Provide a structured analysis including:
        1. Technical accuracy score (0-3)
        2. Communication clarity score (0-3)
        3. Key strengths (list 2-3 points)
        4. Areas for improvement (list 2-3 points)
        5. Overall assessment (2-3 sentences)
        6. Emotional tone analysis (provide percentages for: Confident, Neutral, Nervous - total should be 100%)
        
        Format the response as JSON with the following structure:
        {{
            "technical_score": float,
            "clarity_score": float,
            "strengths": list,
            "improvements": list,
            "assessment": string,
            "emotion_percentages": {{
                "Confident": float,
                "Neutral": float,
                "Nervous": float
            }}
        }}
        """
        
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in analyze_response: {str(e)}")
        return {
            "technical_score": 1.5,
            "clarity_score": 1.5,
            "strengths": ["Unable to analyze strengths"],
            "improvements": ["Unable to analyze improvements"],
            "assessment": "Analysis failed",
            "emotion_percentages": {
                "Confident": 33.33,
                "Neutral": 33.33,
                "Nervous": 33.34
            }
        }

def save_results(results):
    """Save interview results to a JSON file."""
    try:
        filename = "previous_results.json"
        existing_results = []
        
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                existing_results = json.load(f)
        
        existing_results.append(results)
        
        with open(filename, 'w') as f:
            json.dump(existing_results, f)
            
        print(f"Results saved successfully: {results['id']}")
        return True
    except Exception as e:
        print(f"Error saving results: {str(e)}")
        return False

def load_results():
    """Load previous interview results."""
    try:
        filename = "previous_results.json"
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading results: {str(e)}")
        return []

@app.route('/')
def index():
    try:
        logger.info("Rendering speech-to-text page")
        return render_template('herhere.html')
    except Exception as e:
        logger.error(f"Error rendering speech-to-text page: {str(e)}")
        return str(e), 500

@app.route('/dashboard')
def dashboard():
    try:
        if not session.get('user_id'):
            return redirect('/login')
            
        logger.info("Rendering dashboard page")
        return render_template('dashboard.html')
    except Exception as e:
        logger.error(f"Error rendering dashboard: {str(e)}")
        return str(e), 500

@app.route('/create_session', methods=['POST'])
def create_session():
    """Create a new WebRTC session"""
    session_id = str(uuid.uuid4())
    current_results[session_id] = {
        'status': 'created',
        'offer': None,
        'answer': None,
        'ice_candidates': [],
        'responses': []
    }
    return jsonify({'session_id': session_id})

@app.route('/offer/<session_id>', methods=['POST'])
def handle_offer(session_id):
    """Handle WebRTC offer"""
    if session_id not in current_results:
        return jsonify({'error': 'Session not found'}), 404
    
    offer = request.json
    current_results[session_id]['offer'] = offer
    return jsonify({'status': 'offer received'})

@app.route('/answer/<session_id>', methods=['POST'])
def handle_answer(session_id):
    """Handle WebRTC answer"""
    if session_id not in current_results:
        return jsonify({'error': 'Session not found'}), 404
    
    answer = request.json
    current_results[session_id]['answer'] = answer
    return jsonify({'status': 'answer received'})

@app.route('/ice/<session_id>', methods=['POST'])
def handle_ice(session_id):
    """Handle ICE candidates"""
    if session_id not in current_results:
        return jsonify({'error': 'Session not found'}), 404
    
    candidate = request.json
    current_results[session_id]['ice_candidates'].append(candidate)
    return jsonify({'status': 'candidate received'})

@app.route('/next_question', methods=['POST'])
def next_question():
    try:
        data = request.get_json()
        domain = data.get('domain')
        
        if not domain or domain not in QUESTIONS:
            return jsonify({'error': 'Invalid domain'}), 400
            
        # Get a random question from the domain
        question = random.choice(QUESTIONS[domain])
        
        return jsonify({
            'question': question,
            'domain': domain
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/start_analysis', methods=['POST'])
def start_analysis():
    """Start recording and analysis."""
    global recording, current_results
    
    try:
        domain = request.json.get('domain', 'software')
        recording = True
        current_results = {
            'id': str(uuid.uuid4()),
            'domain': domain,
            'timestamp': str(datetime.now()),
            'responses': [],
            'emotion_analysis': {
                'emotion_percentages': {
                    'Confident': 0,
                    'Neutral': 0,
                    'Nervous': 0
                }
            },
            'question_analysis': {
                'scores': [],
                'questions': []
            }
        }
        return jsonify({'status': 'success', 'message': 'Analysis started'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/stop_analysis', methods=['POST'])
def stop_analysis():
    """Stop recording and process the interview."""
    global recording, current_results
    
    try:
        recording = False
        
        # Get the audio data and question from the request
        audio_data = request.files.get('audio')
        question = request.form.get('question', '')
        
        if not audio_data:
            return jsonify({'error': 'No audio data received'}), 400
            
        # Save temporarily
        audio_data.save('temp_audio.wav')
        
        # Convert speech to text
        with sr.AudioFile('temp_audio.wav') as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)
            
            # Analyze the response
            analysis = analyze_response(text, current_results['domain'], question)
            
            # Update results
            current_results['responses'].append({
                'text': text,
                'analysis': analysis
            })
            
            # Update emotion percentages (average of all responses)
            emotions = current_results['emotion_analysis']['emotion_percentages']
            new_emotions = analysis['emotion_percentages']
            for emotion in emotions:
                total = sum(r['analysis']['emotion_percentages'][emotion] for r in current_results['responses'])
                emotions[emotion] = total / len(current_results['responses'])
            
            # Update question scores
            current_results['question_analysis']['scores'].append(analysis['technical_score'])
            current_results['question_analysis']['questions'].append(question)
            
            # Save results
            save_results(current_results)
            
            return jsonify({
                'status': 'success',
                'results': current_results
            })
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/get_previous_results', methods=['GET'])
def get_previous_results():
    try:
        logger.info("Fetching previous results")
        data = load_answers()
        results = data.get("interviews", [])
        logger.info(f"Found {len(results)} previous results")
        
        # Format results to match frontend expectations
        formatted_results = []
        for result in results:
            formatted_result = {
                'timestamp': result.get('timestamp', ''),
                'domain': result.get('domain', 'Unknown'),
                'overall_score': result.get('overall_score', 0),
                'question_scores': result.get('question_scores', []),
                'transcript': result.get('transcript', ''),
                'analysis': result.get('analysis', '')
            }
            formatted_results.append(formatted_result)
        
        return jsonify({
            "status": "success",
            "results": formatted_results
        })
    except Exception as e:
        logger.error(f"Error fetching previous results: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/get_feedback_audio')
def get_feedback_audio():
    """Stream the feedback audio"""
    try:
        return send_file(
            'temp_feedback.mp3',
            mimetype='audio/mpeg'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/interview', methods=['POST'])
def start_interview():
    try:
        data = request.json
        domain = data.get('domain')
        
        if not domain:
            return jsonify({"error": "Domain is required"}), 400
            
        # Generate questions based on domain
        prompt = f"Generate 5 technical interview questions for {domain} domain."
        try:
            response = model.generate_content(prompt)
            questions = response.text.split('\n')
            questions = [q.strip() for q in questions if q.strip()]
        except Exception as e:
            return jsonify({
                "error": "Failed to generate questions",
                "details": str(e)
            }), 500
            
        return jsonify({
            "status": "success",
            "questions": questions
        })
    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route('/api/results', methods=['GET', 'POST'])
def handle_results():
    if request.method == 'GET':
        try:
            data = load_answers()
            return jsonify({
                "status": "success",
                "results": data.get("interviews", [])
            })
        except Exception as e:
            return jsonify({
                "error": "Failed to load results",
                "details": str(e)
            }), 500
            
    elif request.method == 'POST':
        try:
            data = request.json
            current_data = load_answers()
            
            # Add timestamp
            data['timestamp'] = datetime.now().isoformat()
            
            # Add to interviews list
            current_data['interviews'].append(data)
            current_data['last_updated'] = datetime.now().isoformat()
            
            if save_answers(current_data):
                return jsonify({"status": "success"})
            else:
                return jsonify({
                    "error": "Failed to save results"
                }), 500
        except Exception as e:
            return jsonify({
                "error": "Failed to save results",
                "details": str(e)
            }), 500

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/herhere')
def herhere():
    try:
        logger.info("Rendering herhere page")
        return render_template('herhere.html')
    except Exception as e:
        logger.error(f"Error rendering herhere: {str(e)}")
        return str(e), 500

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        app.run(host='0.0.0.0', port=8000, debug=True)
    except Exception as e:
        logger.error(f"Error starting application: {str(e)}")
        raise 