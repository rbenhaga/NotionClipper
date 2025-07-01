"""Application principale Notion Clipper Pro."""
from flask import Flask
from flask_cors import CORS
from .routes import api
from .config import SecureConfig

def create_app():
    """Factory pattern pour créer l'app Flask."""
    app = Flask(__name__)
    CORS(app)
    # Enregistrer les blueprints
    app.register_blueprint(api, url_prefix='/api')
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='127.0.0.1', port=5000, debug=False) 