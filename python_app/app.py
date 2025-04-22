import json
import google.generativeai as genai

# Configure the API key
genai.configure(api_key="AIzaSyAVVHuSg4HUzt3WRMve9YApI2uOYANH1rk")

# Load the questions from questions.json
with open('answers.json') as f:
    d = json.load(f)

# Define the model generation configuration
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

# Create the GenerativeModel instance
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
)

# Generate new questions using the AI model
chat_session = model.start_chat(history=[])
response = chat_session.send_message("""
    Given a JSON object with two keys, "question" and "answer", analyze the answer content based on the question. Assign a score out of 5, with 5 being the highest for a perfect answer that includes functionality and correct formatting. Here's the breakdown of the scoring criteria:

    * **Score 5:** The answer perfectly matches the expected code snippet for the question and has no formatting errors (e.g., typos, extra characters).
    * **Score 3:** The answer is partially correct with typos or extra characters but still achieves the desired functionality based on the question.
    * **Score 0:** The answer is completely irrelevant and doesn't contain the essential elements to fulfill the requirement of the question.
    NOTE: Return only the json file and nothing else, and dont format it. 
    NOTE: Be little linent , deduct the score only when answer is either out of context or completely wrong
""" + json.dumps(d))

# Extract the JSON text from the response
questions_text = response.text

# Save the response to report.json
with open('report.json', 'w') as report_file:
    report_file.write(questions_text)

print("Report has been saved to report.json")
