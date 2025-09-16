from flask import Flask
from backend.utils.db import init_app, db
from backend.models.models import User, Quiz, Leaderboard

def create_app():
    app = Flask(__name__)
    init_app(app)

    with app.app_context():
        db.create_all()  # create tables in DB

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
