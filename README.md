# PageTurners – Full-Stack Setup Guide

This documentation explains how to set up, run, and understand the structure of the PageTurners web application built with React (Vite), Flask, and MongoDB Atlas.

---

## Tech Stack

* Python 3.12+ (Backend – Flask)
* Node.js & npm (Frontend – React with Vite)
* MongoDB Atlas (Database)
* Git (Version Control)

---

## Prerequisites

Make sure you have the following installed:

* Python 3.12+
* Node.js & npm
* Git

---

## Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/pageturners.git
cd pageturners
```

---

## Backend Setup

```bash
cd pageturners-backend
python -m venv venv
```

### Activate Virtual Environment

* **Windows**

```bash
venv\Scripts\activate
```

* **Linux/macOS**

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Environment Configuration

Create a `.env` file in this folder and add:

```env
# Database Access
MONGO_URI=mongodb+srv://jn09271:javeria123@cluster0.5aaiwob.mongodb.net/pageturners?appName=Cluster0
JWT_SECRET_KEY=pageturners_secret_key_123

# Email Configuration (For Reset Password/Welcome emails)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL= <your gmail>
SENDER_PASSWORD= <16 letters app password>
```

---

### Run Backend (All Environments)

```bash
chmod +x dev.sh
./dev.sh
```

---

## Frontend Setup

```bash
cd ../pageturners-frontend
npm install
```

If needed:

```bash
npm install react-router-dom
```

If you get peer dependency errors:

```bash
npm install react-router-dom --legacy-peer-deps
```

---

### Run Frontend

```bash
npm run dev
```

---

## Running the Application

Use two terminals:

**Terminal 1 (Backend)**

```bash
cd pageturners-backend
./dev.sh
```

**Terminal 2 (Frontend)**

```bash
cd pageturners-frontend
npm run dev
```

