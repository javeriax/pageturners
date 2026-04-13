from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

# Enable CORS for all routes
CORS(app, supports_credentials=True)

jwt = JWTManager(app)

# Initialize MongoDB client and database (done once at startup)
try:
    client = MongoClient(os.getenv("MONGO_URI"), serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client["pageturners"]  # ✅ client defined first
    app.db = db
    print("Connected to MongoDB")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    app.db = None
    
# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return {"status": "ok", "message": "Backend is running"}, 200

from routes.auth import auth_bp
from routes.books import books_bp
from routes.reviews import reviews_bp
from routes.library import library_bp
# from routes.profile import profile_bp

app.register_blueprint(auth_bp)
app.register_blueprint(books_bp)
app.register_blueprint(reviews_bp)
app.register_blueprint(library_bp)
# app.register_blueprint(profile_bp)

if __name__ == "__main__":
    app.run(debug=True, threaded=True, port=5001)