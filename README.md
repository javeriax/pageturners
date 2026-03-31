
Welcome to the Page Turners development repository. This project is a full-stack web application built with React (Vite), Flask, and MongoDB Atlas.

You can use these chat links which have context of the setup for help:
https://gemini.google.com/share/3c31f581825f (GEMINI KNOWS THE FOLDER STRUCTURE)
https://claude.ai/share/05aff5fb-8467-48d3-b957-31f002c6ee21 (SEND A SCREENSHOT TO CLAUDE OF THE FOLDER STRUCTURE FIRST)

**Prerequisites**

Before starting, ensure you have the following installed:

    Python 3.12+ (For the backend)

    Node.js & npm (For the frontend)

    Git (For version control)

 **Initial Git Configuration**

To ensure your work is correctly attributed to you on GitHub, run these commands in your terminal:
Bash

git config --global user.name "Your Full Name"
git config --global user.email "your-github-email@example.com"

    Note on Email: You must use the email address associated with your GitHub account. This ensures that when you push code, GitHub recognizes it was you and displays your profile picture next to the commit.

**Project Structure**
Backend (/pageturners-backend)

    app.py: The main entry point that starts the Flask server and connects to MongoDB.

    routes/: Contains the API logic for all features:

    auth.py: Registration, Login, and Email Verification.

books.py: Search and Discovery features.

library.py: Personal library and progress tracking.

reviews.py: User ratings and reviews.

    .env: (DO NOT SHARE ON GIT) Contains our private MongoDB URI and JWT Secret Key.

    venv/: The local virtual environment for Python dependencies.

Frontend (/pageturners-frontend)

    src/pages/: Full screens like Login.jsx, Register.jsx, and Dashboard.jsx.

src/components/: Reusable parts like the Navbar and BookCard.

    src/api/: Functions that fetch data from our Flask backend.

    node_modules/: Libraries managed by npm.


**Local Setup Steps**

1. Clone the Project
Bash

git clone https://github.com/YOUR_USERNAME/pageturners.git
cd pageturners

2. Backend Setup
Bash

cd pageturners-backend
python -m venv venv

# Activation (Windows): venv\Scripts\activate
# Activation (Mac/Linux): source venv/bin/activate

# Install all Python dependencies from requirements.txt
pip install -r requirements.txt

Create a .env file here and paste the credentials shared by Javeria.
(Note: requirements.txt contains all necessary packages - Flask, pymongo, bcrypt, etc.)

3. Frontend Setup
Bash

cd ../pageturners-frontend
npm install 

Might need:

npm install react-router-dom

If peer dependency error:
npm install react-router-dom --legacy-peer-deps

👨‍💻 Workflow & Branching

Never commit directly to main. Always work on your own branch:

    Pull latest changes: git pull origin main

    Create your branch: git checkout -b feature-yourname-task

    Work and Commit: git add . then git commit -m "brief description of work"

    Push your branch: git push origin feature-yourname-task

**How to Pull Updates Without Errors**

When pulling latest code from main, follow these steps to avoid conflicts:

Bash

# 1. Make sure you're on main branch
git checkout main

# 2. Fetch latest updates
git fetch origin

# 3. Pull updates (does fetch + merge)
git pull origin main

# 4. If you have local changes, stash them first
git stash

# 5. Then pull
git pull origin main

# 6. Restore your changes (optional)
git stash pop

# 7. Re-install dependencies (important!)
# Backend
cd pageturners-backend
pip install -r requirements.txt

# Frontend  
cd ../pageturners-frontend
npm install

**Common Pull Errors & Solutions**

| Error | Solution |
|-------|----------|
| "Your local changes would be overwritten" | Run `git stash` before pulling |
| "Merge conflict" | Edit conflicted files, then `git add .` and `git commit -m "resolve conflicts"` |
| "Module not found" | Run `npm install` (frontend) or `pip install -r requirements.txt` (backend) |
| "JSON parsing error" | Delete `node_modules` and `package-lock.json`, then run `npm install` again |

How to Run the Application

Open two separate terminals:

    Terminal 1 (Backend): cd pageturners-backend -> Activate venv -> python app.py

    Terminal 2 (Frontend): cd pageturners-frontend -> npm run dev