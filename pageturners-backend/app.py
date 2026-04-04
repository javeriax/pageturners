from flask import Flask
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

jwt = JWTManager(app)

client = MongoClient(os.getenv("MONGO_URI"))
db = client["pageturners"]

from routes.auth import auth_bp
# from routes.books import books_bp
# from routes.reviews import reviews_bp
# from routes.library import library_bp
# from routes.profile import profile_bp

app.register_blueprint(auth_bp)
# app.register_blueprint(books_bp)
# app.register_blueprint(reviews_bp)
# app.register_blueprint(library_bp)
# app.register_blueprint(profile_bp)


@app.route("/")
def home():
    return "Backend is running"

if __name__ == "__main__":
    app.run(debug=True, threaded=True)