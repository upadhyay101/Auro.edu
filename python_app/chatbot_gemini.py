import json
import os
from flask import Flask, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure Gemini API
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")

print(f"API Key loaded: {api_key[:5]}...{api_key[-5:]}")  # Print first and last 5 chars for verification

try:
    genai.configure(api_key=api_key)
    # Test the API connection
    model = genai.GenerativeModel('gemini-pro')
    test_response = model.generate_content("Hello")
    print("Gemini API connection successful!")
except Exception as e:
    print(f"Error connecting to Gemini API: {str(e)}")
    raise

app = Flask(__name__)

# Get the absolute path of the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
answers_file = os.path.join(current_dir, 'answers.json')

def ensure_answers_file():
    """Ensure answers.json exists with default structure"""
    if not os.path.exists(answers_file):
        default_data = {
            "questions": [],
            "answers": [],
            "timestamp": ""
        }
        with open(answers_file, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, indent=4)

@app.route('/update_json', methods=['POST'])
def update_json():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Generate response from Gemini
        question = json.dumps(data)
        try:
            response = model.generate_content(question)
            if not response or not response.text:
                return jsonify({'error': 'No response from Gemini API'}), 500
        except Exception as e:
            print(f"Gemini API Error: {str(e)}")
            return jsonify({'error': f'Gemini API Error: {str(e)}'}), 500
        
        # Save question and answer
        ensure_answers_file()
        try:
            with open(answers_file, 'r+', encoding='utf-8') as f:
                try:
                    file_data = json.load(f)
                except json.JSONDecodeError:
                    file_data = {"questions": [], "answers": [], "timestamp": ""}
                
                file_data['questions'].append(question)
                file_data['answers'].append(response.text)
                file_data['timestamp'] = datetime.now().isoformat()
                
                f.seek(0)
                json.dump(file_data, f, indent=4)
                f.truncate()
        except Exception as e:
            print(f"Error writing to answers.json: {str(e)}")
            return jsonify({'error': 'Error saving response'}), 500

        return response.text
    
    except Exception as e:
        print(f"Error in update_json: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'api_key_configured': bool(api_key),
        'gemini_connected': True
    }), 200

if __name__ == '__main__':
    try:
        ensure_answers_file()
        print("Starting Flask server...")
        app.run(host='127.0.0.1', port=5001, debug=True)
    except Exception as e:
        print(f"Failed to start server: {str(e)}")
