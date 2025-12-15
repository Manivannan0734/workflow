from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.auth.routes import auth_bp
from app.users.routes import users_bp
from app.groups.routes import groups_bp
from app.templates.routes import templates_bp
from app.tasks.routes import tasks_bp
from app.ollama.routes import ollama_bp
from flask_cors import CORS
def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config.from_object(Config)
    CORS(app, supports_credentials=True, origins="*")

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(groups_bp, url_prefix="/api/groups")
    app.register_blueprint(templates_bp, url_prefix="/api/templates")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(ollama_bp, url_prefix="/api/ollama")
    
    return app
