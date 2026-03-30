from flask import Blueprint

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    return {"message": "Register endpoint coming soon!"}, 200