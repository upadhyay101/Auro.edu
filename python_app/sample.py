import requests
import os
import json
import logging
from datetime import datetime
import time
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_watson import ToneAnalyzerV3

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
CONFIG = {
    'api_url': 'http://127.0.0.1:5001/update_json',
    'input_file': 'answers.json',
    'output_file': 'data.json',
    'output_dir': os.path.join('public', 'javascripts'),
    'max_retries': 3,
    'retry_delay': 2,  # seconds
    'timeout': 10  # seconds
}

def setup_paths():
    """Setup and validate all required paths"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    
    paths = {
        'input': os.path.join(current_dir, CONFIG['input_file']),
        'output_dir': os.path.join(project_root, CONFIG['output_dir']),
        'output': os.path.join(project_root, CONFIG['output_dir'], CONFIG['output_file'])
    }
    
    # Create output directory if it doesn't exist
    os.makedirs(paths['output_dir'], exist_ok=True)
    
    return paths

def read_json_file(file_path):
    """Read and parse JSON file with error handling"""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except json.JSONDecodeError as e:
        logging.error(f"Invalid JSON format in {file_path}: {e}")
        raise
    except Exception as e:
        logging.error(f"Error reading {file_path}: {e}")
        raise

def write_json_file(file_path, data):
    """Write data to JSON file with error handling"""
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=4)
        logging.info(f"Successfully wrote data to {file_path}")
    except Exception as e:
        logging.error(f"Error writing to {file_path}: {e}")
        raise

def create_session():
    """Create a requests session with retry strategy"""
    session = requests.Session()
    retry_strategy = Retry(
        total=CONFIG['max_retries'],
        backoff_factor=0.5,
        status_forcelist=[500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def wait_for_server(session):
    """Wait for the Flask server to become available"""
    for i in range(CONFIG['max_retries']):
        try:
            response = session.get('http://127.0.0.1:5001/health', timeout=CONFIG['timeout'])
            if response.status_code == 200:
                logger.info("Server is ready")
                return True
        except requests.exceptions.RequestException:
            logger.warning(f"Server not ready, attempt {i+1}/{CONFIG['max_retries']}")
            time.sleep(CONFIG['retry_delay'])
    return False

def process_data(existing_data, new_data):
    """Process and combine existing and new data"""
    # Ensure data is in list format
    if not isinstance(existing_data, list):
        existing_data = [existing_data]
    if not isinstance(new_data, list):
        new_data = [new_data]
    
    # Combine data
    return [existing_data, new_data]

def main():
    try:
        # Setup paths
        paths = setup_paths()
        logging.info("Starting data processing...")
        
        # Create session with retry strategy
        session = create_session()

        # Wait for server to be ready
        if not wait_for_server(session):
            logger.error("Server is not available. Please make sure chatbot_gemini.py is running.")
            return

        # Read input data
        input_data = read_json_file(paths['input'])
        logging.info(f"Successfully read input data from {paths['input']}")
        
        # Send data to API
        logger.info("Sending request to server...")
        response = session.post(
            CONFIG['api_url'],
            json=input_data,
            timeout=CONFIG['timeout']
        )
        response.raise_for_status()

        # Process the response
        if response.status_code == 200:
            logger.info("Successfully received response from server")
            new_data = response.json() if response.text else {}

            # Process and combine data
            final_data = process_data(input_data, new_data)
            
            # Write output
            write_json_file(paths['output'], final_data)
            logging.info("Data processing completed successfully")
        else:
            logger.error(f"Server returned status code: {response.status_code}")

    except requests.exceptions.ConnectionError:
        logger.error("Could not connect to the server. Please make sure chatbot_gemini.py is running on port 5001.")
    except requests.exceptions.Timeout:
        logger.error("Request timed out. The server took too long to respond.")
    except requests.exceptions.RequestException as e:
        logger.error(f"An error occurred while making the request: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON: {str(e)}")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    main()
